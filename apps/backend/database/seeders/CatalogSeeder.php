<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use App\Models\UsagePackage;
use Illuminate\Database\Seeder;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $currency = config('saas.currency', 'PKR');

        $plans = [
            [
                'code' => 'starter', 'name' => 'Starter', 'billing_interval' => 'monthly',
                'price' => 900, 'annual_price' => 9000, 'invoice_limit' => 100,
                'overage_allowed' => true, 'overage_price' => 10, 'trial_days' => 0,
                'features' => ['100 FBR invoices / month', 'Buy extra packages anytime', 'Email & PDF invoicing', 'Support'],
                'sort_order' => 1,
            ],
            [
                'code' => 'standard', 'name' => 'Standard', 'billing_interval' => 'monthly',
                'price' => 3500, 'annual_price' => 35000, 'invoice_limit' => 500,
                'overage_allowed' => true, 'overage_price' => 10, 'trial_days' => 0,
                'features' => ['500 FBR invoices / month', 'Overage at PKR 10 / invoice', 'API access', 'Priority support'],
                'sort_order' => 2,
            ],
            [
                'code' => 'premium', 'name' => 'Premium', 'billing_interval' => 'monthly',
                'price' => 8000, 'annual_price' => 80000, 'invoice_limit' => null,
                'overage_allowed' => true, 'overage_price' => 10, 'trial_days' => 0,
                'features' => ['Unlimited FBR invoices', 'Overage at PKR 10 / invoice', 'API access', 'Dedicated support'],
                'sort_order' => 3,
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::query()->updateOrCreate(['code' => $plan['code']], $plan + [
                'name' => $plan['name'],
                'description' => $plan['features'][0] ?? null,
                'currency' => $currency,
                'is_active' => true,
            ]);
        }

        $packages = [
            ['code' => 'pack_25', 'name' => 'Starter Pack', 'invoice_quantity' => 25, 'price' => 200, 'validity_days' => 365, 'sort_order' => 1],
            ['code' => 'pack_100', 'name' => 'Popular Pack', 'invoice_quantity' => 100, 'price' => 700, 'validity_days' => 365, 'sort_order' => 2],
            ['code' => 'pack_500', 'name' => 'Bulk Pack', 'invoice_quantity' => 500, 'price' => 3000, 'validity_days' => 365, 'sort_order' => 3],
            ['code' => 'pack_1000', 'name' => 'Enterprise Pack', 'invoice_quantity' => 1000, 'price' => 5500, 'validity_days' => 365, 'sort_order' => 4],
        ];

        foreach ($packages as $package) {
            UsagePackage::query()->updateOrCreate(['code' => $package['code']], $package + [
                'name' => $package['name'],
                'description' => "{$package['invoice_quantity']} FBR invoice submissions, valid 12 months.",
                'currency' => $currency,
                'overage_allowed' => true,
                'is_active' => true,
            ]);
        }
    }
}
