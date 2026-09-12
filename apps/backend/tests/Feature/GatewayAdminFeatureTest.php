<?php

namespace Tests\Feature;

use App\Models\PaymentGateway;
use App\Services\Payments\Gateways\RaastGateway;
use Database\Seeders\CatalogSeeder;
use Database\Seeders\PlatformBootstrapSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Testing\TestResponse;
use ReflectionClass;
use Tests\TestCase;

class GatewayAdminFeatureTest extends TestCase
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

        $login->assertOk();

        return ['Authorization' => 'Bearer '.$login->json('token')];
    }

    protected function raastFields(array $rows): array
    {
        $row = collect($rows)->firstWhere('code', 'raast');

        return collect($row['fields'])->keyBy('key')->all();
    }

    public function test_index_exposes_editable_fields_without_secret_values(): void
    {
        $response = $this->api('GET', '/api/admin/gateways', $this->platformHeaders());
        $response->assertOk();

        $rows = $response->json();
        $this->assertNotEmpty($rows);

        $fields = $this->raastFields($rows);

        foreach (['merchant_id', 'api_key', 'api_secret', 'iban', 'alias', 'sandbox_endpoint', 'live_endpoint'] as $key) {
            $this->assertArrayHasKey($key, $fields, "Raast field {$key} is missing");
        }

        // Secret values must never leave the API.
        $this->assertNull($fields['api_key']['value']);
        $this->assertNull($fields['api_secret']['value']);
        $this->assertTrue($fields['api_key']['secret']);
        $this->assertTrue($fields['api_secret']['secret']);

        // With no DB value and env credentials present, surface the fallback
        // marker without ever leaking the env value.
        $envHasKey = ! blank(getenv('RAST_API_KEY')) || ! blank($_ENV['RAST_API_KEY'] ?? null);
        $this->assertSame($envHasKey, $fields['api_key']['from_env']);
        $this->assertSame('ONELINK_API_KEY', $fields['api_key']['env_name']);
        $this->assertFalse($fields['api_key']['stored']);
    }

    public function test_admin_can_save_raast_credentials_encrypted_at_rest(): void
    {
        $rows = $this->api('GET', '/api/admin/gateways', $this->platformHeaders())->json();
        $gatewayId = collect($rows)->firstWhere('code', 'raast')['id'];

        $response = $this->api('PUT', "/api/admin/gateways/{$gatewayId}", $this->platformHeaders(), [
            'config' => [
                'merchant_id' => 'MID-1LINK',
                'api_key' => 'sk_live_abc123',
                'api_secret' => 'ss_live_def456',
                'iban' => 'PK36SCBL0000001123456702',
                'alias' => 'pral@1link',
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('fields.0.key', 'merchant_id');

        $gateway = PaymentGateway::query()->findOrFail($gatewayId);
        $config = $gateway->configArray();

        $this->assertSame('MID-1LINK', $config['merchant_id']);
        $this->assertSame('sk_live_abc123', $config['api_key']);
        $this->assertSame('ss_live_def456', $config['api_secret']);

        // Encrypted at rest: the raw column must not contain the secrets.
        $this->assertStringNotContainsString('sk_live_abc123', $gateway->getRawOriginal('config'));
        $this->assertStringNotContainsString('ss_live_def456', $gateway->getRawOriginal('config'));

        // The API still never echoes the secret value back.
        $fields = collect($response->json('fields'))->keyBy('key');
        $this->assertNull($fields['api_key']['value']);
        $this->assertTrue($fields['api_key']['stored']);
    }

    public function test_masked_sentinel_keeps_secret_and_blank_clears_it_back_to_env(): void
    {
        $rows = $this->api('GET', '/api/admin/gateways', $this->platformHeaders())->json();
        $gatewayId = collect($rows)->firstWhere('code', 'raast')['id'];
        $headers = $this->platformHeaders();

        $this->api('PUT', "/api/admin/gateways/{$gatewayId}", $headers, [
            'config' => ['api_key' => 'sk_keep_me'],
        ])->assertOk();

        // Masked sentinel is ignored - stored value survives.
        $this->api('PUT', "/api/admin/gateways/{$gatewayId}", $headers, [
            'config' => ['api_key' => '••••••••'],
        ])->assertOk();
        $this->assertSame('sk_keep_me', PaymentGateway::query()->findOrFail($gatewayId)->configArray()['api_key']);

        // Clearing the field removes the DB value so the env fallback resumes.
        $this->api('PUT', "/api/admin/gateways/{$gatewayId}", $headers, [
            'config' => ['api_key' => ''],
        ])->assertOk();

        $after = PaymentGateway::query()->findOrFail($gatewayId)->configArray();
        $this->assertArrayNotHasKey('api_key', $after);
    }

    public function test_db_credentials_override_env_fallback_in_adapter(): void
    {
        $rows = $this->api('GET', '/api/admin/gateways', $this->platformHeaders())->json();
        $gateway = PaymentGateway::query()->findOrFail(collect($rows)->firstWhere('code', 'raast')['id']);

        $this->api('PUT', "/api/admin/gateways/{$gateway->id}", $this->platformHeaders(), [
            'config' => ['api_key' => 'sk_admin_wins'],
        ])->assertOk();

        $adapter = app(RaastGateway::class);
        $adapter->configure($gateway->fresh());

        $prop = (new ReflectionClass($adapter))->getProperty('config');
        $prop->setAccessible(true);
        $config = $prop->getValue($adapter);

        $this->assertSame('sk_admin_wins', $config['api_key']);

        // Without a DB value the env fallback fills the gap (when configured).
        PaymentGateway::query()->where('code', 'raast')->update(['config' => null]);
        $adapter->configure(PaymentGateway::query()->where('code', 'raast')->firstOrFail());
        $config = $prop->getValue($adapter);

        $envHasKey = ! blank(getenv('RAST_API_KEY')) || ! blank($_ENV['RAST_API_KEY'] ?? null);
        if ($envHasKey) {
            $this->assertTrue(isset($config['api_key']) && ! blank($config['api_key']));
        } else {
            $this->assertArrayNotHasKey('api_key', $config);
        }
    }
}
