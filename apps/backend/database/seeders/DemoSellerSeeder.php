<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Services\TenantService;
use Illuminate\Database\Seeder;

class DemoSellerSeeder extends Seeder
{
    /**
     * Four seller-level (B) demo accounts so each seller dashboard /
     * subscription state can be tested:
     *  - apex-traders   -> active Starter
     *  - bright-mart    -> active Standard
     *  - city-foods     -> active Premium
     *  - delta-electronics -> no plan yet (generous free credits) to try the
     *                        Raast (P2M) checkout flow end to end.
     *
     * All owners log in with password "password".
     */
    public function run(): void
    {
        $sellers = [
            [
                'slug' => 'apex-traders', 'name' => 'Apex Traders',
                'business' => 'Apex Traders (Pvt) Ltd', 'city' => 'Karachi',
                'email' => 'admin@apextraders.local', 'plan' => 'starter', 'credits' => null,
            ],
            [
                'slug' => 'bright-mart', 'name' => 'Bright Mart',
                'business' => 'Bright Mart Stores', 'city' => 'Lahore',
                'email' => 'admin@brightmart.local', 'plan' => 'standard', 'credits' => null,
            ],
            [
                'slug' => 'city-foods', 'name' => 'City Foods',
                'business' => 'City Foods Distributors', 'city' => 'Islamabad',
                'email' => 'admin@cityfoods.local', 'plan' => 'premium', 'credits' => null,
            ],
            [
                'slug' => 'delta-electronics', 'name' => 'Delta Electronics',
                'business' => 'Delta Electronics & Appliances', 'city' => 'Faisalabad',
                'email' => 'admin@deltaelectronics.local', 'plan' => null, 'credits' => 20,
            ],
        ];

        $tenantService = app(TenantService::class);

        foreach ($sellers as $seller) {
            [$tenant, $created] = $this->tenant($tenantService, $seller);

            $planCode = $seller['plan'];
            if ($planCode && ! $tenant->activeSubscription) {
                $this->grantActivePlan($tenant, $planCode);
            }

            if ($seller['credits'] !== null && $created) {
                $tenantService->adjustCredits($tenant, max(0, (int) $seller['credits']), 'Demo seller free invoice credits');
            }
        }
    }

    /**
     * @return array{Tenant, bool}
     */
    protected function tenant(TenantService $service, array $seller): array
    {
        $tenant = Tenant::query()->where('slug', $seller['slug'])->first();

        if ($tenant) {
            return [$tenant, false];
        }

        $tenant = $service->createTenant([
            'tenant_name' => $seller['name'],
            'tenant_slug' => $seller['slug'],
            'seller_ntn_cnic' => '0'.substr((string) mt_rand(100000, 999999), 0, 6),
            'seller_business_name' => $seller['business'],
            'seller_province' => 'Sindh',
            'seller_address' => $seller['city'],
            'seller_email' => $seller['email'],
            '_admin_created' => true,
        ]);

        $service->createOwner($tenant, [
            'name' => $seller['name'].' Admin',
            'email' => $seller['email'],
            'password' => 'password',
        ]);

        $service->bootstrapTenant($tenant);

        return [$tenant->fresh(), true];
    }

    protected function grantActivePlan(Tenant $tenant, string $planCode): void
    {
        $plan = SubscriptionPlan::query()->where('code', $planCode)->first();

        if (! $plan) {
            return;
        }

        $start = now();
        $periodEnd = $start->copy()->addMonth();

        TenantSubscription::query()->create([
            'tenant_id' => $tenant->id,
            'subscription_plan_id' => $plan->id,
            'status' => TenantSubscription::STATUS_ACTIVE,
            'billing_interval' => 'monthly',
            'price' => (float) $plan->price,
            'currency' => $tenant->currency ?? 'PKR',
            'invoice_limit' => $plan->invoice_limit,
            'overage_allowed' => $plan->overage_allowed,
            'overage_price' => $plan->overage_price,
            'grace_period_hours' => $plan->grace_period_hours,
            'auto_renew' => true,
            'starts_at' => $start,
            'current_period_start' => $start,
            'current_period_end' => $periodEnd,
            'next_billing_date' => $periodEnd->copy()->addDay(),
        ]);
    }
}
