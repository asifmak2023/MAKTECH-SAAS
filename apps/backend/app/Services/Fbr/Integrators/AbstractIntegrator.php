<?php

namespace App\Services\Fbr\Integrators;

use App\Models\FbrIntegration;
use App\Models\Invoice;
use App\Services\Fbr\InvoiceIntegratorInterface;

abstract class AbstractIntegrator implements InvoiceIntegratorInterface
{
    protected ?FbrIntegration $integration = null;

    protected array $config = [];

    protected string $mode = 'sandbox';

    public function configure(FbrIntegration $integration): void
    {
        $this->integration = $integration;
        $this->mode = $integration->mode;
        $this->config = $integration->configArray();
    }

    public function mode(): string
    {
        return $this->mode;
    }

    public function isConfigured(): bool
    {
        return $this->integration !== null && $this->integration->status === 'configured';
    }

    public function friendlyError(?string $code, ?string $fallback = null): string
    {
        $map = config('pral.error_codes', []);

        if ($code && isset($map[$code])) {
            return $map[$code];
        }

        return $fallback ?: 'The tax authority rejected this invoice. Please review the highlighted fields.';
    }

    protected function logResult(string $action, array $payload, array $response, int $status): void
    {
        \Illuminate\Support\Facades\Log::info('FBR integrator response', [
            'integrator' => $this->code(),
            'action' => $action,
            'mode' => $this->mode,
            'status' => $status,
            'request' => $payload,
            'response' => $response,
        ]);
    }

    protected function wrap(Invoice $invoice): array
    {
        return $invoice->toPralPayload();
    }
}
