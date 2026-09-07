<?php

namespace Tests\Feature;

use App\Models\Invoice;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_create_and_approve_invoice(): void
    {
        $register = $this->postJson('/api/auth/register', [
            'tenant_name' => 'Maktech',
            'tenant_slug' => 'maktech2',
            'name' => 'Admin',
            'email' => 'admin@test.local',
            'password' => 'password123',
            'seller_ntn_cnic' => '0782562',
            'seller_business_name' => 'Maktech Traders',
            'seller_province' => 'Sindh',
            'seller_address' => 'Karachi',
        ]);

        $register->assertCreated();
        $token = $register->json('token');

        $headers = [
            'Authorization' => 'Bearer '.$token,
            'X-Tenant' => 'maktech2',
        ];

        $create = $this->postJson('/api/invoices', [
            'invoice_type' => 'Sale Invoice',
            'invoice_date' => now()->toDateString(),
            'buyer_business_name' => 'Test Buyer',
            'buyer_province' => 'Sindh',
            'buyer_address' => 'Karachi',
            'buyer_registration_type' => 'Registered',
            'buyer_email' => 'buyer@test.local',
            'items' => [[
                'hs_code' => '0101.2100',
                'product_description' => 'Demo item',
                'rate' => '18%',
                'uom' => 'Numbers, pieces, units',
                'quantity' => 1,
                'value_sales_excluding_st' => 1000,
                'sale_type' => 'Goods at standard rate (default)',
            ]],
        ], $headers);

        $create->assertCreated();
        $this->assertEquals(1180, (float) $create->json('grand_total'));
        $id = $create->json('id');

        $send = $this->postJson("/api/invoices/{$id}/send-for-approval", [], $headers);
        $send->assertOk();
        $approvalToken = $send->json('invoice.approval_token');

        $approve = $this->postJson("/api/public/invoices/{$approvalToken}/approve");
        $approve->assertOk();
        $this->assertEquals(Invoice::STATUS_APPROVED, $approve->json('invoice.status'));
    }

    public function test_login_demo_user_from_seeder_shape(): void
    {
        $tenant = Tenant::query()->create([
            'name' => 'Demo',
            'slug' => 'demo',
            'seller_ntn_cnic' => '123',
            'seller_business_name' => 'Demo Co',
            'seller_province' => 'Sindh',
            'seller_address' => 'Karachi',
        ]);
        TenantContext::set($tenant);
        User::query()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Admin',
            'email' => 'admin@demo.local',
            'password' => 'password',
            'role' => 'admin',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'admin@demo.local',
            'password' => 'password',
            'tenant' => 'demo',
        ])->assertOk()->assertJsonPath('tenant.slug', 'demo');
    }
}
