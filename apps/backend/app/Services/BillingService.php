<?php

namespace App\Services;

use App\Models\BillingInvoice;
use App\Models\BillingLedgerEntry;
use App\Models\BillingOrder;
use App\Models\Payment;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Models\UsagePackage;
use App\Models\UsagePackagePurchase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BillingService
{
    public const BILLING_ORDER_PREFIX = 'ORD';
    public const BILLING_INVOICE_PREFIX = 'BILL';

    public function __construct(
        protected NotificationService $notifications,
        protected AuditService $audit,
    ) {}

    public function taxRate(): float
    {
        return (float) SaasConfig::get('billing', 'tax_rate', 0);
    }

    public function computeTotals(float $amount): array
    {
        $taxRate = $this->taxRate();
        $tax = round($amount * $taxRate / 100, 2);

        return [
            'amount' => round($amount, 2),
            'tax_amount' => $tax,
            'total_amount' => round($amount + $tax, 2),
        ];
    }

    public function nextNumber(string $type): string
    {
        $prefix = strtoupper($type === 'order'
            ? SaasConfig::get('billing', 'order_prefix', self::BILLING_ORDER_PREFIX)
            : SaasConfig::get('billing', 'invoice_prefix', self::BILLING_INVOICE_PREFIX));

        do {
            $number = $prefix.'-'.now()->format('Y').'-'.strtoupper(Str::random(6));
        } while (BillingOrder::query()->where('order_number', $number)->exists()
            || BillingInvoice::query()->where('invoice_number', $number)->exists());

        return $number;
    }

    public function createOrder(Tenant $tenant, string $type, array $data): BillingOrder
    {
        $totals = $this->computeTotals((float) ($data['amount'] ?? 0));

        $order = BillingOrder::query()->create([
            'order_number' => $this->nextNumber('order'),
            'tenant_id' => $tenant->id,
            'order_type' => $type,
            'subscription_plan_id' => $data['subscription_plan_id'] ?? null,
            'usage_package_id' => $data['usage_package_id'] ?? null,
            'tenant_subscription_id' => $data['tenant_subscription_id'] ?? null,
            'description' => $data['description'] ?? null,
            'currency' => $data['currency'] ?? ($tenant->currency ?? 'PKR'),
            'amount' => $totals['amount'],
            'tax_amount' => $totals['tax_amount'],
            'total_amount' => $totals['total_amount'],
            'status' => $data['status'] ?? BillingOrder::STATUS_PENDING,
            'period_start' => $data['period_start'] ?? null,
            'period_end' => $data['period_end'] ?? null,
            'due_at' => $data['due_at'] ?? now(),
        ]);

        return $order;
    }

    /**
     * New subscription request (tenant switching plans). Existing subscriptions are
     * cancelled only once the new one is paid for.
     *
     * @return array{order:BillingOrder, subscription:TenantSubscription}
     */
    public function beginSubscription(Tenant $tenant, SubscriptionPlan $plan, string $interval = 'monthly', bool $autoRenew = true, bool $startTrial = false): array
    {
        return DB::transaction(function () use ($tenant, $plan, $interval, $autoRenew, $startTrial) {
            $start = now();
            $periodEnd = $interval === 'yearly' ? $start->copy()->addYear() : $start->copy()->addMonth();
            $price = $interval === 'yearly' && $plan->annual_price !== null ? (float) $plan->annual_price : (float) $plan->price;

            $subscription = TenantSubscription::query()->create([
                'tenant_id' => $tenant->id,
                'subscription_plan_id' => $plan->id,
                'status' => TenantSubscription::STATUS_PENDING,
                'billing_interval' => $interval,
                'price' => $price,
                'currency' => $tenant->currency ?? 'PKR',
                'invoice_limit' => $plan->invoice_limit,
                'overage_allowed' => $plan->overage_allowed,
                'overage_price' => $plan->overage_price,
                'grace_period_hours' => $plan->grace_period_hours,
                'auto_renew' => $autoRenew,
            ]);

            $order = $this->createOrder($tenant, BillingOrder::TYPE_SUBSCRIPTION, [
                'subscription_plan_id' => $plan->id,
                'tenant_subscription_id' => $subscription->id,
                'description' => "{$plan->name} subscription ({$interval})",
                'amount' => $price,
                'period_start' => $start,
                'period_end' => $periodEnd,
                'status' => BillingOrder::STATUS_PENDING,
            ]);

            return ['order' => $order, 'subscription' => $subscription];
        });
    }

    public function createPackageOrder(Tenant $tenant, UsagePackage $package): BillingOrder
    {
        return $this->createOrder($tenant, BillingOrder::TYPE_PACKAGE, [
            'usage_package_id' => $package->id,
            'description' => "{$package->name} — {$package->invoice_quantity} invoices",
            'amount' => (float) $package->price,
        ]);
    }

    public function createOverageOrder(Tenant $tenant): ?BillingOrder
    {
        $entries = BillingLedgerEntry::query()
            ->where('tenant_id', $tenant->id)
            ->where('entry_type', BillingLedgerEntry::ENTRY_OVERAGE_CHARGE)
            ->where('meta->state', 'unbilled')
            ->get();

        if ($entries->isEmpty()) {
            return null;
        }

        $total = round((float) $entries->sum('amount'), 2);

        $order = DB::transaction(function () use ($tenant, $entries, $total) {
            $order = $this->createOrder($tenant, BillingOrder::TYPE_OVERAGE, [
                'description' => 'Pay-as-you-go invoice usage ('.count($entries).' overage invoice(s))',
                'amount' => $total,
                'status' => BillingOrder::STATUS_PENDING,
            ]);

            foreach ($entries as $entry) {
                $entry->update(['meta' => array_merge((array) $entry->meta, [
                    'state' => 'billed',
                    'billing_order_id' => $order->id,
                ])]);
            }

            return $order;
        });

        return $order;
    }

    /**
     * A single order becomes fully paid. Runs inside a transaction, keeps an
     * immutable ledger trail and fulfils what was paid for.
     */
    public function markOrderPaid(BillingOrder $order, ?Payment $payment = null): BillingOrder
    {
        return DB::transaction(function () use ($order, $payment) {
            if ($order->status === BillingOrder::STATUS_PAID) {
                return $order;
            }

            $now = now();

            if ($payment && $payment->billing_order_id === null) {
                $payment->forceFill(['billing_order_id' => $order->id])->save();
            }

            $order->update([
                'status' => BillingOrder::STATUS_PAID,
                'paid_at' => $now,
                'due_at' => $order->due_at ?? $now,
            ]);

            $invoice = BillingInvoice::query()->create([
                'invoice_number' => $this->nextNumber('billing_invoice'),
                'tenant_id' => $order->tenant_id,
                'billing_order_id' => $order->id,
                'status' => BillingInvoice::STATUS_PAID,
                'currency' => $order->currency,
                'amount' => $order->amount,
                'tax_amount' => $order->tax_amount,
                'total_amount' => $order->total_amount,
                'issued_at' => $now,
                'due_at' => $order->due_at,
                'paid_at' => $now,
            ]);

            if ($payment) {
                $payment->forceFill(['billing_invoice_id' => $invoice->id])->save();
            }

            if ($order->total_amount > 0) {
                $entryType = match ($order->order_type) {
                    BillingOrder::TYPE_SUBSCRIPTION => BillingLedgerEntry::ENTRY_SUBSCRIPTION_CHARGE,
                    BillingOrder::TYPE_PACKAGE => BillingLedgerEntry::ENTRY_PACKAGE_PURCHASE,
                    default => BillingLedgerEntry::ENTRY_PAY_PER_INVOICE,
                };

                BillingLedgerEntry::query()->create([
                    'tenant_id' => $order->tenant_id,
                    'entry_type' => $entryType,
                    'reference_type' => 'billing_order',
                    'reference_id' => $order->id,
                    'quantity' => 1,
                    'unit_price' => $order->total_amount,
                    'amount' => $order->total_amount,
                    'currency' => $order->currency,
                    'description' => $order->description,
                ]);
            }

            if ($payment) {
                BillingLedgerEntry::query()->create([
                    'tenant_id' => $order->tenant_id,
                    'entry_type' => BillingLedgerEntry::ENTRY_PAYMENT,
                    'reference_type' => 'payment',
                    'reference_id' => $payment->id,
                    'quantity' => 1,
                    'unit_price' => $payment->amount,
                    'amount' => -1 * (float) $payment->amount,
                    'currency' => $order->currency,
                    'description' => "Payment received via {$order->description} ({$payment->gateway_code})",
                ]);
            }

            $this->fulfilOrder($order);

            $tenant = $order->tenant;

            $this->notifications->toTenant($tenant, 'payment_received',
                'Payment received',
                "We received your payment of {$order->currency} ".number_format((float) $order->total_amount, 2)." for {$order->description}. Reference: {$order->order_number}.",
                ['order' => $order->order_number, 'amount' => $order->total_amount]);

            $this->audit->record('billing.order.paid', 'billing_order', $order->id, [], $order->only(['status', 'paid_at']), $order->tenant_id);

            return $order->fresh();
        });
    }

    /**
     * Apply the product of a paid order (new subscription/package row, etc.).
     */
    protected function fulfilOrder(BillingOrder $order): void
    {
        $tenant = $order->tenant;

        if ($order->order_type === BillingOrder::TYPE_PACKAGE && $order->usage_package_id) {
            $package = $order->package;

            if (! $package) {
                return;
            }

            UsagePackagePurchase::query()->create([
                'tenant_id' => $tenant->id,
                'usage_package_id' => $package->id,
                'billing_order_id' => $order->id,
                'name' => $package->name,
                'purchased_invoices' => $package->invoice_quantity,
                'used_invoices' => 0,
                'reserved_invoices' => 0,
                'price_paid' => $order->total_amount,
                'currency' => $order->currency,
                'starts_at' => now(),
                'expires_at' => $package->validity_days > 0 ? now()->addDays($package->validity_days) : null,
                'status' => UsagePackagePurchase::STATUS_ACTIVE,
            ]);

            $settings = $tenant->settings ?? [];
            $settings['quota_alerts'] = [];
            $tenant->update(['settings' => $settings]);
        }

        if ($order->order_type === BillingOrder::TYPE_SUBSCRIPTION && $order->tenant_subscription_id) {
            $subscription = TenantSubscription::query()->find($order->tenant_subscription_id);

            if (! $subscription) {
                return;
            }

            if ($subscription->status === TenantSubscription::STATUS_PENDING) {
                $start = now();
                $interval = $subscription->billing_interval;
                $periodEnd = $interval === 'yearly' ? $start->copy()->addYear() : $start->copy()->addMonth();

                $subscription->update([
                    'status' => TenantSubscription::STATUS_ACTIVE,
                    'starts_at' => $start,
                    'current_period_start' => $start,
                    'current_period_end' => $periodEnd,
                    'next_billing_date' => $periodEnd->copy()->addDay(),
                ]);
            } elseif ($subscription->status === TenantSubscription::STATUS_GRACE_PERIOD) {
                // A renewal order that failed/pended during maintenance got paid
                // later (admin confirmation or manual checkout) — revive the plan
                // and roll the window forward out of grace.
                $this->applyRenewal($subscription);

                $subscription->update(['grace_ends_at' => null]);
            }

            if ($tenant->status === Tenant::STATUS_GRACE_PERIOD) {
                $tenant->update(['status' => Tenant::STATUS_ACTIVE]);
            }

            // Replace any other concurrent active plan for this tenant.
            TenantSubscription::query()
                ->where('tenant_id', $tenant->id)
                ->where('id', '!=', $subscription->id)
                ->whereIn('status', [TenantSubscription::STATUS_ACTIVE, TenantSubscription::STATUS_TRIAL, TenantSubscription::STATUS_GRACE_PERIOD])
                ->update([
                    'status' => TenantSubscription::STATUS_CANCELLED,
                    'cancelled_at' => now(),
                ]);

            // A brand new subscription row starts with a fresh usage window.
            $settings = $tenant->settings ?? [];
            $settings['quota_alerts'] = [];
            $tenant->update(['settings' => $settings]);
        }
    }

    /**
     * Create the recurring order for an existing subscription period (renewal).
     */
    public function createRenewalOrder(TenantSubscription $subscription): BillingOrder
    {
        return $this->createOrder($subscription->tenant, BillingOrder::TYPE_SUBSCRIPTION, [
            'subscription_plan_id' => $subscription->subscription_plan_id,
            'tenant_subscription_id' => $subscription->id,
            'description' => "{$subscription->plan?->name} subscription renewal ({$subscription->billing_interval})",
            'amount' => (float) $subscription->price,
            'period_start' => $subscription->current_period_end,
            'period_end' => $subscription->billing_interval === 'yearly'
                ? $subscription->current_period_end->copy()->addYear()
                : $subscription->current_period_end->copy()->addMonth(),
            'status' => BillingOrder::STATUS_PENDING,
        ]);
    }

    /**
     * Called after a subscription renewal order is paid: roll the period forward
     * and reset the usage window. New subscriptions created through beginSubscription
     * are not touched here (they were created with their own window already).
     */
    public function applyRenewal(TenantSubscription $subscription): void
    {
        $interval = $subscription->billing_interval;
        $now = now();

        $subscription->update([
            'status' => TenantSubscription::STATUS_ACTIVE,
            'current_period_start' => $now,
            'current_period_end' => $interval === 'yearly' ? $now->copy()->addYear() : $now->copy()->addMonth(),
            'next_billing_date' => $interval === 'yearly' ? $now->copy()->addYear()->addDay() : $now->copy()->addMonth()->addDay(),
            'used_invoices' => 0,
            'reserved_invoices' => 0,
        ]);
    }

    /**
     * Outstanding money a tenant owes: unpaid billing invoices + unbilled overage.
     */
    public function outstandingBalance(Tenant $tenant): float
    {
        $invoices = (float) BillingInvoice::query()
            ->where('tenant_id', $tenant->id)
            ->where('status', BillingInvoice::STATUS_UNPAID)
            ->sum('total_amount');

        $overage = (float) BillingLedgerEntry::query()
            ->where('tenant_id', $tenant->id)
            ->where('entry_type', BillingLedgerEntry::ENTRY_OVERAGE_CHARGE)
            ->where('meta->state', 'unbilled')
            ->sum('amount');

        return round($invoices + $overage, 2);
    }

    /**
     * Reversal-first accounting: money is never deleted. When a paid order is
     * refunded we reverse the original ledger rows and mark the invoice/payment.
     */
    public function refundOrder(BillingOrder $order, float $amount, string $reason): BillingOrder
    {
        return DB::transaction(function () use ($order, $amount, $reason) {
            $amount = round(min($amount, (float) $order->total_amount), 2);

            if ($order->status === BillingOrder::STATUS_REFUNDED || $order->status === BillingOrder::STATUS_CANCELLED) {
                throw new \RuntimeException("Order {$order->order_number} cannot be refunded from its current status.");
            }

            $isFull = $amount >= (float) $order->total_amount;

            $originalLedger = BillingLedgerEntry::query()
                ->where('reference_type', 'billing_order')
                ->where('reference_id', $order->id)
                ->where('amount', '>', 0)
                ->orderBy('id')
                ->get();

            foreach ($originalLedger as $entry) {
                $entry->update(['meta' => array_merge((array) $entry->meta, [
                    'state' => 'reversed',
                ])]);
            }

            BillingLedgerEntry::query()->create([
                'tenant_id' => $order->tenant_id,
                'entry_type' => BillingLedgerEntry::ENTRY_REFUND,
                'reference_type' => 'billing_order',
                'reference_id' => $order->id,
                'quantity' => 1,
                'unit_price' => $amount,
                'amount' => -1 * $amount,
                'currency' => $order->currency,
                'description' => "Refund for {$order->order_number}: {$reason}",
                'meta' => ['reason' => $reason],
            ]);

            $order->update([
                'status' => $isFull ? BillingOrder::STATUS_REFUNDED : BillingOrder::STATUS_PAID,
            ]);

            $billingInvoice = $order->billingInvoice;
            if ($billingInvoice) {
                $status = $isFull ? BillingInvoice::STATUS_REFUNDED : BillingInvoice::STATUS_PARTIALLY_REFUNDED;
                $billingInvoice->update(['status' => $status]);
            }

            foreach ($order->payments()->where('status', Payment::STATUS_PAID)->get() as $payment) {
                $payment->update([
                    'status' => $isFull ? Payment::STATUS_REFUNDED : Payment::STATUS_PARTIALLY_REFUNDED,
                ]);
            }

            $this->audit->record('billing.order.refunded', 'billing_order', $order->id, [], [
                'amount' => $amount,
                'reason' => $reason,
                'status' => $order->status,
            ], $order->tenant_id);

            $this->notifications->toTenant($order->tenant, 'payment_refunded',
                'Refund issued',
                "A refund of {$order->currency} ".number_format($amount, 2)." has been issued for order {$order->order_number}.",
                ['order' => $order->order_number, 'amount' => $amount, 'reason' => $reason]);

            return $order->fresh();
        });
    }
}
