<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FbrIntegration;
use App\Models\Tenant;
use App\Services\Fbr\FbrDiagnosticsService;
use App\Services\Fbr\FbrIntegrationService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class FbrIntegrationController extends Controller
{
    public function __construct(
        protected FbrIntegrationService $fbr,
        protected FbrDiagnosticsService $diagnostics,
    ) {}

    protected function tenant(): Tenant
    {
        return TenantContext::get() ?? abort(400, 'Tenant context missing.');
    }

    /**
     * Per-environment configuration + onboarding readiness.
     */
    public function show(): JsonResponse
    {
        $tenant = $this->tenant();

        $environments = [];
        foreach (['sandbox', 'production'] as $mode) {
            $row = $this->row($tenant, $mode);

            if ($row) {
                $environments[$mode] = $this->environmentShape($row);
            }
        }

        $sandbox = $environments['sandbox'] ?? null;
        $production = $environments['production'] ?? null;

        $sellerComplete = ! empty($tenant->seller_ntn_cnic) && ! empty($tenant->seller_business_name);
        $sandboxConfigured = (bool) ($sandbox['configured'] ?? false);
        $sandboxTested = $sandbox['tested'] ?? false;
        $productionConfigured = (bool) ($production['configured'] ?? false);

        return response()->json([
            'active_mode' => $tenant->fbr_mode ?: 'sandbox',
            'integrator' => $tenant->integrator ?: 'pral',
            'available_integrators' => $this->fbr->availableIntegrators(),
            'environments' => $environments,
            'onboarding' => [
                'seller_profile_complete' => $sellerComplete,
                'sandbox_configured' => $sandboxConfigured,
                'sandbox_tested' => $sandboxTested,
                'sandbox_suite_passed' => $this->sandboxSuitePassed($rowFor = $this->row($tenant, 'sandbox')),
                'production_configured' => $productionConfigured,
                'production_active' => ($tenant->fbr_mode ?: 'sandbox') === 'production',
                'can_activate_production' => $productionConfigured && $sandboxConfigured,
            ],
            'mode' => $tenant->fbr_mode ?: 'sandbox',
            'configured' => $sandboxConfigured,
            'row' => $sandbox,
        ]);
    }

    /**
     * Switch which environment is used for live invoicing.
     */
    public function activate(Request $request): JsonResponse
    {
        $tenant = $this->tenant();

        $data = $request->validate([
            'mode' => ['required', 'in:sandbox,production'],
        ]);

        $mode = $data['mode'];
        $row = $this->row($tenant, $mode);

        if ($mode === 'production' && (! $row || ! $this->hasCredentials($mode, $row->configArray()))) {
            return response()->json(['message' => 'Configure production credentials before activating production.'], 422);
        }

        $tenant->update(['fbr_mode' => $mode]);

        return response()->json(['message' => "{$mode} environment activated.", 'active_mode' => $mode]);
    }

    /**
     * Persist configuration for one environment (sandbox OR production row).
     */
    public function updateEnvironment(Request $request, string $mode): JsonResponse
    {
        if (! in_array($mode, ['sandbox', 'production'], true)) {
            abort(404, 'Unknown environment.');
        }

        $tenant = $this->tenant();

        $data = $request->validate([
            'integrator' => ['sometimes', 'string', 'max:40'],
            'base_url' => ['nullable', 'url'],
            'token' => ['nullable', 'string', 'max:500'],
            'validate_endpoint' => ['nullable', 'string', 'max:500'],
            'submit_endpoint' => ['nullable', 'string', 'max:500'],
        ]);

        if (isset($data['integrator'])) {
            $tenant->update(['integrator' => $data['integrator']]);
        }

        $row = FbrIntegration::query()->firstOrCreate(
            [
                'tenant_id' => $tenant->id,
                'integrator' => $tenant->integrator ?: 'pral',
                'mode' => $mode,
            ],
            ['status' => 'unconfigured'],
        );
        $config = $row->configArray();

        foreach (['base_url', 'token', 'validate_endpoint', 'submit_endpoint'] as $key) {
            if (array_key_exists($key, $data) && $data[$key] !== null) {
                $config[$key] = $data[$key];
            }
        }

        $hasCredentials = $this->hasCredentials($mode, $config);
        $status = $row->status;

        if (! $hasCredentials) {
            $status = 'unconfigured';
        } elseif (! in_array($status, ['tested'], true)) {
            // Keep "tested" once proven; a credential change resets it so the
            // seller has to re-run the token test.
            $status = 'configured';
        }

        $row->setConfigArray($config)->fill(['status' => $status])->save();

        return response()->json([
            'message' => 'FBR integration updated.',
            'environment' => $this->environmentShape($row->fresh()),
        ]);
    }

    /**
     * Backwards-compatible update: mirrors legacy behaviour and targets the
     * tenant's active environment.
     */
    public function update(Request $request): JsonResponse
    {
        $tenant = $this->tenant();
        $mode = (string) $request->input('mode', $tenant->fbr_mode ?: 'sandbox');

        if (isset($request->mode) && in_array((string) $request->mode, ['sandbox', 'production'], true)) {
            $tenant->update(['fbr_mode' => $mode]);
        }

        return $this->updateEnvironment($request, $mode);
    }

    /**
     * POST /settings/fbr/test — validates the token against the environment's
     * validate endpoint using the seller's own profile. Never posts an invoice.
     */
    public function test(Request $request): JsonResponse
    {
        $tenant = $this->tenant();

        $data = $request->validate([
            'mode' => ['sometimes', 'in:sandbox,production'],
            'scenario' => ['sometimes', 'string', 'max:10'],
        ]);

        $mode = $data['mode'] ?? 'sandbox';
        $scenario = $data['scenario'] ?? 'SN001';

        if ($mode === 'production' && ! $this->hasCredentials($mode, $this->rowConfig($tenant, $mode))) {
            return response()->json(['message' => 'Configure and save a production token before testing it.'], 422);
        }

        if ($mode === 'sandbox' && ! $this->hasCredentials($mode, $this->rowConfig($tenant, $mode))) {
            return response()->json(['message' => 'Configure and save a sandbox token before testing it.'], 422);
        }

        if (! $this->diagnostics->hasScenario($scenario)) {
            return response()->json(['message' => 'Unknown scenario: '.$scenario], 422);
        }

        try {
            return response()->json($this->diagnostics->testToken($tenant, $mode, $scenario));
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * POST /settings/fbr/run-tests — runs the sandbox scenario suite (validate
     * only, no invoices are created).
     */
    public function runTests(Request $request): JsonResponse
    {
        $tenant = $this->tenant();

        $data = $request->validate([
            'scenarios' => ['sometimes', 'array', 'max:30'],
            'scenarios.*' => ['string', 'max:10'],
        ]);

        if (! $this->hasCredentials('sandbox', $this->rowConfig($tenant, 'sandbox'))) {
            return response()->json(['message' => 'Configure and save a sandbox token before running sandbox tests.'], 422);
        }

        $ids = $data['scenarios'] ?? null;

        if ($ids === null) {
            $catalogue = $this->diagnostics->catalogue();
            // A sensible default subset (retailer-only scenarios SN026-28 are
            // included when explicitly requested).
            $defaults = ['SN001', 'SN002', 'SN005', 'SN006', 'SN007', 'SN008', 'SN012', 'SN013', 'SN015', 'SN019', 'SN021'];
            $ids = array_values(array_intersect($defaults, array_keys($catalogue)));
        }

        foreach ($ids as $id) {
            if (! $this->diagnostics->hasScenario($id)) {
                return response()->json(['message' => 'Unknown scenario: '.$id], 422);
            }
        }

        try {
            return response()->json($this->diagnostics->runScenarios($tenant, $ids));
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function scenarios(): JsonResponse
    {
        $tenant = $this->tenant();

        return response()->json([
            'scenarios' => $this->diagnostics->catalogue(),
            'has_seller_profile' => ! empty($tenant->seller_ntn_cnic) && ! empty($tenant->seller_business_name),
        ]);
    }

    protected function environmentShape(FbrIntegration $row): array
    {
        $config = $row->configArray();
        $hasCredentials = $this->hasCredentials($row->mode, $config);
        $status = $row->status;

        if (! $hasCredentials) {
            $status = 'unconfigured';
        }

        $masked = collect($config)->map(fn ($v, $k) => $k === 'token' ? ($v ? '••••••••' : '') : $v)->all();

        return [
            'mode' => $row->mode,
            'status' => $status,
            'configured' => $hasCredentials,
            'tested' => $hasCredentials && $row->status === 'tested',
            'failed' => $hasCredentials && $row->status === 'failed',
            'has_token' => ! empty($config['token'] ?? '') || ! empty(config("pral.{$row->mode}.token")),
            'config' => $masked,
            'last_tested_at' => $row->last_tested_at,
            'last_test' => $row->last_test_response,
        ];
    }

    protected function sandboxSuitePassed(?FbrIntegration $row): bool
    {
        if (! $row || ! $row->last_test_response) {
            return false;
        }

        $response = $row->last_test_response;

        return ($response['kind'] ?? null) === 'scenarios'
            && isset($response['passed'], $response['total'])
            && (int) $response['passed'] === (int) $response['total']
            && (int) $response['total'] > 0;
    }

    protected function row(Tenant $tenant, string $mode): ?FbrIntegration
    {
        return FbrIntegration::query()
            ->where('tenant_id', $tenant->id)
            ->where('integrator', $tenant->integrator ?: 'pral')
            ->where('mode', $mode)
            ->first();
    }

    protected function rowConfig(Tenant $tenant, string $mode): array
    {
        $row = $this->row($tenant, $mode);

        return $row?->configArray() ?? [];
    }

    protected function hasCredentials(string $mode, array $config): bool
    {
        $token = ! empty($config['token']) || ! empty(config("pral.{$mode}.token"));
        $base = ! empty($config['base_url']) || ! empty(config("pral.{$mode}.base_url"));

        return $token && $base;
    }
}
