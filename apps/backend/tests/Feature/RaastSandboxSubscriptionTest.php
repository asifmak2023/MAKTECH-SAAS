<?php

namespace Tests\Feature;

use App\Models\BillingLedgerEntry;
use App\Models\FbrIntegration;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Services\BillingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class RaastSandboxSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();

        $this->seed(\Database\Seeders\PlatformBootstrapSeeder::class);
        $this->seed(\Database\Seeders\CatalogSeeder::class);
    }

    protected function registerTenant(string $slug, string $email): array
    {
        $response = $this->postJson('/api/auth/register', [
            'tenant_name' => ucfirst($slug),
            'tenant_slug' => $slug,
            'name' => 'Owner',
            'email' => $email,
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'seller_ntn_cnic' => '1234567',
            'seller_business_name' => ucfirst($slug),
            'seller_province' => 'Sindh',
            'seller_address' => 'Karachi',
        ]);

        $response->assertCreated();

        return ['token' => $response->json('token'), 'tenant' => $response->json('tenant')];
    }

    protected function headers(string $slug, string $token): array
    {
        return ['Authorization' => 'Bearer '.$token, 'X-Tenant' => $slug];
    }

    protected function configureSandboxIntegration(string $slug): void
    {
        $tenant = Tenant::query()->where('slug', $slug)->firstOrFail();

        $row = FbrIntegration::query()
            ->where('tenant_id', $tenant->id)
            ->where('integrator', 'pral')
            ->where('mode', 'sandbox')
            ->firstOrFail();

        $row->setConfigArray(['base_url' => 'https://pral.test', 'token' => 'demo-token'])
            ->fill(['status' => 'configured'])
            ->save();
    }

    protected function submitOneInvoice(string $slug, string $token, int $n = 0): Invoice
    {
        $headers = $this->headers($slug, $token);

        $create = $this->postJson('/api/invoices', [
            'invoice_type' => 'Sale Invoice',
            'invoice_date' => now()->toDateString(),
            'buyer_business_name' => 'Buyer '.$n,
            'buyer_province' => 'Sindh',
            'buyer_address' => 'Karachi',
            'buyer_registration_type' => 'Registered',
            'buyer_email' => 'buyer'.$n.'@acme.local',
            'items' => [[
                'hs_code' => '0101.2100',
                'product_description' => 'Item '.$n,
                'rate' => '18%',
                'uom' => 'Numbers, pieces, units',
                'quantity' => 1,
                'value_sales_excluding_st' => 100,
                'sale_type' => 'Goods at standard rate (default)',
            ]],
        ], $headers);

        $create->assertCreated();
        $id = $create->json('id');

        $this->postJson("/api/invoices/{$id}/send-for-approval", [], $headers)->assertOk();

        $invoice = Invoice::query()->findOrFail($id);
        $this->postJson("/api/public/invoices/{$invoice->approval_token}/approve")->assertOk();
        $this->postJson("/api/invoices/{$id}/submit", [], $headers)->assertOk();

        return $invoice->fresh();
    }

    public function test_raast_sandbox_subscription_requires_payment_before_activation(): void
    {
        $reg = $this->registerTenant('raastco', 'owner@raastco.local');
        $token = $reg['token'];
        $headers = $this->headers('raastco', $token);

        // Raast is enabled in sandbox and listed as a checkout option.
        $summary = $this->getJson('/api/billing/summary', $headers);
        $summary->assertOk()
            ->assertJsonPath('payment_gateways.0.code', 'mock');
        $codes = collect($summary->json('payment_gateways'))->pluck('code');
        $this->assertTrue($codes->contains('raast'));

        $plan = SubscriptionPlan::query()->where('code', 'standard')->firstOrFail();

        // Starting the checkout does NOT activate the plan yet.
        $subscribe = $this->postJson('/api/billing/subscribe', [
            'subscription_plan_id' => $plan->id,
            'interval' => 'monthly',
            'gateway' => 'raast',
        ], $headers);

        $subscribe->assertStatus(202)
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('manual', true)
            ->assertJsonPath('subscription.status', 'pending')
            ->assertJsonPath('order.status', 'payment_processing');

        $orderId = $subscribe->json('order.id');
        $paymentId = $subscribe->json('payment.id');

        $tenant = Tenant::query()->where('slug', 'raastco')->firstOrFail();
        $this->assertNull($tenant->activeSubscription);

        // Complete the simulated Raast payment -> plan becomes active.
        $complete = $this->postJson("/api/billing/payments/{$paymentId}/complete", [], $headers);
        $complete->assertOk()
            ->assertJsonPath('status', 'paid')
            ->assertJsonPath('payment.status', 'paid')
            ->assertJsonPath('order.status', 'paid')
            ->assertJsonPath('subscription.status', 'active');

        $this->assertSame('standard', $tenant->fresh()->activeSubscription?->plan?->code);
        $this->assertSame('paid', $tenant->billingOrders()->findOrFail($orderId)->status);
    }

    public function test_non_sandbox_gateway_payment_cannot_be_self_completed(): void
    {
        $reg = $this->registerTenant('raastlive', 'owner@raastlive.local');
        $headers = $this->headers('raastlive', $reg['token']);

        $plan = SubscriptionPlan::query()->where('code', 'starter')->firstOrFail();

        $subscribe = $this->postJson('/api/billing/subscribe', [
            'subscription_plan_id' => $plan->id,
            'interval' => 'monthly',
            'gateway' => 'raast',
        ], $headers);

        $subscribe->assertStatus(202);
        $paymentId = $subscribe->json('payment.id');

        // The gateway leaves sandbox mode after the checkout starts.
        PaymentGateway::query()->where('code', 'raast')->update(['is_sandbox' => false]);

        $this->postJson("/api/billing/payments/{$paymentId}/complete", [], $headers)
            ->assertStatus(403);

        $tenant = Tenant::query()->where('slug', 'raastlive')->firstOrFail();
        $this->assertNull($tenant->activeSubscription);
        $this->assertSame('pending', Payment::query()->findOrFail($paymentId)->status);
    }

    public function test_plan_overage_is_capped_at_ten_rupees_per_invoice(): void
    {
        Http::fake(['*' => Http::response(['status' => 'ok', 'invoiceNumber' => 'FBR-CAP', 'invoice_date' => now()->toDateString()], 200)]);

        $reg = $this->registerTenant('capco', 'owner@capco.local');
        $token = $reg['token'];

        $tenant = Tenant::query()->where('slug', 'capco')->firstOrFail();
        $settings = (array) $tenant->settings;
        $settings['free_invoice_credits'] = 0;
        $settings['free_invoice_used'] = 0;
        $tenant->update(['settings' => $settings]);

        // Active plan whose configured overage price is ABOVE the Rs.10 cap.
        $plan = SubscriptionPlan::query()->where('code', 'standard')->firstOrFail();
        $subscription = TenantSubscription::query()->create([
            'tenant_id' => $tenant->id,
            'subscription_plan_id' => $plan->id,
            'status' => TenantSubscription::STATUS_ACTIVE,
            'billing_interval' => 'monthly',
            'price' => (float) $plan->price,
            'currency' => 'PKR',
            'invoice_limit' => 0,
            'overage_allowed' => true,
            'overage_price' => 12,
            'grace_period_hours' => null,
            'auto_renew' => true,
        ]);
        $this->assertSame('active', $tenant->fresh()->activeSubscription?->status);

        $this->configureSandboxIntegration('capco');

        $invoice = $this->submitOneInvoice('capco', $token, 1);

        $event = $invoice->usageEvents()->first();
        $this->assertSame('overage', $invoice->usage_source_type);
        $this->assertSame('overage', $event->source_type);
        $this->assertEquals(10.0, (float) $event->unit_price);
        $this->assertEquals(10.0, (float) $event->amount);

        $entry = $tenant->ledgerEntries()
            ->where('entry_type', BillingLedgerEntry::ENTRY_OVERAGE_CHARGE)
            ->first();
        $this->assertNotNull($entry);
        $this->assertEquals(10.0, (float) $entry->amount);

        $this->assertEquals(10.0, app(BillingService::class)->outstandingBalance($tenant->fresh()));
    }

    public function test_pay_as_you_go_invoice_rate_is_capped_at_ten_rupees(): void
    {
        Http::fake(['*' => Http::response(['status' => 'ok', 'invoiceNumber' => 'FBR-PAYG', 'invoice_date' => now()->toDateString()], 200)]);

        // Platform per-invoice price is above the Rs.10 cap.
        \App\Models\PlatformSetting::set('billing', 'default_invoice_price', 25);
        \App\Models\PlatformSetting::set('billing', 'max_invoice_price', 10);

        $reg = $this->registerTenant('paygco', 'owner@paygco.local');
        $token = $reg['token'];

        $tenant = Tenant::query()->where('slug', 'paygco')->firstOrFail();
        $settings = (array) $tenant->settings;
        $settings['free_invoice_credits'] = 0;
        $settings['free_invoice_used'] = 0;
        $tenant->update(['settings' => $settings]);

        $this->configureSandboxIntegration('paygco');

        $invoice = $this->submitOneInvoice('paygco', $token, 2);

        $this->assertSame('overage', $invoice->usage_source_type);
        $this->assertEquals(10.0, (float) $invoice->usageEvents()->first()->unit_price);
        $this->assertEquals(10.0, app(BillingService::class)->outstandingBalance($tenant->fresh()));
    }
}
