<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\PralReferenceData;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class PralInvoiceService
{
    public function usingSandbox(): bool
    {
        return (bool) config('pral.use_sandbox');
    }

    public function baseUrl(): string
    {
        $mode = $this->usingSandbox() ? 'sandbox' : 'production';

        return rtrim((string) config("pral.{$mode}.base_url"), '/');
    }

    public function token(): string
    {
        $mode = $this->usingSandbox() ? 'sandbox' : 'production';
        $token = (string) config("pral.{$mode}.token");

        if ($token === '') {
            throw new RuntimeException("PRAL {$mode} token is not configured.");
        }

        return $token;
    }

    public function validateInvoice(Invoice $invoice): array
    {
        return $this->postJson(config('pral.endpoints.validate'), $invoice->toPralPayload());
    }

    public function submitInvoice(Invoice $invoice): array
    {
        return $this->postJson(config('pral.endpoints.submit'), $invoice->toPralPayload());
    }

    public function fetchHsCodes(): array
    {
        return $this->cachedReference('hs_codes', config('pral.endpoints.hs_codes'));
    }

    public function fetchUoms(?string $hsCode = null): array
    {
        $path = config('pral.endpoints.uoms');
        if ($hsCode) {
            $path .= '/'.urlencode($hsCode);
        }

        return $this->cachedReference('uoms'.($hsCode ? ':'.$hsCode : ''), $path);
    }

    public function fetchSaleTypes(): array
    {
        return $this->cachedReference('sale_types', config('pral.endpoints.sale_types'));
    }

    public function fetchProvinces(): array
    {
        return $this->cachedReference('provinces', config('pral.endpoints.provinces'));
    }

    public function fetchDocTypes(): array
    {
        return $this->cachedReference('doc_types', config('pral.endpoints.doc_types'));
    }

    public function fetchSroSchedule(?string $rateId = null, ?string $date = null): array
    {
        $path = config('pral.endpoints.sro_schedule');
        $query = array_filter(['rate_id' => $rateId, 'date' => $date]);

        return $this->cachedReference('sro_schedule:'.md5(json_encode($query)), $path, $query);
    }

    public function fetchSaleTypeToRate(string $date, string $transTypeId, string $originationSupplier): array
    {
        $query = [
            'date' => $date,
            'transTypeId' => $transTypeId,
            'originationSupplier' => $originationSupplier,
        ];

        return $this->cachedReference('sale_type_to_rate:'.md5(json_encode($query)), config('pral.endpoints.sale_type_to_rate'), $query);
    }

    public function syncAllReferenceData(): void
    {
        $this->persistReference('hs_codes', $this->fetchHsCodes());
        $this->persistReference('uoms', $this->fetchUoms());
        $this->persistReference('sale_types', $this->fetchSaleTypes());
        $this->persistReference('provinces', $this->fetchProvinces());
        $this->persistReference('doc_types', $this->fetchDocTypes());
    }

    public function friendlyError(?string $code, ?string $fallback = null): string
    {
        $map = config('pral.error_codes', []);

        if ($code && isset($map[$code])) {
            return $map[$code];
        }

        return $fallback ?: 'PRAL rejected this invoice. Please review the highlighted fields.';
    }

    protected function cachedReference(string $key, string $path, array $query = []): array
    {
        $cacheKey = 'pral:ref:'.$key;

        return Cache::remember($cacheKey, config('pral.cache_ttl'), function () use ($path, $query) {
            return $this->getJson($path, $query);
        });
    }

    protected function persistReference(string $type, array $rows): void
    {
        PralReferenceData::query()->where('type', $type)->delete();

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            PralReferenceData::query()->create([
                'type' => $type,
                'code' => (string) ($row['code'] ?? $row['hs_code'] ?? $row['id'] ?? ''),
                'name' => (string) ($row['name'] ?? $row['description'] ?? $row['desc'] ?? $row['transactioN_DESC'] ?? ''),
                'payload' => $row,
                'synced_at' => now(),
            ]);
        }
    }

    protected function postJson(string $path, array $payload): array
    {
        try {
            $response = $this->client()->post($this->url($path), $payload);

            return $this->handleResponse('POST', $path, $payload, $response);
        } catch (Throwable $e) {
            Log::error('PRAL POST failed', [
                'path' => $path,
                'payload' => $payload,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    protected function getJson(string $path, array $query = []): array
    {
        try {
            $response = $this->client()->get($this->url($path), $query);

            return $this->handleResponse('GET', $path, $query, $response);
        } catch (Throwable $e) {
            Log::error('PRAL GET failed', [
                'path' => $path,
                'query' => $query,
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    protected function handleResponse(string $method, string $path, array $body, Response $response): array
    {
        $json = $response->json();
        $data = is_array($json) ? $json : ['raw' => $response->body()];

        Log::info('PRAL API response', [
            'method' => $method,
            'path' => $path,
            'status' => $response->status(),
            'request' => $body,
            'response' => $data,
        ]);

        if ($response->failed()) {
            throw new RuntimeException($this->extractErrorMessage($data, $response->status()));
        }

        return $data;
    }

    protected function extractErrorMessage(array $data, int $status): string
    {
        $code = $data['errorCode'] ?? $data['code'] ?? $data['statusCode'] ?? null;
        $message = $data['error'] ?? $data['message'] ?? $data['status'] ?? json_encode($data);

        return $this->friendlyError(is_string($code) ? $code : null, "PRAL error ({$status}): {$message}");
    }

    protected function client()
    {
        return Http::timeout(config('pral.timeout'))
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
