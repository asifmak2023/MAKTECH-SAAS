<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FbrIntegration;
use App\Models\Tenant;
use App\Services\Fbr\FbrIntegrationService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FbrIntegrationController extends Controller
{
    public function __construct(protected FbrIntegrationService $fbr) {}

    protected function tenant(): Tenant
    {
        return TenantContext::get() ?? abort(400, 'Tenant context missing.');
    }

    public function show(): JsonResponse
    {
        $tenant = $this->tenant();

        $current = $this->fbr->rowFor($tenant);

        return response()->json([
            'integrator' => $tenant->integrator ?: 'pral',
            'mode' => $tenant->fbr_mode ?: 'sandbox',
            'configured' => $this->isConfigured($current),
            'row' => $current ? [
                'status' => $current->status,
                'mode' => $current->mode,
                'config' => collect($current->configArray())->map(fn ($v, $k) => $k === 'token' ? '••••••••' : $v)->all(),
                'last_tested_at' => $current->last_tested_at,
            ] : null,
            'available_integrators' => $this->fbr->availableIntegrators(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $tenant = $this->tenant();

        $data = $request->validate([
            'mode' => ['sometimes', 'in:sandbox,production'],
            'integrator' => ['sometimes', 'string', 'max:40'],
            'base_url' => ['nullable', 'url'],
            'token' => ['nullable', 'string', 'max:500'],
            'validate_endpoint' => ['nullable', 'string', 'max:500'],
            'submit_endpoint' => ['nullable', 'string', 'max:500'],
        ]);

        if (isset($data['mode'])) {
            $tenant->update(['fbr_mode' => $data['mode']]);
        }

        if (isset($data['integrator'])) {
            $tenant->update(['integrator' => $data['integrator']]);
        }

        $row = $this->fbr->ensureRowFor($tenant);
        $config = $row->configArray();

        foreach (['base_url', 'token', 'validate_endpoint', 'submit_endpoint'] as $key) {
            if (array_key_exists($key, $data) && $data[$key] !== null) {
                $config[$key] = $data[$key];
            }
        }

        $row->setConfigArray($config)->fill(['status' => $this->statusFor($tenant->fbr_mode, $config)])->save();

        return response()->json(['message' => 'FBR integration updated.', 'status' => $row->status]);
    }

    /**
     * A row is usable when a token is available (tenant row, else platform env
     * fallback) and a base URL is known (row, else env), mirroring the adapter.
     */
    protected function isConfigured(?FbrIntegration $row): bool
    {
        if ($row === null) {
            return false;
        }

        return $this->statusFor($row->mode, $row->configArray()) === 'configured';
    }

    protected function statusFor(string $mode, array $config): string
    {
        $token = ! empty($config['token']) || ! empty(config("pral.{$mode}.token"));
        $base = ! empty($config['base_url']) || ! empty(config("pral.{$mode}.base_url"));

        return $token && $base ? 'configured' : 'unconfigured';
    }
}
