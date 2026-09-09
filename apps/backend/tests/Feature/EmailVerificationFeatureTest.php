<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\VerifyEmailAddress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class EmailVerificationFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['saas.auth.require_email_verification' => true]);
        Notification::fake();
        $this->seed(\Database\Seeders\PlatformBootstrapSeeder::class);
    }

    protected function register(): array
    {
        $response = $this->postJson('/api/auth/register', [
            'tenant_name' => 'Verify Co',
            'tenant_slug' => 'verify-co',
            'name' => 'Owner',
            'email' => 'owner@verify.local',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'seller_ntn_cnic' => '1234567',
            'seller_business_name' => 'Verify Co',
            'seller_province' => 'Sindh',
            'seller_address' => 'Karachi',
        ]);

        $response->assertCreated();

        return [
            'token' => $response->json('token'),
            'tenant' => $response->json('tenant'),
            'user' => $response->json('user'),
        ];
    }

    protected function headers(string $token): array
    {
        return [
            'Authorization' => 'Bearer '.$token,
            'X-Tenant' => 'verify-co',
        ];
    }

    public function test_register_sends_verification_email_and_blocks_seller_api(): void
    {
        $reg = $this->register();
        $token = $reg['token'];

        $this->assertNull($reg['user']['email_verified_at']);

        $owner = User::withoutGlobalScopes()->where('email', 'owner@verify.local')->firstOrFail();
        Notification::assertSentTo($owner, VerifyEmailAddress::class, function (VerifyEmailAddress $n) use ($owner) {
            $mail = $n->toMail($owner);

            return str_contains($mail->render()->toHtml(), 'images/logo.png');
        });

        $this->getJson('/api/auth/me', $this->headers($token))
            ->assertOk()
            ->assertJsonPath('email_verified', false)
            ->assertJsonPath('verification_required', true);

        $this->getJson('/api/invoices', $this->headers($token))
            ->assertForbidden()
            ->assertJsonPath('code', 'email_unverified');
    }

    public function test_signed_link_verifies_email_and_unlocks_seller_api(): void
    {
        $reg = $this->register();
        $token = $reg['token'];
        $owner = User::withoutGlobalScopes()->where('email', 'owner@verify.local')->firstOrFail();

        $payload = VerifyEmailAddress::payload($owner);

        $this->postJson('/api/auth/email/verify', $payload)
            ->assertOk()
            ->assertJsonPath('email_verified', true);

        $this->assertTrue($owner->fresh()->hasVerifiedEmail());

        $this->getJson('/api/invoices', $this->headers($token))->assertOk();
    }

    public function test_invalid_and_expired_links_are_rejected(): void
    {
        $this->register();
        $owner = User::withoutGlobalScopes()->where('email', 'owner@verify.local')->firstOrFail();
        $payload = VerifyEmailAddress::payload($owner);

        $this->postJson('/api/auth/email/verify', array_merge($payload, ['signature' => 'deadbeef']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('signature');

        $expired = VerifyEmailAddress::payload($owner, now()->subMinute()->getTimestamp());
        $this->postJson('/api/auth/email/verify', $expired)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('expires');

        $this->assertFalse($owner->fresh()->hasVerifiedEmail());
    }

    public function test_login_and_resend_for_unverified_seller(): void
    {
        $this->register();

        $login = $this->postJson('/api/auth/login', [
            'email' => 'owner@verify.local',
            'password' => 'password123',
            'tenant' => 'verify-co',
        ]);

        $login->assertOk()
            ->assertJsonPath('email_verified', false)
            ->assertJsonPath('verification_required', true);

        $token = $login->json('token');

        Notification::fake();

        $this->postJson('/api/auth/email/resend', [], $this->headers($token))
            ->assertOk()
            ->assertJsonPath('email_verified', false);

        $owner = User::withoutGlobalScopes()->where('email', 'owner@verify.local')->firstOrFail();
        Notification::assertSentTo($owner, VerifyEmailAddress::class, function (VerifyEmailAddress $n) use ($owner) {
            $mail = $n->toMail($owner);

            return str_contains($mail->render()->toHtml(), 'images/logo.png');
        });
    }

    public function test_register_ignores_stale_tenant_header(): void
    {
        $this->register();

        $second = $this->postJson('/api/auth/register', [
            'tenant_name' => 'Second Co',
            'tenant_slug' => 'second-co',
            'name' => 'Second Owner',
            'email' => 'owner@second.local',
            'password' => 'password12',
            'password_confirmation' => 'password12',
            'seller_ntn_cnic' => '7654321',
            'seller_business_name' => 'Second Co',
            'seller_province' => 'Punjab',
            'seller_address' => 'Lahore',
        ], [
            'X-Tenant' => 'verify-co',
        ]);

        $second->assertCreated()
            ->assertJsonPath('tenant.slug', 'second-co')
            ->assertJsonPath('user.email', 'owner@second.local');
    }

    public function test_register_rejects_password_outside_eight_to_twelve(): void
    {
        $this->postJson('/api/auth/register', [
            'tenant_name' => 'Short Co',
            'name' => 'Owner',
            'email' => 'short@co.local',
            'password' => 'short7s',
        ])->assertUnprocessable();

        $this->postJson('/api/auth/register', [
            'tenant_name' => 'Long Co',
            'name' => 'Owner',
            'email' => 'long@co.local',
            'password' => 'password12345',
        ])->assertUnprocessable();
    }

    public function test_register_rejects_password_confirmation_mismatch(): void
    {
        $this->postJson('/api/auth/register', [
            'tenant_name' => 'Mismatch Co',
            'name' => 'Owner',
            'email' => 'mismatch@co.local',
            'password' => 'password123',
            'password_confirmation' => 'password456',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->assertDatabaseMissing('users', ['email' => 'mismatch@co.local']);
    }
}
