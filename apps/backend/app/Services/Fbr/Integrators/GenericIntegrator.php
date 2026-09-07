<?php

namespace App\Services\Fbr\Integrators;

use App\Models\Invoice;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

/**
 * Generic HTTP + bearer token licensed integrator. Credentials and endpoints are
 * tenant specific (Admin -> Tenant settings), so the platform can on-board any
 * licensed integrator that exposes a PRAL-compatible JSON API.
 */
class GenericIntegrator extends AbstractIntegrator
{
    public function code(): string
    {
        return 'generic';
    }

    public function name(): string
    {
        return 'Generic Licensed Integrator';
    }

    protected function baseUrl(): string
    {
        $url = $this->config['base_url'] ?? null;

        if (! $url) {
            throw new RuntimeException('Generic integrator base URL is not configured for this tenant.');
        }

        return rtrim((string) $url, '/');
    }

    protected function token(): string
    {
        $token = $this->config['token'] ?? null;

        if (! $token) {
            throw new RuntimeException('Generic integrator token is not configured for this tenant.');
        }

        return (string) $token;
    }

    public function validateInvoice(Invoice $invoice): array
    {
        return $this->post($this->config['validate_endpoint'] ?? '/validate', $this->wrap($invoice));
    }

    public function submitInvoice(Invoice $invoice): array
    {
        return $this->post($this->config['submit_endpoint'] ?? '/submit', $this->wrap($invoice));
    }

    protected function post(string $path, array $payload): array
    {
        try {
            $response = $this->client()->post($this->url($path), $payload);

            $data = $response->json();
            $data = is_array($data) ? $data : ['raw' => $response->body()];

            $this->logResult('generic_post', $payload, $data, $response->status());

            if ($response->failed()) {
                throw new RuntimeException($this->friendlyError(
                    (string) ($data['code'] ?? $data['errorCode'] ?? ''),
                    $data['message'] ?? $data['error'] ?? "HTTP {$response->status()}"
                ));
            }

            return $data;
        } catch (Throwable $e) {
            if ($e instanceof RuntimeException && str_starts_with($e->getMessage(), 'HTTP ')) {
                throw $e;
            }

            throw $e;
        }
    }

    protected function client()
    {
        return Http::timeout((int) ($this->config['timeout'] ?? 30))
            ->acceptJson()
            ->asJson()
            ->withToken($this->token());
    }

    protected function url(string $path): string
    {
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return $this->baseUrl().'/'.ltrim($path, '/');
    }
}
