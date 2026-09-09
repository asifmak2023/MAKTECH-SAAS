<?php

namespace Tests\Feature;

use App\Models\BillingLedgerEntry;
use App\Models\BillingOrder;
use App\Models\Payment;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SubscriptionLifecycleFeatureTest extends TestCase
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

    protected function activateSubscription(string $slug, string $token, string $planCode = 'standard'): TenantSubscription
    {
        $plan = SubscriptionPlan::query()->where('code', $planCode)->firstOrFail();

        $this->postJson('/api/billing/subscribe', [
            'subscription_plan_id' => $plan->id,
            'interval' => 'monthly',
            'gateway' => 'mock',
        ], $this->headers($slug, $token))->assertOk()->assertJsonPath('status', 'paid');

        $subscription = TenantSubscription::query()
            ->where('status', TenantSubscription::STATUS_ACTIVE)
            ->latest('id')
            ->firstOrFail();

        return $subscription;
    }

    protected function dueTenant(string $slug): Tenant
    {
        return Tenant::query()->where('slug', $slug)->firstOrFail();
    }

    public function test_due_subscription_auto_renews_when_charge_clears(): void
    {
        $reg = $this->registerTenant('renewco', 'owner@renewco.local');
        $sub = $this->activateSubscription('renewco', $reg['token']);
        $tenant = $this->dueTenant('renewco');

        $sub->update([
            'current_period_end' => now()->subDay(),
            'next_billing_date' => now()->subDay(),
            'auto_renew' => true,
        ]);

        $this->artisan('saas:maintain', ['--only' => ['renewals']])->assertExitCode(0);

        $sub->refresh();
        $this->assertSame(TenantSubscription::STATUS_ACTIVE, $sub->status);
        $this->assertTrue($sub->current_period_end->gt(now()->addDays(20)));
        $this->assertTrue($sub->next_billing_date->gt(now()));
        $this->assertSame(0, (int) $sub->used_invoices);

        // Two paid subscription orders/invoices: the original and the renewal.
        $this->assertSame(2, $tenant->billingOrders()->where('order_type', BillingOrder::TYPE_SUBSCRIPTION)->where('status', 'paid')->count());
        $this->assertSame(2, $tenant->billingInvoices()->where('status', 'paid')->count());
        $this->assertSame(2, $tenant->ledgerEntries()->where('entry_type', BillingLedgerEntry::ENTRY_SUBSCRIPTION_CHARGE)->count());

        $this->assertSame(Tenant::STATUS_ACTIVE, $tenant->fresh()->status);
    }

    public function test_manual_gateway_renewal_enters_grace_then_revives_on_confirmation(): void
    {
        \App\Models\PaymentGateway::query()->where('code', 'bank_transfer')->update(['is_enabled' => true]);

        $reg = $this->registerTenant('manualco', 'owner@manualco.local');
        $sub = $this->activateSubscription('manualco', $reg['token']);
        $tenant = $this->dueTenant('manualco');

        $tenant->update(['settings' => array_merge((array) $tenant->settings, ['default_gateway' => 'bank_transfer'])]);

        $sub->update([
            'current_period_end' => now()->subDay(),
            'next_billing_date' => now()->subDay(),
            'auto_renew' => true,
        ]);

        $this->artisan('saas:maintain', ['--only' => ['renewals']])->assertExitCode(0);

        // Renewal was NOT applied: subscription moved to grace and stays billable.
        $sub->refresh();
        $this->assertSame(TenantSubscription::STATUS_GRACE_PERIOD, $sub->status);
        $this->assertNotNull($sub->grace_ends_at);
        $this->assertNull($sub->next_billing_date);

        $tenant->refresh();
        $this->assertSame(Tenant::STATUS_GRACE_PERIOD, $tenant->status);
        $this->assertTrue($tenant->canBillInvoices());

        // The renewal order sits open waiting for the bank transfer to clear.
        $renewal = $tenant->billingOrders()
            ->where('order_type', BillingOrder::TYPE_SUBSCRIPTION)
            ->where('id', '>', $tenant->billingOrders()->where('order_type', BillingOrder::TYPE_SUBSCRIPTION)->min('id'))
            ->latest('id')
            ->firstOrFail();

        $this->assertSame(BillingOrder::STATUS_PAYMENT_PROCESSING, $renewal->status);
        $payment = $renewal->payments()->where('status', Payment::STATUS_PENDING)->firstOrFail();

        // A verified bank transfer (admin confirmation) revives the subscription.
        app(\App\Services\Payments\PaymentService::class)->confirmPayment($payment);

        $sub->refresh();
        $this->assertSame(TenantSubscription::STATUS_ACTIVE, $sub->status);
        $this->assertNull($sub->grace_ends_at);
        $this->assertTrue($sub->current_period_end->gt(now()->addDays(20)));

        $this->assertSame('paid', $renewal->fresh()->status);
        $this->assertSame(Tenant::STATUS_ACTIVE, $tenant->fresh()->status);
    }

    public function test_failed_renewal_suspends_tenant_after_grace_expires(): void
    {
        $reg = $this->registerTenant('lateco', 'owner@lateco.local');
        $sub = $this->activateSubscription('lateco', $reg['token']);
        $tenant = $this->dueTenant('lateco');

        // Force the renewal to fail outright (unknown gateway throws).
        $tenant->update(['settings' => array_merge((array) $tenant->settings, ['default_gateway' => 'not_configured_gw'])]);

        $sub->update([
            'current_period_end' => now()->subDay(),
            'next_billing_date' => now()->subDay(),
            'auto_renew' => true,
        ]);

        $this->artisan('saas:maintain', ['--only' => ['renewals']])->assertExitCode(0);

        $sub->refresh();
        $this->assertSame(TenantSubscription::STATUS_GRACE_PERIOD, $sub->status);

        // Grace window elapses without payment.
        $sub->update(['grace_ends_at' => now()->subHour()]);

        $this->artisan('saas:maintain', ['--only' => ['grace']])->assertExitCode(0);

        $sub->refresh();
        $this->assertSame(TenantSubscription::STATUS_SUSPENDED, $sub->status);
        $this->assertNotNull($sub->suspended_at);

        $tenant->refresh();
        $this->assertSame(Tenant::STATUS_SUSPENDED, $tenant->status);
        $this->assertFalse($tenant->is_active);
        $this->assertFalse($tenant->canBillInvoices());
    }

    public function test_overage_is_aggregated_and_collectable(): void
    {
        $reg = $this->registerTenant('overco', 'owner@overco.local');
        $tenant = $this->dueTenant('overco');

        $entry = BillingLedgerEntry::query()->create([
            'tenant_id' => $tenant->id,
            'entry_type' => BillingLedgerEntry::ENTRY_OVERAGE_CHARGE,
            'reference_type' => 'invoice',
            'reference_id' => 1,
            'quantity' => 1,
            'unit_price' => 10,
            'amount' => 10,
            'currency' => 'PKR',
            'description' => 'Invoice #1 usage beyond allowance',
            'meta' => ['state' => 'unbilled', 'invoice_number' => 'INV-DEMO-001'],
        ]);

        $this->assertSame(10.0, app(\App\Services\BillingService::class)->outstandingBalance($tenant));

        $this->artisan('saas:maintain', ['--only' => ['overage']])->assertExitCode(0);

        $order = $tenant->billingOrders()->where('order_type', BillingOrder::TYPE_OVERAGE)->firstOrFail();
        $this->assertSame(BillingOrder::STATUS_PENDING, $order->status);
        $this->assertEquals(10.0, (float) $order->total_amount);

        // Ledger row flips from unbilled -> billed and is not mutated/deleted.
        $this->assertSame('billed', $entry->fresh()->meta['state']);
        $this->assertSame($order->id, $entry->fresh()->meta['billing_order_id']);

        $checkout = app(\App\Services\Payments\PaymentService::class)->checkout($order, 'mock');
        $this->assertSame('paid', $checkout['status']);
        $this->assertSame('paid', $order->fresh()->status);
        $this->assertSame(0.0, app(\App\Services\BillingService::class)->outstandingBalance($tenant));
    }

    public function test_stale_pending_and_ended_trials_are_cleaned_up(): void
    {
        $reg = $this->registerTenant('staleco', 'owner@staleco.local');
        $tenant = $this->dueTenant('staleco');

        // Old, never-paid pending subscription should be cancelled.
        $stale = TenantSubscription::query()->create([
            'tenant_id' => $tenant->id,
            'subscription_plan_id' => SubscriptionPlan::query()->where('code', 'starter')->value('id'),
            'status' => TenantSubscription::STATUS_PENDING,
            'billing_interval' => 'monthly',
            'price' => 500,
            'currency' => 'PKR',
            'invoice_limit' => 100,
            'auto_renew' => true,
        ]);
        TenantSubscription::query()->whereKey($stale->id)->update(['created_at' => now()->subHours(50)]);

        $this->artisan('saas:maintain', ['--only' => ['stale']])->assertExitCode(0);
        $this->assertSame(TenantSubscription::STATUS_CANCELLED, $stale->fresh()->status);

        // A trial tenant whose window passed moves to active pay-as-you-go.
        $tenant->update(['status' => Tenant::STATUS_TRIAL, 'trial_ends_at' => now()->subDay()]);

        $this->artisan('saas:maintain', ['--only' => ['trials']])->assertExitCode(0);
        $this->assertSame(Tenant::STATUS_ACTIVE, $tenant->fresh()->status);
    }
}
