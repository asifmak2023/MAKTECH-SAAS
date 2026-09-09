<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\TenantService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Tests\TestCase;

class GoogleAuthFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.google.enabled', true);
        config()->set('services.google.client_id', 'test-client');
        config()->set('services.google.client_secret', 'test-secret');
        config()->set('saas.web.app_url', 'http://localhost:3000');
        config()->set('saas.auth.require_email_verification', true);
    }

    public function test_status_reflects_configuration(): void
    {
        config()->set('services.google.enabled', false);

        $this->getJson('/api/auth/google/status')
            ->assertOk()
            ->assertJson(['enabled' => false]);

        config()->set('services.google.enabled', true);

        $this->getJson('/api/auth/google/status')
            ->assertOk()
            ->assertJson(['enabled' => true]);
    }

    public function test_redirect_blocked_when_unconfigured(): void
    {
        config()->set('services.google.enabled', false);

        $this->getJson('/api/auth/google/redirect')->assertStatus(503);
    }

    public function test_new_google_email_auto_creates_tenant_and_signs_in(): void
    {
        $google = (new SocialiteUser)->map([
            'id' => 'google-test-id-1',
            'name' => 'Google Tester',
            'email' => 'google.auto@example.com',
        ])->setToken('access-token');

        Socialite::fake('google', $google);

        $response = $this->get('/api/auth/google/callback');

        $response->assertRedirect();
        $location = (string) $response->headers->get('Location');

        $this->assertStringContainsString('http://localhost:3000/auth/google/callback?', $location);
        $this->assertStringContainsString('token=', $location);
        $this->assertStringContainsString('account_kind=seller', $location);

        $user = User::withoutGlobalScopes()->where('email', 'google.auto@example.com')->first();

        $this->assertNotNull($user);
        $this->assertNotNull($user->tenant_id);
        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertNotNull($user->tenant);
    }

    public function test_existing_email_signs_in_and_marks_verified(): void
    {
        $tenants = app(TenantService::class);
        $tenant = $tenants->createByAdmin([
            'tenant_name' => 'Existing Co',
            '_admin_created' => true,
        ], [
            'name' => 'Existing Tester',
            'email' => 'google.existing@example.com',
        ]);

        $user = User::withoutGlobalScopes()->where('email', 'google.existing@example.com')->first();
        $user->forceFill(['email_verified_at' => null])->save();

        $google = (new SocialiteUser)->map([
            'id' => 'google-test-id-2',
            'name' => 'Existing Tester',
            'email' => 'google.existing@example.com',
        ])->setToken('access-token');

        Socialite::fake('google', $google);

        $response = $this->get('/api/auth/google/callback');

        $response->assertRedirect();
        $location = (string) $response->headers->get('Location');

        $this->assertStringContainsString('http://localhost:3000/auth/google/callback?', $location);
        $this->assertStringContainsString('token=', $location);
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }
}
