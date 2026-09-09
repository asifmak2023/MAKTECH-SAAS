<?php

namespace Tests\Feature;

use App\Models\FbrIntegration;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class FbrTokenScopeFeatureTest extends TestCase
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
        app('auth')->forgetGuards();

        return match (strtoupper($method)) {
            'POST' => $this->postJson($uri, $payload, $headers),
            'PUT' => $this->putJson($uri, $payload, $headers),
            default => $this->getJson($uri, $headers),
        };
    }

    protected function registerTenant(string $slug, string $email): array
    {
        $response = $this->api('POST', '/api/auth/register', [], [
            'tenant_name' => ucfirst($slug).' Co',
            'tenant_slug' => $slug,
            'name' => 'Owner '.$slug,
            'email' => $email,
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'seller_ntn_cnic' => '8885801',
            'seller_business_name' => strtoupper($slug).' TRADERS',
            'seller_province' => 'Sindh',
            'seller_address' => 'Karachi',
        ]);

        $response->assertCreated();

        return ['token' => $response->json('token'), 'tenant' => $response->json('tenant')];
    }

    protected function headers(string $token, string $slug): array
    {
        return ['Authorization' => 'Bearer '.$token, 'X-Tenant' => $slug];
    }

    protected function adminHeaders(): array
    {
        $login = $this->api('POST', '/api/auth/login', [], [
            'email' => 'admin@saas.local',
            'password' => 'password',
        ])->assertOk();

        return ['Authorization' => 'Bearer '.$login->json('token')];
    }

    protected function fbrRow(Tenant $tenant, string $mode): ?FbrIntegration
    {
        return FbrIntegration::query()
            ->where('tenant_id', $tenant->id)
            ->where('integrator', 'pral')
            ->where('mode', $mode)
            ->first();
    }

    public function test_sandbox_token_is_bound_to_one_account(): void
    {
        $a = $this->registerTenant('acme', 'owner-a@example.test');
        $b = $this->registerTenant('globex', 'owner-b@example.test');

        $this->api('PUT', '/api/settings/fbr/sandbox', $this->headers($a['token'], 'acme'), [
            'token' => 'sb-token-shared',
            'base_url' => 'https://gw.fbr.gov.pk',
        ])->assertOk();

        $tenantA = Tenant::where('slug', 'acme')->first();
        $tenantB = Tenant::where('slug', 'globex')->first();

        $this->assertSame(FbrIntegration::fingerprintFor('sb-token-shared'), $this->fbrRow($tenantA, 'sandbox')->token_fingerprint);

        $rejected = $this->api('PUT', '/api/settings/fbr/sandbox', $this->headers($b['token'], 'globex'), [
            'token' => 'sb-token-shared',
            'base_url' => 'https://gw.fbr.gov.pk',
        ])->assertStatus(422)
            ->json();

        $this->assertStringContainsString('already registered to another account', $rejected['message']);

        $this->assertNull($this->fbrRow($tenantB, 'sandbox')?->token_fingerprint);
        $this->assertEmpty($this->fbrRow($tenantB, 'sandbox')?->configArray()['token'] ?? null);
    }

    public function test_production_token_is_bound_to_one_account(): void
    {
        $a = $this->registerTenant('acme', 'owner-a@example.test');
        $b = $this->registerTenant('globex', 'owner-b@example.test');

        $this->api('PUT', '/api/settings/fbr/production', $this->headers($a['token'], 'acme'), [
            'token' => 'prod-token-shared',
            'base_url' => 'https://gw.fbr.gov.pk',
        ])->assertOk();

        $tenantB = Tenant::where('slug', 'globex')->first();

        $rejected = $this->api('PUT', '/api/settings/fbr/production', $this->headers($b['token'], 'globex'), [
            'token' => 'prod-token-shared',
            'base_url' => 'https://gw.fbr.gov.pk',
        ])->assertStatus(422)
            ->json();

        $this->assertStringContainsString('already registered to another account', $rejected['message']);
        $this->assertNull($this->fbrRow($tenantB, 'production')?->token_fingerprint);
    }

    public function test_owner_can_resave_their_own_token(): void
    {
        $a = $this->registerTenant('acme', 'owner-a@example.test');
        $headers = $this->headers($a['token'], 'acme');

        $this->api('PUT', '/api/settings/fbr/sandbox', $headers, [
            'token' => 'sb-token-own',
            'base_url' => 'https://gw.fbr.gov.pk',
        ])->assertOk();

        $resaved = $this->api('PUT', '/api/settings/fbr/sandbox', $headers, [
            'token' => 'sb-token-own',
            'base_url' => 'https://gw.fbr.gov.pk',
        ])->assertOk();

        $tenant = Tenant::where('slug', 'acme')->first();
        $this->assertSame('configured', $resaved->json('environment.status'));
        $this->assertSame(FbrIntegration::fingerprintFor('sb-token-own'), $this->fbrRow($tenant, 'sandbox')->token_fingerprint);
    }

    public function test_distinct_tokens_are_allowed_across_accounts(): void
    {
        $a = $this->registerTenant('acme', 'owner-a@example.test');
        $b = $this->registerTenant('globex', 'owner-b@example.test');

        $this->api('PUT', '/api/settings/fbr/sandbox', $this->headers($a['token'], 'acme'), [
            'token' => 'sb-token-a',
            'base_url' => 'https://gw.fbr.gov.pk',
        ])->assertOk();

        $this->api('PUT', '/api/settings/fbr/sandbox', $this->headers($b['token'], 'globex'), [
            'token' => 'sb-token-b',
            'base_url' => 'https://gw.fbr.gov.pk',
        ])->assertOk();

        $this->assertSame('configured', $this->fbrRow(Tenant::where('slug', 'globex')->first(), 'sandbox')?->status);
    }

    public function test_token_value_is_never_returned_and_fingerprint_is_persisted(): void
    {
        $a = $this->registerTenant('acme', 'owner-a@example.test');

        $response = $this->api('PUT', '/api/settings/fbr/sandbox', $this->headers($a['token'], 'acme'), [
            'token' => '  secret-sb-token  ',
            'base_url' => 'https://gw.fbr.gov.pk',
        ])->assertOk();

        $this->assertTrue($response->json('environment.has_token'));
        $this->assertSame('••••••••', $response->json('environment.config.token'));
        $this->assertStringNotContainsString('secret-sb-token', $response->getContent());

        $tenant = Tenant::where('slug', 'acme')->first();
        $row = $this->fbrRow($tenant, 'sandbox');
        $this->assertSame(FbrIntegration::fingerprintFor('secret-sb-token'), $row->token_fingerprint);
        $this->assertSame('secret-sb-token', $row->configArray()['token']);
    }

    public function test_admin_cannot_grant_a_used_token_to_another_tenant(): void
    {
        $a = $this->registerTenant('acme', 'owner-a@example.test');
        $b = $this->registerTenant('globex', 'owner-b@example.test');

        $this->api('PUT', '/api/settings/fbr/production', $this->headers($a['token'], 'acme'), [
            'token' => 'prod-token-used',
            'base_url' => 'https://gw.fbr.gov.pk',
        ])->assertOk();

        $tenantB = Tenant::where('slug', 'globex')->first();

        $rejected = $this->api('PUT', "/api/admin/tenants/{$tenantB->id}/fbr", $this->adminHeaders(), [
            'mode' => 'production',
            'integrator' => 'pral',
            'token' => 'prod-token-used',
            'base_url' => 'https://gw.fbr.gov.pk',
        ])->assertStatus(422)
            ->json();

        $this->assertStringContainsString('already registered to another account', $rejected['message']);
        $this->assertNull($this->fbrRow($tenantB, 'production')?->token_fingerprint);
    }
}
