<?php

namespace Tests\Feature;

use App\Models\BillingLedgerEntry;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\UsagePackage;
use App\Services\BillingService;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\PlatformBootstrapSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class PlatformAdminFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();

        $this->seed(PlatformBootstrapSeeder::class);
        $this->seed(CatalogSeeder::class);
    }

    protected function api($method, string $uri, array $headers = [], array $payload = []): TestResponse
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
        $this->api('GET', '/api/admin/dashboard', $this->platformHeaders())
            ->assertOk()
            ->assertJsonStructure(['sellers', 'finance', 'subscriptions', 'pral', 'support', 'errors_today']);
        $this->api('GET', '/api/admin/tenants', $this->platformHeaders())->assertOk();
        $this->api('GET', '/api/admin/subscriptions', $this->platformHeaders())->assertOk();
    }

    public function test_platform_admin_cannot_use_seller_invoicing_or_client_apis(): void
    {
        $admin = $this->platformHeaders();
        $this->registerTenant();

        $adminWithTenant = $admin + ['X-Tenant' => 'console-co'];

        $this->api('GET', '/api/dashboard', $adminWithTenant)
            ->assertForbidden()
            ->assertJsonPath('code', 'admin_forbidden_seller');
        $this->api('GET', '/api/invoices', $adminWithTenant)->assertForbidden();
        $this->api('POST', '/api/invoices', $adminWithTenant, [])->assertForbidden();
        $this->api('GET', '/api/customers', $adminWithTenant)->assertForbidden();
        $this->api('POST', '/api/customers', $adminWithTenant, [
            'business_name' => 'Buyer Co',
            'ntn_cnic' => '1234567',
        ])->assertForbidden();
        $this->api('GET', '/api/settings', $adminWithTenant)->assertForbidden();
    }

    public function test_seller_cannot_access_platform_admin_apis(): void
    {
        $reg = $this->registerTenant();
        $headers = $this->tenantHeaders($reg['token']);

        $this->api('GET', '/api/admin/dashboard', $headers)->assertForbidden();
        $this->api('GET', '/api/admin/tenants', $headers)->assertForbidden();
        $this->api('GET', '/api/admin/subscriptions', $headers)->assertForbidden();
        $this->api('GET', '/api/admin/billing/payments', $headers)->assertForbidden();
        $this->api('POST', '/api/admin/tenants', $headers, [
            'tenant_name' => 'Hijack',
            'owner' => ['name' => 'X', 'email' => 'x@example.com'],
        ])->assertForbidden();
    }

    public function test_login_and_me_report_account_kind(): void
    {
        $adminLogin = $this->api('POST', '/api/auth/login', [], [
            'email' => 'admin@saas.local',
            'password' => 'password',
        ]);
        $adminLogin->assertOk()
            ->assertJsonPath('account_kind', 'platform_admin')
            ->assertJsonPath('is_platform_admin', true)
            ->assertJsonPath('tenant', null);

        $this->api('GET', '/api/auth/me', ['Authorization' => 'Bearer '.$adminLogin->json('token')])
            ->assertOk()
            ->assertJsonPath('account_kind', 'platform_admin')
            ->assertJsonPath('tenant', null);

        $reg = $this->registerTenant();
        $this->api('GET', '/api/auth/me', $this->tenantHeaders($reg['token']))
            ->assertOk()
            ->assertJsonPath('account_kind', 'seller')
            ->assertJsonPath('is_platform_admin', false);
    }

    public function test_admin_can_create_seller_and_assign_subscription(): void
    {
        $admin = $this->platformHeaders();
        $plan = SubscriptionPlan::query()->where('code', 'starter')->firstOrFail();

        $created = $this->api('POST', '/api/admin/tenants', $admin, [
            'tenant_name' => 'North Traders',
            'tenant_slug' => 'north-traders',
            'seller_email' => 'owner@north.local',
            'seller_business_name' => 'North Traders',
            'owner' => [
                'name' => 'North Owner',
                'email' => 'owner@north.local',
                'password' => 'password123',
            ],
            'subscription_plan_id' => $plan->id,
            'billing_interval' => 'monthly',
        ]);

        $created->assertCreated()
            ->assertJsonPath('slug', 'north-traders')
            ->assertJsonPath('owner.email', 'owner@north.local');

        $tenantId = $created->json('id');

        $show = $this->api('GET', "/api/admin/tenants/{$tenantId}", $admin);
        $show->assertOk()->assertJsonStructure(['pral' => ['sandbox', 'production'], 'usage']);
        $this->assertNotNull($show->json('usage.free_credits_remaining'));

        $premium = SubscriptionPlan::query()->where('code', 'premium')->firstOrFail();
        $this->api('POST', "/api/admin/tenants/{$tenantId}/subscription", $admin, [
            'subscription_plan_id' => $premium->id,
            'billing_interval' => 'yearly',
        ])->assertOk()->assertJsonPath('subscription.billing_interval', 'yearly');
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

        $package = UsagePackage::query()->where('code', 'pack_25')->firstOrFail();

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
        $this->assertSame(0.0, app(BillingService::class)->outstandingBalance($tenant));
    }
}
