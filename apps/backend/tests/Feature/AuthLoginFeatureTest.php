<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\PlatformBootstrapSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class AuthLoginFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Mail::fake();
        $this->seed(PlatformBootstrapSeeder::class);
    }

    protected function api(string $method, string $uri, array $payload = [], array $headers = []): TestResponse
    {
        app('auth')->forgetGuards();

        return $this->postJson($uri, $payload, $headers);
    }

    protected function register(string $slug, string $email): TestResponse
    {
        return $this->api('POST', '/api/auth/register', [
            'tenant_name' => 'Login Co',
            'tenant_slug' => $slug,
            'name' => 'Login Owner',
            'email' => $email,
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'seller_ntn_cnic' => '1122334',
            'seller_business_name' => 'Login Co',
            'seller_province' => 'Punjab',
            'seller_address' => 'Lahore',
        ]);
    }

    public function test_platform_admin_can_login_with_username(): void
    {
        $admin = User::withoutGlobalScopes()->where('email', 'admin@saas.local')->firstOrFail();

        $this->assertNotNull($admin->username);

        $response = $this->api('POST', '/api/auth/login', [
            'username' => $admin->username,
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('is_platform_admin', true)
            ->assertJsonPath('tenant', null);
    }

    public function test_owner_logs_in_with_workspace_username(): void
    {
        $registered = $this->register('loginco', 'owner@login.local');

        $registered->assertCreated()->assertJsonPath('user.username', 'loginco');

        $response = $this->api('POST', '/api/auth/login', [
            'username' => 'loginco',
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonPath('is_platform_admin', false)
            ->assertJsonPath('tenant.slug', 'loginco')
            ->assertJsonPath('user.username', 'loginco');
    }

    public function test_username_login_fails_when_no_matching_account(): void
    {
        $this->api('POST', '/api/auth/login', [
            'username' => 'nobody',
            'password' => 'password123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('username');
    }

    public function test_duplicate_email_registration_is_blocked(): void
    {
        $this->register('first-co', 'dupe@login.local')->assertCreated();

        $duplicate = $this->register('second-co', 'dupe@login.local');

        $duplicate->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->assertDatabaseMissing('tenants', ['slug' => 'second-co']);
    }

    public function test_email_login_still_supported_for_legacy_clients(): void
    {
        $this->register('legacy-co', 'owner@legacy.local')->assertCreated();

        $this->api('POST', '/api/auth/login', [
            'email' => 'owner@legacy.local',
            'password' => 'password123',
            'tenant' => 'legacy-co',
        ])->assertOk()
            ->assertJsonPath('tenant.slug', 'legacy-co');
    }
}
