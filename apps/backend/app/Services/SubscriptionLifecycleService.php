<?php

namespace App\Services;

use App\Models\BillingOrder;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Services\Payments\PaymentService;

class SubscriptionLifecycleService
{
    public function __construct(
        protected BillingService $billing,
        protected TenantService $tenants,
        protected EntitlementService $entitlement,
        protected PaymentService $payments,
        protected NotificationService $notifications,
    ) {}

    public function payments(): PaymentService
    {
        return $this->payments;
    }

    /**
     * All maintenance steps in one go (cron / `saas:maintain`).
     */
    public function maintain(): array
    {
        return [
            'expired_payments' => $this->payments->expireAbandonedPayments(),
            'renewals' => $this->billDueRenewals(),
            'grace_expired' => $this->enforceGraceExpiry(),
            'trials_ended' => $this->endTrials(),
            'overage_aggregated' => $this->aggregateOverages(),
        ];
    }

    /**
     * Pending subscriptions that never got paid within 48h are cancelled so they
     * cannot block plan changes later.
     */
    public function cancelStalePendingSubscriptions(?int $hours = 48): int
    {
        $count = TenantSubscription::query()
            ->where('status', TenantSubscription::STATUS_PENDING)
            ->where('created_at', '<', now()->subHours($hours))
            ->update([
                'status' => TenantSubscription::STATUS_CANCELLED,
                'cancelled_at' => now(),
            ]);

        return $count;
    }

    /**
     * Renew subscriptions whose next_billing_date has arrived. Uses the tenant's
     * default gateway (fallback to the platform default gateway).
     */
    public function billDueRenewals(): array
    {
        $renewed = 0;
        $deferred = 0;

        $due = TenantSubscription::query()
            ->where('status', TenantSubscription::STATUS_ACTIVE)
            ->where('auto_renew', true)
            ->whereNotNull('next_billing_date')
            ->where('next_billing_date', '<=', now())
            ->with('tenant')
            ->limit(100)
            ->get();

        foreach ($due as $subscription) {
            $tenant = $subscription->tenant;

            if (! $tenant) {
                continue;
            }

            $gatewayCode = $tenant->settings['default_gateway'] ?? SaasConfig::get('billing', 'default_gateway', 'mock');

            $order = $this->billing->createRenewalOrder($subscription);

            try {
                $result = $this->payments->checkout($order, $gatewayCode);
            } catch (\Throwable $e) {
                $this->enterGracePeriod($subscription, $tenant, $order, $e->getMessage());
                $deferred++;

                continue;
            }

            // Only roll the period forward once the charge actually cleared. Manual
            // gateways return here unpaid (order stays payment_processing for later
            // confirmation) — those must enter grace, never renew for free.
            if (($result['status'] ?? null) === BillingOrder::STATUS_PAID) {
                $this->billing->applyRenewal($subscription->fresh());

                $this->entitlement->checkLowQuota($tenant);
                $renewed++;
            } else {
                $this->enterGracePeriod($subscription, $tenant, $order, 'Renewal payment is pending manual completion.');
                $deferred++;
            }
        }

        return ['renewed' => $renewed, 'deferred' => $deferred];
    }

    /**
     * Move a subscription whose renewal charge failed or is pending into its grace
     * window. The tenant stays billable until the window closes; the open order is
     * left in place so it can still be paid (activating the subscription again).
     */
    protected function enterGracePeriod(TenantSubscription $subscription, Tenant $tenant, BillingOrder $order, string $reason): void
    {
        $graceEndsAt = now()->addHours(SaasConfig::gracePeriodHours($tenant));

        $subscription->update([
            'status' => TenantSubscription::STATUS_GRACE_PERIOD,
            'grace_period_hours' => SaasConfig::gracePeriodHours($tenant),
            'grace_ends_at' => $graceEndsAt,
            'next_billing_date' => null,
        ]);

        if (in_array($tenant->status, [Tenant::STATUS_ACTIVE, Tenant::STATUS_PAST_DUE], true)) {
            $tenant->update([
                'status' => Tenant::STATUS_GRACE_PERIOD,
                'is_active' => true,
            ]);
        }

        $this->notifications->toTenant($tenant, 'subscription_renewal_failed',
            'Subscription renewal payment failed',
            "We could not renew your {$subscription->plan?->name} plan automatically. Your account stays active until {$graceEndsAt->toDateTimeString()} — please pay the open order to avoid suspension.",
            ['order' => $order->order_number, 'grace_ends_at' => $graceEndsAt->toDateTimeString(), 'error' => $reason]);
    }

    /**
     * Subscriptions whose grace window elapsed without payment get suspended and
     * take their tenant with them (unless debt enforcement is disabled globally).
     */
    public function enforceGraceExpiry(): int
    {
        $suspended = 0;
        $enforcement = (bool) SaasConfig::get('billing', 'suspend_on_grace_expiry', true);

        if (! $enforcement) {
            return 0;
        }

        $expired = TenantSubscription::query()
            ->where('status', TenantSubscription::STATUS_GRACE_PERIOD)
            ->whereNotNull('grace_ends_at')
            ->where('grace_ends_at', '<=', now())
            ->with('tenant')
            ->get();

        foreach ($expired as $subscription) {
            $subscription->update([
                'status' => TenantSubscription::STATUS_SUSPENDED,
                'suspended_at' => now(),
            ]);

            $tenant = $subscription->tenant;
            if ($tenant && $tenant->status !== Tenant::STATUS_SUSPENDED) {
                $this->tenants->changeStatus($tenant, Tenant::STATUS_SUSPENDED, 'Subscription grace period expired without payment.');
                $suspended++;
            }
        }

        return $suspended;
    }

    /**
     * Move tenants from trial to active at trial end. If the tenant never bought
     * anything they simply continue on the pay-as-you-go invoice model.
     */
    public function endTrials(): int
    {
        $ended = 0;

        $tenants = Tenant::query()
            ->where('status', Tenant::STATUS_TRIAL)
            ->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '<=', now())
            ->get();

        foreach ($tenants as $tenant) {
            $this->tenants->changeStatus($tenant, Tenant::STATUS_ACTIVE, 'Trial period ended.');

            $this->notifications->toTenant($tenant, 'trial_ended',
                'Your trial period has ended',
                'Your trial has ended. You can keep invoicing on the pay-as-you-go model or choose a plan.',
                ['tenant' => $tenant->slug]);

            $ended++;
        }

        return $ended;
    }

    /**
     * Turn unbilled overage ledger rows into a billing order + invoice so they can
     * be collected through the standard payment flow.
     */
    public function aggregateOverages(): int
    {
        $tenants = Tenant::query()
            ->whereIn('status', [Tenant::STATUS_ACTIVE, Tenant::STATUS_PAST_DUE, Tenant::STATUS_TRIAL, Tenant::STATUS_GRACE_PERIOD])
            ->whereHas('ledgerEntries', function ($q) {
                $q->where('entry_type', 'OVERAGE_CHARGE')
                    ->where('meta->state', 'unbilled');
            })
            ->get();

        $created = 0;

        foreach ($tenants as $tenant) {
            $order = $this->billing->createOverageOrder($tenant);

            if ($order) {
                $this->notifications->toTenant($tenant, 'overage_invoice_issued',
                    'Invoice issued for usage',
                    "Your pay-as-you-go usage was settled into order {$order->order_number} for {$order->currency} ".number_format((float) $order->total_amount, 2).'.',
                    ['order' => $order->order_number, 'amount' => $order->total_amount]);

                $created++;
            }
        }

        return $created;
    }
}
