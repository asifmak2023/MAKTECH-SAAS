<?php

namespace App\Services\Fbr;

use App\Models\FbrIntegration;
use App\Models\Tenant;
use App\Services\Fbr\Integrators\PralIntegrator;

class FbrIntegrationService
{
    public function codeFor(Tenant $tenant): string
    {
        return $tenant->integrator ?: 'pral';
    }

    public function rowFor(Tenant $tenant): ?FbrIntegration
    {
        $code = $this->codeFor($tenant);
        $mode = $tenant->fbr_mode ?: 'sandbox';

        return FbrIntegration::query()
            ->where('tenant_id', $tenant->id)
            ->where('integrator', $code)
            ->where('mode', $mode)
            ->first();
    }

    public function ensureRowFor(Tenant $tenant): FbrIntegration
    {
        $code = $this->codeFor($tenant);
        $mode = $tenant->fbr_mode ?: 'sandbox';

        return FbrIntegration::query()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'integrator' => $code, 'mode' => $mode],
            ['status' => 'unconfigured'],
        );
    }

    /**
     * Build the adapter for a tenant. PRAL falls back to the platform env config
     * when the tenant row has no credentials, keeping legacy installs working.
     */
    public function adapterFor(Tenant $tenant): InvoiceIntegratorInterface
    {
        $code = $this->codeFor($tenant);

        $class = config("saas.integrators.{$code}.adapter");

        if (! $class || ! class_exists($class)) {
            $class = PralIntegrator::class;
        }

        $adapter = app($class);

        $row = $this->rowFor($tenant);

        if ($row) {
            $adapter->configure($row);
        }

        return $adapter;
    }

    /**
     * Configured integrators the platform supports (for Admin screens).
     */
    public function availableIntegrators(): array
    {
        $rows = [];

        foreach ((array) config('saas.integrators', []) as $code => $meta) {
            $rows[] = [
                'code' => $code,
                'name' => $meta['name'] ?? $code,
                'supports_sandbox' => (bool) ($meta['supports_sandbox'] ?? false),
                'adapter' => $meta['adapter'] ?? null,
            ];
        }

        return $rows;
    }
}
