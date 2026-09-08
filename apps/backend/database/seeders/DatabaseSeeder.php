<?php

namespace Database\Seeders;

use App\Models\Invoice;
use App\Models\Tenant;
use App\Models\User;
use App\Services\InvoiceCalculator;
use App\Services\RoleService;
use App\Support\TenantContext;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            PlatformBootstrapSeeder::class,
            CatalogSeeder::class,
        ]);

        $this->seedMaktechDemo();

        $this->call(DemoSellerSeeder::class);
    }

    protected function seedMaktechDemo(): void
    {
        $tenant = Tenant::query()->firstOrCreate(
            ['slug' => 'maktech'],
            [
                'name' => 'Maktech',
                'seller_ntn_cnic' => '0782562',
                'seller_business_name' => 'Maktech Traders',
                'seller_province' => 'Sindh',
                'seller_address' => 'Karachi',
                'seller_email' => 'admin@maktech.local',
                'auto_submit_on_approval' => false,
            ]
        );

        TenantContext::set($tenant);

        $user = User::query()->withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'email' => 'admin@maktech.local'],
            [
                'name' => 'Maktech Admin',
                'password' => 'password',
                'role' => 'admin',
            ]
        );

        RoleService::ensureDefaults();

        // Bring the demo tenant onto the SaaS rails: roles, FBR rows, free quota.
        app(\App\Services\TenantService::class)->bootstrapTenant($tenant);

        $tenant->update(['owner_user_id' => $user->id]);

        $settings = $tenant->settings ?? [];
        $settings['free_invoice_credits'] = max((int) ($settings['free_invoice_credits'] ?? 0), 25);
        $settings['free_invoice_used'] = $settings['free_invoice_used'] ?? 0;
        $tenant->update(['settings' => $settings]);

        if (! $user->roles()->where('code', 'tenant_owner')->exists()) {
            $ownerRole = \App\Models\Role::query()->where('tenant_id', null)->where('code', 'tenant_owner')->first();
            if ($ownerRole) {
                $user->roles()->attach($ownerRole->id, ['tenant_id' => $tenant->id]);
            }
        }

        if ($tenant->invoices()->exists()) {
            return;
        }

        $calculator = app(InvoiceCalculator::class);

        $invoice = Invoice::query()->create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'invoice_type' => 'Sale Invoice',
            'invoice_date' => now()->toDateString(),
            'invoice_ref_no' => 'INV-DEMO-001',
            'scenario_id' => 'SN001',
            'seller_ntn_cnic' => $tenant->seller_ntn_cnic,
            'seller_business_name' => $tenant->seller_business_name,
            'seller_province' => $tenant->seller_province,
            'seller_address' => $tenant->seller_address,
            'buyer_ntn_cnic' => '1000000000000',
            'buyer_business_name' => 'FERTILIZER MANUFAC IRS NEW',
            'buyer_province' => 'Sindh',
            'buyer_address' => 'Karachi',
            'buyer_registration_type' => 'Registered',
            'buyer_email' => 'buyer@example.com',
            'status' => Invoice::STATUS_DRAFT,
        ]);

        $invoice->items()->create($calculator->hydrateItem([
            'hs_code' => '0101.2100',
            'product_description' => 'product Description',
            'rate' => '18%',
            'uom' => 'Numbers, pieces, units',
            'quantity' => 1,
            'value_sales_excluding_st' => 1000,
            'sales_tax_applicable' => 180,
            'sale_type' => 'Goods at standard rate (default)',
        ]));

        $invoice->load('items');
        $invoice->recalculateTotals();
    }
}
