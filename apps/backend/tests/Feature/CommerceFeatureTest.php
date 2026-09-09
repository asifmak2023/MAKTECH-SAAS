<?php

namespace Tests\Feature;

use App\Models\BillingLedgerEntry;
use App\Models\FbrIntegration;
use App\Models\Invoice;
use App\Models\Tenant;
use App\Models\UsagePackage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class CommerceFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();

        $this->seed(\Database\Seeders\PlatformBootstrapSeeder::class);
        $this->seed(\Database\Seeders\CatalogSeeder::class);
    }

    protected function registerTenant(): array
    {
        $response = $this->postJson('/api/auth/register', [
            'tenant_name' => 'Commerce Co',
            'tenant_slug' => 'commerce-co',
            'name' => 'Owner',
            'email' => 'owner@commerce.local',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'seller_ntn_cnic' => '1234567',
            'seller_business_name' => 'Commerce Co',
            'seller_province' => 'Sindh',
            'seller_address' => 'Karachi',
        ]);

        $response->assertCreated();

        return [
            'token' => $response->json('token'),
            'tenant' => $response->json('tenant'),
        ];
    }

    protected function headers(string $token): array
    {
        return [
            'Authorization' => 'Bearer '.$token,
            'X-Tenant' => 'commerce-co',
        ];
    }

    protected function configureSandboxIntegration(): void
    {
        $tenant = Tenant::query()->where('slug', 'commerce-co')->firstOrFail();

        $row = FbrIntegration::query()
            ->where('tenant_id', $tenant->id)
            ->where('integrator', 'pral')
            ->where('mode', 'sandbox')
            ->firstOrFail();

        $row->setConfigArray(['base_url' => 'https://pral.test', 'token' => 'demo-token'])
            ->fill(['status' => 'configured'])
            ->save();
    }

    public function test_register_sees_free_allowance_and_can_buy_package_with_mock_gateway(): void
    {
        $reg = $this->registerTenant();
        $token = $reg['token'];

        $this->assertSame('active', $reg['tenant']['status']);
        $this->assertSame(5, $reg['tenant']['settings']['free_invoice_credits']);

        $package = UsagePackage::query()->where('code', 'pack_25')->firstOrFail();

        $buy = $this->postJson('/api/billing/packages', [
            'usage_package_id' => $package->id,
            'gateway' => 'mock',
        ], $this->headers($token));

        $buy->assertOk()
            ->assertJsonPath('status', 'paid')
            ->assertJsonPath('order.status', 'paid');

        $tenant = Tenant::query()->where('slug', 'commerce-co')->firstOrFail();

        $this->assertSame(1, $tenant->packagePurchases()->count());
        $this->assertSame(25, $tenant->activePackagePurchases()->sum('purchased_invoices'));
        $this->assertSame(1, $tenant->billingInvoices()->count());
        $this->assertTrue($tenant->billingInvoices()->first()->status === 'paid');

        // One charge entry and one payment entry hit the immutable ledger.
        $this->assertSame(1, $tenant->ledgerEntries()->where('reference_type', 'billing_order')->count());
        $this->assertSame(1, $tenant->ledgerEntries()->where('reference_type', 'payment')->count());
        $this->assertSame(2, $tenant->ledgerEntries()->count());

        $summary = $this->getJson('/api/billing/summary', $this->headers($token));
        $summary->assertOk()
            ->assertJsonPath('usage.packages.0.remaining', 25)
            ->assertJsonPath('outstanding_balance', 0);
    }

    public function test_subscription_checkout_activates_plan_and_replaces_old_one(): void
    {
        $reg = $this->registerTenant();
        $token = $reg['token'];

        $plan = \App\Models\SubscriptionPlan::query()->where('code', 'standard')->firstOrFail();

        $subscribe = $this->postJson('/api/billing/subscribe', [
            'subscription_plan_id' => $plan->id,
            'interval' => 'monthly',
            'gateway' => 'mock',
        ], $this->headers($token));

        $subscribe->assertOk()
            ->assertJsonPath('status', 'paid')
            ->assertJsonPath('subscription.status', 'active');

        $tenant = Tenant::query()->where('slug', 'commerce-co')->firstOrFail();

        $this->assertSame('standard', $tenant->activeSubscription?->plan?->code);
        $this->assertSame('active', $tenant->activeSubscription?->status);

        // Change to premium: old plan must be cancelled after the new one is paid.
        $premium = \App\Models\SubscriptionPlan::query()->where('code', 'premium')->firstOrFail();

        $upgrade = $this->postJson('/api/billing/subscribe', [
            'subscription_plan_id' => $premium->id,
            'interval' => 'monthly',
            'gateway' => 'mock',
        ], $this->headers($token));

        $upgrade->assertOk()->assertJsonPath('status', 'paid');

        $tenant->refresh();
        $this->assertSame('premium', $tenant->activeSubscription?->plan?->code);
        $this->assertSame(1, $tenant->subscriptions()->where('status', 'active')->count());
    }

    public function test_submission_consumes_package_allowance_and_is_charged_once(): void
    {
        Http::fake(['*' => Http::response(['status' => 'ok', 'invoiceNumber' => 'FBR-'.strtoupper(uniqid())], 200)]);

        $reg = $this->registerTenant();
        $token = $reg['token'];
        $headers = $this->headers($token);

        $package = UsagePackage::query()->where('code', 'pack_25')->firstOrFail();
        $this->postJson('/api/billing/packages', ['usage_package_id' => $package->id, 'gateway' => 'mock'], $headers)->assertOk();

        $this->configureSandboxIntegration();

        $create = $this->postJson('/api/invoices', [
            'invoice_type' => 'Sale Invoice',
            'invoice_date' => now()->toDateString(),
            'buyer_business_name' => 'Acme Buyer',
            'buyer_province' => 'Sindh',
            'buyer_address' => 'Karachi',
            'buyer_registration_type' => 'Registered',
            'buyer_email' => 'buyer@acme.local',
            'items' => [[
                'hs_code' => '0101.2100',
                'product_description' => 'Widget',
                'rate' => '18%',
                'uom' => 'Numbers, pieces, units',
                'quantity' => 2,
                'value_sales_excluding_st' => 500,
                'sale_type' => 'Goods at standard rate (default)',
            ]],
        ], $headers);

        $create->assertCreated();
        $id = $create->json('id');

        $this->postJson("/api/invoices/{$id}/send-for-approval", [], $headers)->assertOk();

        $tokenRow = Invoice::query()->findOrFail($id);

        $this->postJson("/api/public/invoices/{$tokenRow->approval_token}/approve")->assertOk();
        $this->postJson("/api/invoices/{$id}/submit", [], $headers)->assertOk();

        $invoice = Invoice::query()->with(['usageEvents', 'submissionHistory'])->findOrFail($id);

        $this->assertSame(Invoice::STATUS_SUBMITTED, $invoice->status);
        $this->assertSame('package', $invoice->usage_source_type);
        $this->assertCount(1, $invoice->usageEvents);
        $this->assertGreaterThanOrEqual(1, $invoice->submissionHistory()->count());

        $purchase = $invoice->tenant->packagePurchases()->firstOrFail();
        $this->assertSame(1, (int) $purchase->used_invoices);

        // Charging again on the same invoice is a no-op (idempotent).
        $result = app(\App\Services\EntitlementService::class)->chargeForInvoice($invoice);
        $this->assertTrue($result['already_charged']);
        $this->assertSame(1, (int) $purchase->fresh()->used_invoices);
    }

    public function test_free_credits_then_overage_then_settlement(): void
    {
        Http::fake(['*' => Http::response(['status' => 'ok', 'invoiceNumber' => 'FBR-OVER', 'invoice_date' => now()->toDateString()], 200)]);

        $reg = $this->registerTenant();
        $token = $reg['token'];
        $headers = $this->headers($token);

        $this->configureSandboxIntegration();

        $submitCount = 0;

        for ($i = 0; $i < 6; $i++) {
            $create = $this->postJson('/api/invoices', [
                'invoice_type' => 'Sale Invoice',
                'invoice_date' => now()->toDateString(),
                'buyer_business_name' => 'Buyer '.$i,
                'buyer_province' => 'Sindh',
                'buyer_address' => 'Karachi',
                'buyer_registration_type' => 'Registered',
                'buyer_email' => 'buyer'.$i.'@acme.local',
                'items' => [[
                    'hs_code' => '0101.2100',
                    'product_description' => 'Item '.$i,
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

            $submitCount++;
        }

        $tenant = Tenant::query()->where('slug', 'commerce-co')->firstOrFail();
        $this->assertSame(0, (int) $tenant->settings['free_invoice_credits']);
        $this->assertSame(5, (int) $tenant->settings['free_invoice_used']);

        // Sixth invoice went to overage and created an unbilled ledger row.
        $overage = $tenant->ledgerEntries()->where('entry_type', BillingLedgerEntry::ENTRY_OVERAGE_CHARGE)->first();
        $this->assertNotNull($overage);
        $this->assertSame('unbilled', $overage->meta['state']);

        $balance = $this->getJson('/api/billing/summary', $headers);
        $balance->assertOk();
        $this->assertEquals(10.0, (float) $balance->json('outstanding_balance'));

        // Settle the overage through the mock gateway.
        $settle = $this->postJson('/api/billing/overage/settle', ['gateway' => 'mock'], $headers);
        $settle->assertOk()->assertJsonPath('status', 'paid');

        $tenant->refresh();
        $this->assertSame(0.0, app(\App\Services\BillingService::class)->outstandingBalance($tenant));
    }
}
