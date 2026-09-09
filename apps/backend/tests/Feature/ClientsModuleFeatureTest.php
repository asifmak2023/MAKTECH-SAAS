<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ClientsModuleFeatureTest extends TestCase
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
            'DELETE' => $this->deleteJson($uri, [], $headers),
            default => $this->getJson($uri, $headers),
        };
    }

    protected function platformHeaders(): array
    {
        $login = $this->api('POST', '/api/auth/login', [], [
            'email' => 'admin@saas.local',
            'password' => 'password',
        ]);

        $login->assertOk()->assertJsonPath('user.is_platform_admin', true);

        return ['Authorization' => 'Bearer '.$login->json('token')];
    }

    protected function registerTenant(string $slug = 'console-co', string $email = 'owner@console.local'): array
    {
        $response = $this->api('POST', '/api/auth/register', [], [
            'tenant_name' => ucwords(str_replace('-', ' ', $slug)),
            'tenant_slug' => $slug,
            'name' => 'Owner',
            'email' => $email,
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'seller_ntn_cnic' => '1234567',
            'seller_business_name' => ucwords(str_replace('-', ' ', $slug)),
            'seller_province' => 'Sindh',
            'seller_address' => 'Karachi',
        ]);

        $response->assertCreated();

        return [
            'token' => $response->json('token'),
            'tenant' => $response->json('tenant'),
        ];
    }

    protected function tenantHeaders(string $token, string $slug = 'console-co'): array
    {
        return [
            'Authorization' => 'Bearer '.$token,
            'X-Tenant' => $slug,
        ];
    }

    protected function createClient(array $overrides = []): array
    {
        $reg = $this->registerTenant('console-co', 'owner@console.local');
        $headers = $this->tenantHeaders($reg['token']);

        $payload = array_merge([
            'name' => 'Adeel Khan',
            'business_name' => 'Acme Corp',
            'ntn_cnic' => 'NTN-1001',
            'registration_type' => 'Registered',
            'province' => 'Sindh',
            'address' => '123 Business Avenue, Karachi',
            'email' => 'billing@acme.test',
            'phone' => '+92 300 1112233',
        ], $overrides);

        $client = $this->api('POST', '/api/customers', $headers, $payload);
        $client->assertCreated();

        return [
            'token' => $reg['token'],
            'headers' => $headers,
            'client' => $client->json(),
        ];
    }

    protected function invoicePayload(int $customerId): array
    {
        return [
            'customer_id' => $customerId,
            'invoice_type' => 'Sale Invoice',
            'invoice_date' => '2026-09-06',
            'invoice_ref_no' => 'INV-CLIENT-1',
            'items' => [
                [
                    'hs_code' => '0101.2100',
                    'product_description' => 'Test goods',
                    'rate' => '18%',
                    'uom' => 'Numbers, pieces, units',
                    'quantity' => 1,
                    'value_sales_excluding_st' => 100,
                    'sale_type' => 'Goods at standard rate (default)',
                ],
            ],
        ];
    }

    public function test_customer_crud_and_invoices_count(): void
    {
        [$token, $headers] = [null, null];
        $setup = $this->createClient();
        $headers = $setup['headers'];
        $id = $setup['client']['id'];

        $this->api('GET', '/api/customers', $headers)->assertOk()->assertJsonCount(1, 'data');

        $updated = $this->api('PUT', "/api/customers/{$id}", $headers, [
            'business_name' => 'Acme Corp (Updated)',
            'phone' => '+92 300 9998877',
        ]);

        $updated->assertOk()->assertJsonPath('business_name', 'Acme Corp (Updated)');

        $show = $this->api('GET', "/api/customers/{$id}", $headers);
        $show->assertOk()
            ->assertJsonPath('customer.business_name', 'Acme Corp (Updated)')
            ->assertJsonPath('customer.invoices_count', 0);
    }

    public function test_tenant_cannot_access_another_tenants_client(): void
    {
        $setup = $this->createClient();
        $foreign = $this->registerTenant('acme-co', 'owner@acme.local');
        $foreignHeaders = $this->tenantHeaders($foreign['token'], 'acme-co');

        $this->api('GET', "/api/customers/{$setup['client']['id']}", $foreignHeaders)->assertNotFound();
        $this->api('PUT', "/api/customers/{$setup['client']['id']}", $foreignHeaders, ['name' => 'x'])->assertNotFound();
        $this->api('POST', "/api/customers/{$setup['client']['id']}/archive", $foreignHeaders)->assertNotFound();
        $this->api('GET', '/api/customers', $foreignHeaders)->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_archive_restore_flow(): void
    {
        $setup = $this->createClient();
        $headers = $setup['headers'];
        $id = $setup['client']['id'];

        $this->api('POST', "/api/customers/{$id}/archive", $headers)
            ->assertOk()
            ->assertJsonPath('is_active', false);

        $this->api('GET', '/api/customers', $headers)->assertOk()->assertJsonCount(0, 'data');
        $this->api('GET', '/api/customers?status=all', $headers)->assertOk()->assertJsonCount(1, 'data');
        $this->api('GET', '/api/customers?status=archived', $headers)->assertOk()->assertJsonCount(1, 'data');

        $this->api('POST', "/api/customers/{$id}/restore", $headers)
            ->assertOk()
            ->assertJsonPath('is_active', true);

        $this->api('GET', '/api/customers', $headers)->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_no_tenant_delete_route_for_customers(): void
    {
        $setup = $this->createClient();

        // No DELETE route is registered for tenants; DELETE is not allowed.
        $this->api('DELETE', "/api/customers/{$setup['client']['id']}", $setup['headers'])->assertStatus(405);
        $this->assertDatabaseHas('customers', ['id' => $setup['client']['id']]);
    }

    public function test_invoice_autofills_buyer_fields_from_selected_client(): void
    {
        $setup = $this->createClient();
        $headers = $setup['headers'];

        $response = $this->api('POST', '/api/invoices', $headers, $this->invoicePayload($setup['client']['id']));

        $response->assertCreated()
            ->assertJsonPath('customer_id', $setup['client']['id'])
            ->assertJsonPath('buyer_business_name', 'Acme Corp')
            ->assertJsonPath('buyer_ntn_cnic', 'NTN-1001')
            ->assertJsonPath('buyer_province', 'Sindh')
            ->assertJsonPath('buyer_address', '123 Business Avenue, Karachi')
            ->assertJsonPath('buyer_email', 'billing@acme.test')
            ->assertJsonPath('buyer_phone', '+92 300 1112233')
            ->assertJsonPath('buyer_registration_type', 'Registered');
    }

    public function test_invoice_rejects_foreign_customer(): void
    {
        $setup = $this->createClient();
        $foreign = $this->registerTenant('acme-co', 'owner@acme.local');
        $foreignHeaders = $this->tenantHeaders($foreign['token'], 'acme-co');

        $foreignClient = $this->api('POST', '/api/customers', $foreignHeaders, [
            'name' => 'Owner',
            'business_name' => 'Other Tenant Client',
        ]);
        $foreignClient->assertCreated();

        $response = $this->api('POST', '/api/invoices', $setup['headers'], $this->invoicePayload($foreignClient->json('id')));

        $response->assertStatus(422);
        $this->assertDatabaseMissing('invoices', ['invoice_ref_no' => 'INV-CLIENT-1']);
    }

    public function test_invoices_index_filters_by_customer_and_tenant(): void
    {
        $setup = $this->createClient();
        $headers = $setup['headers'];
        $clientId = $setup['client']['id'];

        $this->api('POST', '/api/invoices', $headers, $this->invoicePayload($clientId))->assertCreated();

        $second = $this->api('POST', '/api/customers', $headers, [
            'name' => 'Salim',
            'business_name' => 'Other Client',
        ]);
        $second->assertCreated();

        $this->api('POST', '/api/invoices', $headers, array_merge(
            $this->invoicePayload($second->json('id')),
            ['invoice_ref_no' => 'INV-CLIENT-2'],
        ))->assertCreated();

        $filtered = $this->api('GET', "/api/invoices?customer_id={$clientId}", $headers);
        $filtered->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame((string) $clientId, (string) $filtered->json('data.0.customer_id'));

        // A second tenant never sees these invoices.
        $foreign = $this->registerTenant('acme-co', 'owner@acme.local');
        $foreignHeaders = $this->tenantHeaders($foreign['token'], 'acme-co');
        $this->api('GET', "/api/invoices?customer_id={$clientId}", $foreignHeaders)->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_platform_admin_can_purge_unused_client_only(): void
    {
        $setup = $this->createClient();
        $headers = $setup['headers'];
        $clientId = $setup['client']['id'];
        $admin = $this->platformHeaders();

        // Platform admin can purge an unused client.
        $this->api('DELETE', "/api/admin/customers/{$clientId}", $admin)->assertOk();
        $this->assertDatabaseMissing('customers', ['id' => $clientId]);

        // But not one that is linked to invoices.
        $second = $this->api('POST', '/api/customers', $headers, [
            'name' => 'Naveed',
            'business_name' => 'Linked Client',
        ]);
        $second->assertCreated();
        $this->api('POST', '/api/invoices', $headers, $this->invoicePayload($second->json('id')))->assertCreated();

        $this->api('DELETE', "/api/admin/customers/{$second->json('id')}", $admin)->assertStatus(422);
        $this->assertDatabaseHas('customers', ['id' => $second->json('id')]);
    }

    public function test_tenant_user_cannot_access_admin_purge(): void
    {
        $setup = $this->createClient();

        $this->api('DELETE', "/api/admin/customers/{$setup['client']['id']}", $setup['headers'])->assertStatus(403);
    }
}
