<?php

namespace App\Services;

use App\Exceptions\TenantStatusException;
use App\Exceptions\UsageLimitExceededException;
use App\Models\BillingLedgerEntry;
use App\Models\Invoice;
use App\Models\InvoiceUsageEvent;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Models\UsagePackagePurchase;
use Illuminate\Support\Facades\DB;

class EntitlementService
{
    public const SOURCE_PACKAGE = 'package';
    public const SOURCE_SUBSCRIPTION = 'subscription';
    public const SOURCE_FREE_CREDIT = 'free_credits';
    public const SOURCE_OVERAGE = 'overage';

    public function __construct(
        protected NotificationService $notifications,
    ) {}

    /**
     * Pre-flight check before an invoice is allowed to go to the FBR queue.
     */
    public function assertCanSubmit(Tenant $tenant, ?Invoice $invoice = null): void
    {
        if (! $tenant->canBillInvoices()) {
            throw new TenantStatusException(
                'Your account is not active. Please clear your outstanding balance to resume submitting invoices.',
                403
            );
        }

        if (! $invoice) {
            return;
        }

        if ($invoice->isConsumed()) {
            return; // already billed; retries are free
        }

        $balance = $this->balanceFor($tenant);

        if ($balance['canDraw']) {
            return;
        }

        if ($balance['overageAllowed']) {
            return;
        }

        throw new UsageLimitExceededException(
            'You have no invoice allowance left and overage billing is disabled for your plan. Please purchase a package or contact support.',
            402
        );
    }

    /**
     * Resolve the allowances available to a tenant right now.
     */
    public function balanceFor(Tenant $tenant): array
    {
        $settings = $tenant->settings ?? [];

        $freeRemaining = max(0, (int) ($settings['free_invoice_credits'] ?? 0));

        $packages = $tenant->activePackagePurchases()
            ->whereRaw('purchased_invoices > used_invoices')
            ->get(['id', 'name', 'purchased_invoices', 'used_invoices', 'expires_at']);

        $packagesRemaining = $packages->sum(fn ($p) => $p->purchased_invoices - $p->used_invoices);

        $subscription = null;
        $subscriptionRemaining = null; // null = unlimited
        $subscription = $tenant->activeSubscription()
            ->whereIn('status', [TenantSubscription::STATUS_ACTIVE, TenantSubscription::STATUS_GRACE_PERIOD, TenantSubscription::STATUS_TRIAL])
            ->first();
        if ($subscription && $subscription->invoice_limit !== null) {
            $subscriptionRemaining = max(0, (int) $subscription->invoice_limit - (int) $subscription->used_invoices);
        }

        $unlimited = $subscription !== null && $subscription->invoice_limit === null;

        $anyAllowance = $freeRemaining > 0 || $packagesRemaining > 0 || $unlimited || ($subscriptionRemaining !== null && $subscriptionRemaining > 0);

        $overageAllowed = $this->overageAllowedFor($tenant, $subscription);

        return [
            'free_credits_remaining' => $freeRemaining,
            'package_remaining' => $packagesRemaining,
            'subscription_remaining' => $subscriptionRemaining, // null means unlimited
            'subscription' => $subscription,
            'packages' => $packages->values(),
            'unlimited' => $unlimited,
            'overageAllowed' => $overageAllowed,
            'canDraw' => $anyAllowance,
        ];
    }

    protected function overageAllowedFor(Tenant $tenant, ?TenantSubscription $subscription): bool
    {
        $global = (bool) SaasConfig::get('billing', 'allow_overage', true);

        if (! $global) {
            return false;
        }

        if ($subscription && $subscription->overage_allowed === false) {
            return false;
        }

        return true;
    }

