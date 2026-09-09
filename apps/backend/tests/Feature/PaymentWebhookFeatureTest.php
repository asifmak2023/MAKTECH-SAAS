<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PaymentWebhookFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();

        $this->seed(\Database\Seeders\PlatformBootstrapSeeder::class);
        $this->seed(\Database\Seeders\CatalogSeeder::class);

        config(['saas.web.app_url' => 'https://pay.example.test']);
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

    protected function subscribeWithRaast(string $slug, string $token): array
    {
        $plan = SubscriptionPlan::query()->where('code', 'standard')->firstOrFail();

        $subscribe = $this->postJson('/api/billing/subscribe', [
            'subscription_plan_id' => $plan->id,
            'interval' => 'monthly',
            'gateway' => 'raast',
        ], $this->headers($slug, $token));

        $subscribe->assertStatus(202);

        return [
            'payment_id' => $subscribe->json('payment.id'),
            'reference' => $subscribe->json('payment.provider_reference'),
            'order_id' => $subscribe->json('order.id'),
        ];
    }

    public function test_checkout_exposes_public_return_and_webhook_urls(): void
    {
        $reg = $this->registerTenant('urlco', 'owner@urlco.local');

        $subscribe = $this->postJson('/api/billing/subscribe', [
            'subscription_plan_id' => SubscriptionPlan::query()->where('code', 'standard')->firstOrFail()->id,
            'interval' => 'monthly',
            'gateway' => 'raast',
        ], $this->headers('urlco', $reg['token']));

        $subscribe->assertStatus(202)
            ->assertJsonPath('urls.return_url', 'https://pay.example.test/billing/payments/return')
            ->assertJsonPath('urls.cancel_url', 'https://pay.example.test/billing')
            ->assertJsonPath('urls.webhook_url', 'https://pay.example.test/api/webhooks/raast');
    }

    public function test_sandbox_raast_webhook_settles_pending_payment(): void
    {
        $reg = $this->registerTenant('webco', 'owner@webco.local');
        $slug = 'webco';

        $started = $this->subscribeWithRaast($slug, $reg['token']);

        $webhook = $this->postJson('/api/webhooks/raast', [
            'transaction_id' => $started['reference'],
        ]);

        $webhook->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('handled', true);

        $payment = Payment::query()->findOrFail($started['payment_id']);
        $this->assertSame('paid', $payment->status);

        $order = $payment->order;
        $this->assertSame('paid', $order->status);

        $tenant = Tenant::query()->where('slug', $slug)->firstOrFail();
        $this->assertSame('active', $tenant->fresh()->activeSubscription?->status);
    }

    public function test_live_raast_webhook_rejects_unverified_signature(): void
    {
        $reg = $this->registerTenant('weblive', 'owner@weblive.local');
        $started = $this->subscribeWithRaast('weblive', $reg['token']);

        // The gateway leaves sandbox mode after checkout starts.
        PaymentGateway::query()->where('code', 'raast')->update(['is_sandbox' => false]);

        $this->postJson('/api/webhooks/raast', [
            'transaction_id' => $started['reference'],
        ])->assertStatus(403);

        $this->assertSame('pending', Payment::query()->findOrFail($started['payment_id'])->status);
    }

    public function test_webhook_rejects_unknown_gateway(): void
    {
        $this->postJson('/api/webhooks/not-a-gateway', ['transaction_id' => 'X'])->assertStatus(422);
    }

    public function test_webhook_with_no_matching_pending_payment_returns_404(): void
    {
        $this->postJson('/api/webhooks/raast', ['transaction_id' => 'UNKNOWN_REF'])->assertStatus(404);
    }
}
