<?php

namespace App\Services\Fbr\Integrators;

use App\Models\Invoice;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class PralIntegrator extends AbstractIntegrator
{
    public function code(): string
    {
        return 'pral';
    }

    public function name(): string
    {
        return 'PRAL (FBR Licensed Integrator)';
    }

    /**
     * When the tenant has not configured credentials yet, fall back to the
     * legacy platform-wide env settings so existing installations keep working.
     */
    protected function baseUrl(): string
    {
        $configured = $this->config['base_url'] ?? null;

        if ($configured) {
            return rtrim((string) $configured, '/');
        }

        return rtrim((string) config("pral.{$this->mode}.base_url"), '/');
    }

    protected function token(): string
    {
        $token = $this->config['token'] ?? config("pral.{$this->mode}.token");

        if (! $token) {
            throw new RuntimeException("PRAL {$this->mode} token is not configured for this tenant.");
        }

        return (string) $token;
    }

    public function validateInvoice(Invoice $invoice): array
    {
        return $this->post($this->endpoint('validate'), $this->wrap($invoice));
    }

    public function submitInvoice(Invoice $invoice): array
    {
        return $this->post($this->endpoint('submit'), $this->wrap($invoice));
    }

    protected function endpoint(string $name): string
    {
        if (! empty($this->config[$name.'_endpoint'])) {
            return $this->config[$name.'_endpoint'];
        }

        // Sandbox DI endpoints carry the "_sb" suffix. Select on the active
        // environment so a sandbox token can never be sent to production URLs.
        if ($this->mode === 'sandbox') {
            return config("pral.sandbox_endpoints.{$name}") ?? config("pral.endpoints.{$name}");
        }

        return config("pral.endpoints.{$name}");
    }

    /**
     * Validate an arbitrary payload against the configured environment without
     * throwing on FBR-level rejections. Used by the token test / sandbox
     * scenario runner. Network and configuration failures are captured as well.
     *
     * @return array{http_status:int, ok:bool, error?:string, response:?array}
     */
    public function validateDiagnostic(array $payload): array
    {
        try {
            $response = $this->client()->post($this->url($this->endpoint('validate')), $payload);

            $data = $response->json();
            $data = is_array($data) ? $data : ['raw' => $response->body()];

            $this->logResult('pral_diag_validate', $payload, $data, $response->status());

            return [
                'http_status' => $response->status(),
                'ok' => $response->successful(),
                'response' => $data,
            ];
        } catch (Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('PRAL diagnostic validate failed', [
                'error' => $e->getMessage(),
            ]);

            return [
                'http_status' => 0,
                'ok' => false,
                'error' => $e->getMessage(),
                'response' => null,
            ];
        }
    }

    protected function post(string $path, array $payload): array
    {
        try {
            $response = $this->client()->post($this->url($path), $payload);

            return $this->handle($response, $payload);
        } catch (Throwable $e) {
            \Illuminate\Support\Facades\Log::error('PRAL integrator POST failed', [
                'path' => $path,
                'payload' => $payload,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    protected function handle(Response $response, array $payload): array
    {
        $data = $response->json();
        $data = is_array($data) ? $data : ['raw' => $response->body()];

        $this->logResult('pral_post', $payload, $data, $response->status());

        if ($response->failed()) {
            throw new RuntimeException($this->extractError($data, $response->status()));
        }

        return $data;
    }

    protected function extractError(array $data, int $status): string
    {
        $code = $data['errorCode'] ?? $data['code'] ?? $data['statusCode'] ?? null;
        $message = $data['error'] ?? $data['message'] ?? $data['status'] ?? json_encode($data);

        return $this->friendlyError(is_string($code) ? $code : null, "PRAL error ({$status}): {$message}");
    }

    protected function client()
    {
        return Http::timeout((int) config('pral.timeout', 30))
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