    /**
     * Charge one invoice against the tenant entitlement. Idempotent per invoice.
     *
     * @return array{source:string, source_id:int|null, overage:bool, already_charged:bool}
     */
    public function chargeForInvoice(Invoice $invoice): array
    {
        return DB::transaction(function () use ($invoice) {
            $tenant = $invoice->tenant;

            if ($invoice->usage_consumed_at) {
                return [
                    'source' => $invoice->usage_source_type,
                    'source_id' => $invoice->usage_source_id,
                    'overage' => $invoice->usage_source_type === self::SOURCE_OVERAGE,
                    'already_charged' => true,
                ];
            }

            $this->assertCanSubmit($tenant, null);

            $drawn = $this->drawOne($tenant);

            $invoice->forceFill([
                'usage_source_type' => $drawn['source'],
                'usage_source_id' => $drawn['source_id'],
                'usage_reserved_at' => now(),
                'usage_consumed_at' => now(),
            ])->save();

            $event = InvoiceUsageEvent::query()->create([
                'tenant_id' => $tenant->id,
                'invoice_id' => $invoice->id,
                'event' => InvoiceUsageEvent::EVENT_CONSUME,
                'source_type' => $drawn['source'],
                'source_id' => $drawn['source_id'],
                'quantity' => 1,
                'unit_price' => $drawn['unit_price'],
                'amount' => $drawn['amount'],
                'meta' => ['tenant_status' => $tenant->status, 'invoice_status' => $invoice->status],
            ]);

            if ($drawn['source'] === self::SOURCE_OVERAGE) {
                BillingLedgerEntry::query()->create([
                    'tenant_id' => $tenant->id,
                    'entry_type' => BillingLedgerEntry::ENTRY_OVERAGE_CHARGE,
                    'reference_type' => 'invoice',
                    'reference_id' => $invoice->id,
                    'quantity' => 1,
                    'unit_price' => $drawn['unit_price'],
                    'amount' => $drawn['amount'],
                    'currency' => $tenant->currency ?? 'PKR',
                    'description' => "Overage invoice #{$invoice->invoice_ref_no} (submitted above allowance)",
                    'meta' => ['state' => 'unbilled', 'usage_event_id' => $event->id],
                ]);
            }

            $this->checkLowQuota($tenant);

            return [
                'source' => $drawn['source'],
                'source_id' => $drawn['source_id'],
                'overage' => $drawn['source'] === self::SOURCE_OVERAGE,
                'already_charged' => false,
            ];
        });
    }

    /**
     * Remove one invoice unit of quota from the cheapest allowance first.
     */
    protected function drawOne(Tenant $tenant): array
    {
        $order = SaasConfig::consumptionOrder();
        $packagesFirst = $order === 'packages_first';

        $steps = $packagesFirst
            ? [[$this, 'drawFromPackages'], [$this, 'drawFromSubscription'], [$this, 'drawFromFreeCredits'], [$this, 'drawFromOverage']]
            : [[$this, 'drawFromFreeCredits'], [$this, 'drawFromPackages'], [$this, 'drawFromSubscription'], [$this, 'drawFromOverage']];

        foreach ($steps as $step) {
            $result = $step($tenant);
            if ($result) {
                return $result;
            }
        }

        $balance = $this->balanceFor($tenant);

        throw new UsageLimitExceededException(
            $balance['overageAllowed']
                ? 'No allowance available.'
                : 'You have run out of invoicing allowance and overage is disabled. Please buy a package or upgrade your plan.',
            402
        );
    }

    protected function drawFromPackages(Tenant $tenant): ?array
    {
        $package = $tenant->activePackagePurchases()
            ->whereRaw('purchased_invoices > used_invoices')
            ->lockForUpdate()
            ->orderBy('expires_at')
            ->orderBy('id')
            ->first();

        if (! $package) {
            return null;
        }

        $package->increment('used_invoices');

        if ($package->fresh()->used_invoices >= $package->purchased_invoices) {
            $package->update(['status' => UsagePackagePurchase::STATUS_CONSUMED]);
        }

        return [
            'source' => self::SOURCE_PACKAGE,
            'source_id' => $package->id,
            'unit_price' => 0,
            'amount' => 0,
            'description' => "Package: {$package->name}",
        ];
    }

    protected function drawFromSubscription(Tenant $tenant): ?array
    {
        $subscription = $tenant->activeSubscription()
            ->whereIn('status', [TenantSubscription::STATUS_ACTIVE, TenantSubscription::STATUS_GRACE_PERIOD, TenantSubscription::STATUS_TRIAL])
            ->lockForUpdate()
            ->first();

        if (! $subscription) {
            return null;
        }

        $remaining = $subscription->invoice_limit === null
            ? PHP_INT_MAX
            : (int) $subscription->invoice_limit - (int) $subscription->used_invoices;

        if ($remaining < 1) {
            return null;
        }

        $subscription->increment('used_invoices');

        return [
            'source' => self::SOURCE_SUBSCRIPTION,
            'source_id' => $subscription->id,
            'unit_price' => 0,
            'amount' => 0,
            'description' => "Subscription: {$subscription->plan?->name}",
        ];
    }

    protected function drawFromFreeCredits(Tenant $tenant): ?array
    {
        $settings = $tenant->settings ?? [];
        $remaining = max(0, (int) ($settings['free_invoice_credits'] ?? 0));

        if ($remaining < 1) {
            return null;
        }

        $settings['free_invoice_credits'] = $remaining - 1;
        $settings['free_invoice_used'] = (int) ($settings['free_invoice_used'] ?? 0) + 1;
        $tenant->update(['settings' => $settings]);

        return [
            'source' => self::SOURCE_FREE_CREDIT,
            'source_id' => null,
            'unit_price' => 0,
            'amount' => 0,
            'description' => 'Complimentary invoice credit',
        ];
    }

