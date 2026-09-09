<?php

namespace App\Services\Fbr;

use App\Models\FbrIntegration;
use App\Models\Tenant;
use App\Services\Fbr\Integrators\PralIntegrator;
use InvalidArgumentException;

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
     * Claim a token for one environment. Returns the fingerprint to persist
     * (null when no token is stored) or throws when another account already
     * bound the same key to the same integrator + mode. One FBR key may be
     * registered to exactly one workspace.
     */
    public function claimToken(Tenant $tenant, string $integrator, string $mode, ?string $token): ?string
    {
        $token = is_string($token) ? trim($token) : null;

        if ($token === null || $token === '') {
            return null;
        }

        $fingerprint = FbrIntegration::fingerprintFor($token);

        $taken = FbrIntegration::query()
            ->where('integrator', $integrator)
            ->where('mode', $mode)
            ->where('token_fingerprint', $fingerprint)
            ->where('tenant_id', '!=', $tenant->id)
            ->exists();

        if ($taken) {
            throw new InvalidArgumentException(
                "This {$mode} key is already registered to another account. Each FBR {$mode} token can be bound to only one account — that workspace must release it, or you need a different token."
            );
        }

        return $fingerprint;
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
