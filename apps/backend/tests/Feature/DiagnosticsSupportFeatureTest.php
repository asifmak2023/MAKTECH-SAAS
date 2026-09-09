<?php

namespace Tests\Feature;

use App\Models\FbrIntegration;
use App\Models\FbrSubmissionHistory;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Fbr\FbrDiagnosticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class DiagnosticsSupportFeatureTest extends TestCase
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

    protected function registerTenant(string $slug = 'acme', string $seller = '8885801', string $email = 'owner@acme.local'): array
    {
        $response = $this->api('POST', '/api/auth/register', [], [
            'tenant_name' => 'Acme Co',
            'tenant_slug' => $slug,
            'name' => 'Owner',
            'email' => $email,
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'seller_ntn_cnic' => $seller,
            'seller_business_name' => 'ACME TRADERS',
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

    public function test_token_test_and_scenario_run_record_verdicts(): void
    {
        Http::fake([
            'gw.fbr.gov.pk/di_data/v1/di/validateinvoicedata_sb' => Http::response([
                'dated' => now()->toDateTimeString(),
                'validationResponse' => ['statusCode' => '00', 'status' => 'Valid', 'error' => ''],
            ]),
        ]);

        $reg = $this->registerTenant();
        $h = $this->headers($reg['token'], 'acme');

        $this->api('PUT', '/api/settings/fbr/sandbox', $h, [
            'token' => 'sandbox-token-abc',
            'base_url' => 'https://gw.fbr.gov.pk',
        ])->assertOk();

        $test = $this->api('POST', '/api/settings/fbr/test', $h, ['mode' => 'sandbox', 'scenario' => 'SN001'])
            ->assertOk()
            ->json();

        $this->assertTrue($test['result']['ok']);
        $this->assertSame('00', $test['result']['status_code']);

        $tenant = Tenant::where('slug', 'acme')->first();
        $this->assertSame('tested', FbrIntegration::where('tenant_id', $tenant->id)->where('mode', 'sandbox')->value('status'));

        $run = $this->api('POST', '/api/settings/fbr/run-tests', $h, ['scenarios' => ['SN001', 'SN002']])
            ->assertOk()
            ->json();

        $this->assertSame(2, $run['total']);
        $this->assertSame(2, $run['passed']);

        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), 'validateinvoicedata_sb'));
    }

    public function test_token_test_reports_authorization_failure(): void
    {
        Http::fake([
            '*' => Http::response([
                'validationResponse' => ['statusCode' => '01', 'status' => 'Invalid', 'errorCode' => '0401', 'error' => 'token mismatch'],
            ], 200),
        ]);

        $reg = $this->registerTenant();
        $h = $this->headers($reg['token'], 'acme');

        $this->api('PUT', '/api/settings/fbr/sandbox', $h, ['token' => 'bad', 'base_url' => 'https://gw.fbr.gov.pk'])->assertOk();

        $test = $this->api('POST', '/api/settings/fbr/test', $h, ['mode' => 'sandbox'])->assertOk()->json();

        $this->assertFalse($test['result']['ok']);
        $this->assertSame('0401', $test['result']['error_code']);
        $this->assertStringContainsString('not authorized', strtolower($test['result']['error']));

        $tenant = Tenant::where('slug', 'acme')->first();
        $this->assertSame('failed', FbrIntegration::where('tenant_id', $tenant->id)->where('mode', 'sandbox')->value('status'));
    }

    public function test_scenario_runner_carries_sellers_profile_and_captures_item_errors(): void
    {
        $reg = $this->registerTenant('acme', '9876543');
        $h = $this->headers($reg['token'], 'acme');
        $tenant = Tenant::where('slug', 'acme')->first();

        $this->api('PUT', '/api/settings/fbr/sandbox', $h, [
            'token' => 'sandbox-token-abc',
            'base_url' => 'https://gw.fbr.gov.pk',
        ])->assertOk();

        Http::fake([
            '*' => Http::response(['validationResponse' => ['statusCode' => '01', 'status' => 'Invalid', 'errorCode' => null, 'error' => '',
                'invoiceStatuses' => [['itemSNo' => '1', 'statusCode' => '01', 'status' => 'Invalid', 'errorCode' => '0046', 'error' => 'Rate mismatch']]]], 200),
        ]);

        $service = app(FbrDiagnosticsService::class);
        $result = $service->runScenarios($tenant, ['SN001']);

        $this->assertSame(1, $result['failed']);
        $this->assertSame('0046', $result['scenarios'][0]['error_code']);

        $payload = $service->payloadFor($tenant, 'SN001');
        $this->assertSame('9876543', $payload['sellerNTNCNIC']);
        $this->assertSame('SN001', $payload['scenarioId']);
        // The invoice date must be relative to UTC: between 00:00-05:00 PKT the
        // Karachi date is "tomorrow" for PRAL's UTC sandbox clock and returns 0043.
        $this->assertSame(now('UTC')->format('Y-m-d'), $payload['invoiceDate']);
    }

    public function test_scenario_suite_defaults_to_every_available_scenario(): void
    {
        Http::fake([
            '*' => Http::response([
                'validationResponse' => ['statusCode' => '00', 'status' => 'Valid', 'error' => ''],
            ], 200),
        ]);

        $reg = $this->registerTenant();
        $h = $this->headers($reg['token'], 'acme');

        $this->api('PUT', '/api/settings/fbr/sandbox', $h, [
            'token' => 'sandbox-token-abc',
            'base_url' => 'https://gw.fbr.gov.pk',
        ])->assertOk();

        $catalogue = app(FbrDiagnosticsService::class)->catalogue();

        $run = $this->api('POST', '/api/settings/fbr/run-tests', $h)
            ->assertOk()
            ->json();

        $this->assertSame(count($catalogue), $run['total']);
        $this->assertSame(count($catalogue), $run['passed']);

        $ids = array_column($run['scenarios'], 'id');
        sort($ids);
        $expected = array_keys($catalogue);
        sort($expected);
        $this->assertSame($expected, $ids);
    }

    public function test_support_session_lifecycle_and_tenant_isolation(): void
    {
        $this->registerTenant('acme', '8885801', 'owner@acme.local');
        $this->registerTenant('globex', '8885801', 'owner@globex.local');
        $seller = $this->registerTenant('other', '8885801', 'owner@other.local');

        $hAcme = $this->headers($seller['token'], 'other');
        // Re-login as acme owner for the first seller.
        $acmeLogin = $this->api('POST', '/api/auth/login', [], ['email' => 'owner@acme.local', 'password' => 'password123', 'tenant' => 'acme'])->assertOk();
        $hAcme = $this->headers($acmeLogin->json('token'), 'acme');

        $globexLogin = $this->api('POST', '/api/auth/login', [], ['email' => 'owner@globex.local', 'password' => 'password123', 'tenant' => 'globex'])->assertOk();
        $hGlobex = $this->headers($globexLogin->json('token'), 'globex');

        $created = $this->api('POST', '/api/support/sessions', $hAcme, [
            'subject' => 'Cannot submit invoice',
            'category' => 'pral',
            'priority' => 'high',
            'message' => 'My submission fails with an auth error.',
        ])->assertCreated()->json();

        $this->assertSame('open', $created['status']);
        $this->assertCount(1, $created['messages']);

        $this->api('GET', '/api/support/sessions/'.$created['id'], $hGlobex)->assertNotFound();

        $admin = $this->api('POST', '/api/admin/support/'.$created['id'].'/messages', $this->adminHeaders(), [
            'body' => 'Please check the token in Settings.',
        ])->assertOk()->json();

        $this->assertSame('in_progress', $admin['status']);

        $this->api('POST', '/api/admin/support/'.$created['id'].'/status', $this->adminHeaders(), ['status' => 'resolved'])->assertOk();

        $this->api('POST', '/api/support/sessions/'.$created['id'].'/resolve', $hAcme)->assertStatus(422);
        $this->assertDatabaseHas('support_sessions', ['id' => $created['id'], 'status' => 'resolved']);
    }

    public function test_activity_feed_records_invoice_lifecycle_and_fbr_history(): void
    {
        $reg = $this->registerTenant();
        $h = $this->headers($reg['token'], 'acme');

        $customer = $this->api('POST', '/api/customers', $h, [
            'name' => 'Buyer One',
            'business_name' => 'Buyer One Pvt Ltd',
            'ntn_cnic' => '2046004',
            'province' => 'Sindh',
            'address' => 'Karachi',
            'registration_type' => 'Registered',
        ])->assertCreated()->json();

        $invoice = $this->api('POST', '/api/invoices', $h, [
            'customer_id' => $customer['id'],
            'invoice_type' => 'Sale Invoice',
            'invoice_date' => now()->format('Y-m-d'),
            'items' => [[
                'hs_code' => '0101.2100',
                'product_description' => 'test',
                'rate' => '18%',
                'uom' => 'Numbers, pieces, units',
                'quantity' => 1,
                'value_sales_excluding_st' => 1000,
                'sale_type' => 'Goods at standard rate (default)',
            ]],
        ])->assertCreated();

        $tenant = Tenant::where('slug', 'acme')->first();

        $this->assertDatabaseHas('audit_logs', ['tenant_id' => $tenant->id, 'action' => 'invoice.created']);

        FbrSubmissionHistory::query()->create([
            'tenant_id' => $tenant->id,
            'invoice_id' => $invoice->json('id'),
            'user_id' => null,
            'action' => 'submit',
            'attempt' => 1,
            'request' => [],
            'response' => ['validationResponse' => ['errorCode' => '0401']],
            'status' => 'failed',
            'error_code' => '0401',
            'error_message' => 'Unauthorized',
            'created_at' => now(),
        ]);

        $feed = $this->api('GET', '/api/activity', $h)->assertOk()->json('items');
        $this->assertNotEmpty($feed);
        $this->assertTrue(collect($feed)->contains(fn ($e) => ($e['type'] ?? null) === 'fbr'));

        $adminFeed = $this->api('GET', '/api/admin/activity', $this->adminHeaders())->assertOk()->json('items');
        $this->assertNotEmpty($adminFeed);
    }

    public function test_platform_admin_notified_when_seller_opens_session(): void
    {
        $this->registerTenant();
        $acmeLogin = $this->api('POST', '/api/auth/login', [], ['email' => 'owner@acme.local', 'password' => 'password123', 'tenant' => 'acme'])->assertOk();
        $h = $this->headers($acmeLogin->json('token'), 'acme');

        $this->api('POST', '/api/support/sessions', $h, [
            'subject' => 'Need help',
            'category' => 'technical',
            'priority' => 'normal',
            'message' => 'help',
        ])->assertCreated();

        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => User::withoutGlobalScopes()->where('email', 'admin@saas.local')->value('id'),
        ]);
    }
}