    protected function drawFromOverage(Tenant $tenant): ?array
    {
        $subscription = $tenant->activeSubscription()
            ->whereIn('status', [TenantSubscription::STATUS_ACTIVE, TenantSubscription::STATUS_GRACE_PERIOD, TenantSubscription::STATUS_TRIAL])
            ->first();

        if (! $this->overageAllowedFor($tenant, $subscription)) {
            return null;
        }

        $price = SaasConfig::invoicePrice();
        if ($subscription && $subscription->overage_price !== null) {
            $price = (float) $subscription->overage_price;
        }

        return [
            'source' => self::SOURCE_OVERAGE,
            'source_id' => null,
            'unit_price' => $price,
            'amount' => $price,
            'description' => 'Pay-as-you-go overage invoice',
        ];
    }

    public function checkLowQuota(Tenant $tenant): void
    {
        $settings = $tenant->settings ?? [];
        $freeUsed = (int) ($settings['free_invoice_used'] ?? 0);
        $freeRemaining = max(0, (int) ($settings['free_invoice_credits'] ?? 0));

        $packTotal = (int) $tenant->packagePurchases()->where('status', '!=', UsagePackagePurchase::STATUS_REFUNDED)->sum('purchased_invoices');
        $packUsed = (int) $tenant->packagePurchases()->where('status', '!=', UsagePackagePurchase::STATUS_REFUNDED)->sum('used_invoices');

        $subTotal = 0;
        $subUsed = 0;
        $subscription = $tenant->activeSubscription()
            ->whereIn('status', [TenantSubscription::STATUS_ACTIVE, TenantSubscription::STATUS_GRACE_PERIOD, TenantSubscription::STATUS_TRIAL])
            ->first();
        if ($subscription && $subscription->invoice_limit !== null) {
            $subTotal = (int) $subscription->invoice_limit;
            $subUsed = (int) $subscription->used_invoices;
        }

        $remaining = $freeRemaining + ($packTotal - $packUsed) + max(0, $subTotal - $subUsed);
        $total = $freeUsed + $freeRemaining + $packTotal + $subTotal;

        $notified = (array) ($settings['quota_alerts'] ?? []);

        foreach (SaasConfig::lowQuotaThresholds() as $threshold) {
            $pct = $total > 0 ? (int) floor(($remaining / $total) * 100) : 0;
            if ($pct <= $threshold && $remaining > 0 && ! in_array((string) $threshold, $notified, true)) {
                $notified[] = (string) $threshold;
                $settings['quota_alerts'] = $notified;
                $tenant->update(['settings' => $settings]);

                $this->notifications->toTenant($tenant, 'quota_low',
                    'Invoice allowance running low',
                    "You have {$remaining} invoice(s) of allowance remaining ({$pct}%). Please top-up before you run out.",
                    ['remaining' => $remaining, 'percent' => $pct, 'threshold' => $threshold]);
            }
        }

        if ($remaining === 0) {
            $this->notifications->toTenant($tenant, 'quota_exhausted',
                'Invoice allowance exhausted',
                'You have no invoice allowance remaining. New submissions will be billed at the pay-as-you-go rate.',
                ['remaining' => 0]);
        }
    }

    /**
     * Public summary used by dashboards / usage screens.
     */
    public function usageSummary(Tenant $tenant): array
    {
        $balance = $this->balanceFor($tenant);
        $settings = $tenant->settings ?? [];

        $usedPackages = (int) $tenant->packagePurchases()
            ->where('status', '!=', UsagePackagePurchase::STATUS_REFUNDED)
            ->sum('used_invoices');

        $freeUsed = (int) ($settings['free_invoice_used'] ?? 0);

        $subUsed = 0;
        if ($subscription = $balance['subscription']) {
            $subUsed = (int) $subscription->used_invoices;
        }

        return [
            'free_credits_remaining' => $balance['free_credits_remaining'],
            'free_credits_used' => $freeUsed,
            'packages' => $balance['packages']->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'purchased' => (int) $p->purchased_invoices,
                'used' => (int) $p->used_invoices,
                'remaining' => max(0, (int) $p->purchased_invoices - (int) $p->used_invoices),
                'expires_at' => $p->expires_at,
            ])->values(),
            'package_used' => $usedPackages,
            'subscription' => $balance['subscription'] ? [
                'plan' => $balance['subscription']->plan?->name,
                'status' => $balance['subscription']->status,
                'invoice_limit' => $balance['subscription']->invoice_limit,
                'used' => $subUsed,
                'remaining' => $balance['subscription_remaining'],
                'period_end' => $balance['subscription']->current_period_end,
            ] : null,
            'unlimited' => $balance['unlimited'],
            'overage_allowed' => $balance['overageAllowed'],
        ];
    }
}
