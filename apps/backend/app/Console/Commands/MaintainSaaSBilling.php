<?php

namespace App\Console\Commands;

use App\Services\SubscriptionLifecycleService;
use Illuminate\Console\Command;

class MaintainSaaSBilling extends Command
{
    protected $signature = 'saas:maintain {--only=* : Run only the given step(s): payments,renewals,grace,trials,overage,stale}';

    protected $description = 'Run SaaS billing lifecycle maintenance (renewals, grace, trials, overage aggregation)';

    public function handle(SubscriptionLifecycleService $lifecycle): int
    {
        $only = $this->option('only');

        $steps = [];

        if (! $only || in_array('stale', $only, true)) {
            $steps['stale_pending_subscriptions_cancelled'] = $lifecycle->cancelStalePendingSubscriptions();
        }

        if (! $only || in_array('payments', $only, true)) {
            $steps['expired_payments'] = $lifecycle->payments()->expireAbandonedPayments();
        }

        if (! $only || in_array('renewals', $only, true)) {
            $steps = array_merge($steps, $lifecycle->billDueRenewals());
        }

        if (! $only || in_array('grace', $only, true)) {
            $steps['grace_expired_suspended'] = $lifecycle->enforceGraceExpiry();
        }

        if (! $only || in_array('trials', $only, true)) {
            $steps['trials_ended'] = $lifecycle->endTrials();
        }

        if (! $only || in_array('overage', $only, true)) {
            $steps['overage_orders_created'] = $lifecycle->aggregateOverages();
        }

        foreach ($steps as $key => $value) {
            $this->line(sprintf('  <info>%s</info>: %s', $key, json_encode($value)));
        }

        $this->info('SaaS maintenance complete.');

        return self::SUCCESS;
    }
}
