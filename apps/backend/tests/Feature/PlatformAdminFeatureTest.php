<?php

namespace Tests\Feature;

use App\Models\BillingLedgerEntry;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PlatformAdminFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();

        $this->seed(\Database\Seeders\PlatformBootstrapSeeder::class);
        $this->seed(\Database\Seeders\CatalogSeeder::class);
    }

    protected function api($method, string $uri, array $headers = [], array $payload = []): \Illuminate\Testing\TestResponse
    {
        // Guards cache the resolved user per application instance across requests
        // within one test; forget them so a different bearer token is honoured.
        app('auth')->forgetGuards();

        return match (strtoupper($method)) {
            'POST' => $this->postJson($uri, $payload, $headers),
            'PUT' => $this->putJson($uri, $payload, $headers),
            default => $this->getJson($uri, $headers),
        };
    }

    protected function platformHeaders(): array
    {
        $login = $this->api('POST', '/api/auth/login', [], [
            'email' => 'admin@saas.local',
            'password' => 'password',
        ]);

        $login->assertOk()->assertJsonPath('user.is_platform_admin', true);

        return ['Authorization' => 'Bearer '.$login->json('token')];
    }

    protected function registerTenant(string $slug = 'console-co', string $email = 'owner@console.local'): array
    {
        $response = $this->api('POST', '/api/auth/register', [], [
            'tenant_name' => 'Console Co',
            'tenant_slug' => $slug,
            'name' => 'Owner',
            'email' => $email,
            'password' => 'password123',
            'seller_ntn_cnic' => '1234567',
            'seller_business_name' => 'Console Co',
            'seller_province' => 'Sindh',
            'seller_address' => 'Karachi',
        ]);

        $response->assertCreated();

        return [
            'token' => $response->json('token'),
            'tenant' => $response->json('tenant'),
        ];
    }

    protected function tenantHeaders(string $token): array
    {
        return [
            'Authorization' => 'Bearer '.$token,
            'X-Tenant' => 'console-co',
        ];
    }

    public function test_platform_admin_can_open_dashboard(): void
    {
        $this->api('GET', '/api/admin/dashboard', $this->platformHeaders())->assertOk();
        $this->api('GET', '/api/admin/tenants', $this->platformHeaders())->assertOk();
    }

    public function test_platform_admin_area_rejects_tenant_users_and_guests(): void
    {
        $reg = $this->registerTenant();
        $tenantToken = $reg['token'];

        $this->api('GET', '/api/admin/dashboard', $this->tenantHeaders($tenantToken))->assertForbidden();
        $this->api('GET', '/api/admin/tenants', $this->tenantHeaders($tenantToken))->assertForbidden();
        $this->api('GET', '/api/admin/dashboard')->assertUnauthorized();
    }

    public function test_admin_can_list_manage_and_suspend_tenants(): void
    {
        $admin = $this->platformHeaders();
        $reg = $this->registerTenant();
        $tenantToken = $reg['token'];
        $tenantId = $reg['tenant']['id'];

        $list = $this->api('GET', '/api/admin/tenants', $admin);
        $list->assertOk();
        $this->assertTrue(collect($list->json('data'))->contains('id', $tenantId));

        // Suspend → invoice creation/submission (active-tenant actions) blocked.
        $this->api('POST', "/api/admin/tenants/{$tenantId}/status", $admin, ['status' => 'suspended', 'note' => 'Abuse'])
            ->assertOk()
            ->assertJsonPath('status', 'suspended');

        $blocked = $this->api('POST', '/api/invoices', $this->tenantHeaders($tenantToken), []);
        $blocked->assertForbidden()->assertJsonPath('tenant_status', 'suspended');

        $tenant = Tenant::query()->withoutGlobalScopes()->findOrFail($tenantId);
        $this->assertFalse($tenant->canBillInvoices());

        // History remains visible while suspended (view + settle only).
        $this->api('GET', '/api/billing/summary', $this->tenantHeaders($tenantToken))->assertOk();

        // Re-activate restores the ability to create invoices.
        $this->api('POST', "/api/admin/tenants/{$tenantId}/status", $admin, ['status' => 'active'])->assertOk();
        $this->api('POST', '/api/invoices', $this->tenantHeaders($tenantToken), [])->assertStatus(422);

        // Admin can also grant free credits through the ledger.
        $this->api('POST', "/api/admin/tenants/{$tenantId}/credits", $admin, ['quantity' => 20, 'description' => 'Support grant'])
            ->assertOk()
            ->assertJsonPath('free_invoice_credits', 25);
    }

    public function test_admin_full_refund_reverses_ledger_not_deletes(): void
    {
        $admin = $this->platformHeaders();
        $reg = $this->registerTenant();
        $token = $reg['token'];
        $headers = $this->tenantHeaders($token);

        $package = \App\Models\UsagePackage::query()->where('code', 'pack_25')->firstOrFail();

        $buy = $this->api('POST', '/api/billing/packages', $headers, [
            'usage_package_id' => $package->id,
            'gateway' => 'mock',
        ]);

        $buy->assertOk()->assertJsonPath('order.status', 'paid');
        $orderId = $buy->json('order.id');

        $refund = $this->api('POST', "/api/admin/billing/orders/{$orderId}/refund", $admin, [
            'amount' => $package->price,
            'reason' => 'Customer requested cancellation',
        ]);

        $refund->assertOk()->assertJsonPath('order.status', 'refunded');

        $tenant = Tenant::query()->withoutGlobalScopes()->where('slug', 'console-co')->firstOrFail();

        // The original charge row is flagged reversed, a REFUND row negates it.
        $original = $tenant->ledgerEntries()
            ->where('reference_type', 'billing_order')
            ->where('amount', '>', 0)
            ->firstOrFail();

        $this->assertSame('reversed', $original->meta['state']);

        $refunds = $tenant->ledgerEntries()->where('entry_type', BillingLedgerEntry::ENTRY_REFUND)->get();
        $this->assertCount(1, $refunds);
        $this->assertSame(-1 * (float) $package->price, (float) $refunds->first()->amount);

        $order = $tenant->billingOrders()->findOrFail($orderId);
        $this->assertSame('refunded', $order->billingInvoice->status);
        $this->assertSame('refunded', $order->payments()->first()->status);
        $this->assertSame(0.0, app(\App\Services\BillingService::class)->outstandingBalance($tenant));
    }
}
