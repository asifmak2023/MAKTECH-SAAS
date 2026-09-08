<?php

namespace App\Services\Fbr;

use App\Models\FbrIntegration;
use App\Models\Tenant;
use App\Services\Fbr\Integrators\PralIntegrator;
use Illuminate\Support\Facades\File;
use InvalidArgumentException;

/**
 * Runs non-destructive PRAL sandbox/production diagnostics: a single token
 * test and a suite of scenario validations. Validation requests never create
 * business invoices; they exercise the real FBR "validateinvoicedata" web
 * method for the given environment.
 */
class FbrDiagnosticsService
{
    protected string $scenarioDir;

    public function __construct()
    {
        $this->scenarioDir = resource_path('fbr/scenarios');
    }

    /**
     * Payloads shipped with the repo (official PRAL fixtures minus SN009/SN010).
     */
    public function catalogue(): array
    {
        $meta = $this->meta();

        $files = collect(File::files($this->scenarioDir))
            ->map(fn ($f) => $f->getBasename('.json'))
            ->filter(fn ($id) => $id !== 'meta');

        return $files->filter(fn ($id) => isset($meta[$id]))->values()->mapWithKeys(fn ($id) => [$id => $meta[$id]])->all();
    }

    public function hasScenario(string $scenarioId): bool
    {
        return File::exists($this->scenarioDir.'/'.$scenarioId.'.json');
    }

    /**
     * Build a scenario payload carrying the seller's own profile so the call
     * authenticates against the tenant's token and reflects the tenant's real
     * tax profile. Fixture buyer/item data is preserved (it is registered in
     * the PRAL sandbox) and scenarioId/invoice date are kept current.
     */
    public function payloadFor(Tenant $tenant, string $scenarioId): array
    {
        $path = $this->scenarioDir.'/'.$scenarioId.'.json';

        if (! File::exists($path)) {
            throw new InvalidArgumentException('Unknown sandbox scenario: '.$scenarioId);
        }

        if (empty($tenant->seller_ntn_cnic) || empty($tenant->seller_business_name)) {
            throw new InvalidArgumentException('Complete your seller NTN/CNIC and business name in Settings before testing.');
        }

        $payload = json_decode(File::get($path), true);

        if (! is_array($payload)) {
            throw new InvalidArgumentException('Sandbox scenario payload is invalid.');
        }

        $payload['sellerNTNCNIC'] = $tenant->seller_ntn_cnic;
        $payload['sellerBusinessName'] = $tenant->seller_business_name;
        $payload['sellerProvince'] = $tenant->seller_province ?: 'Sindh';
        $payload['sellerAddress'] = $tenant->seller_address ?: $tenant->seller_business_name;
        // PRAL's sandbox clock runs on UTC while this app's default timezone is
        // Asia/Karachi. Using the Karachi date between 00:00-05:00 PKT sends an
        // invoice dated "tomorrow" from PRAL's perspective and returns 0043
        // ("invoice date greater than current date"). The UTC date can never be
        // in the future relative to Pakistan, so stamp that.
        $payload['invoiceDate'] = now('UTC')->format('Y-m-d');
        $payload['scenarioId'] = $scenarioId;

        return $payload;
    }

    /**
     * Validate a single token against one environment (default scenario SN001).
     */
    public function testToken(Tenant $tenant, string $mode, string $scenarioId = 'SN001'): array
    {
        $row = $this->rowFor($tenant, $mode);
        $adapter = $this->adapter($row);

        $raw = $adapter->validateDiagnostic($this->payloadFor($tenant, $scenarioId));
        $verdict = $this->interpret($raw);

        $row->forceFill([
            'status' => $verdict['ok'] ? 'tested' : 'failed',
            'last_test_response' => [
                'kind' => 'token',
                'scenario' => $scenarioId,
                'mode' => $mode,
                'verdict' => $verdict,
            ],
            'last_tested_at' => now(),
        ])->save();

        return [
            'mode' => $mode,
            'scenario' => $scenarioId,
            'tested_at' => $row->fresh()->last_tested_at,
            'result' => $verdict,
            'environment' => $this->environment($tenant, $mode, $adapter),
        ];
    }

    /**
     * Run a suite of scenario validations in sandbox mode.
     */
    public function runScenarios(Tenant $tenant, array $scenarioIds): array
    {
        $row = $this->rowFor($tenant, 'sandbox');
        $adapter = $this->adapter($row);
        $meta = $this->meta();

        $results = [];
        $passed = 0;
        $failed = 0;

        foreach (array_values(array_unique($scenarioIds)) as $scenarioId) {
            $payload = $this->payloadFor($tenant, $scenarioId);
            $verdict = $this->interpret($adapter->validateDiagnostic($payload));

            if ($verdict['ok']) {
                $passed++;
            } else {
                $failed++;
            }

            $results[] = [
                'id' => $scenarioId,
                'name' => $meta[$scenarioId]['name'] ?? $scenarioId,
                'sale_type' => $meta[$scenarioId]['sale_type'] ?? null,
                'buyer' => $meta[$scenarioId]['buyer'] ?? null,
                'ok' => $verdict['ok'],
                'status_code' => $verdict['status_code'],
                'status' => $verdict['status'],
                'error_code' => $verdict['error_code'],
                'error' => $verdict['error'],
            ];
        }

        $row->forceFill([
            'last_test_response' => [
                'kind' => 'scenarios',
                'mode' => 'sandbox',
                'passed' => $passed,
                'failed' => $failed,
                'results' => $results,
            ],
            'last_tested_at' => now(),
        ])->save();

        return [
            'mode' => 'sandbox',
            'total' => count($results),
            'passed' => $passed,
            'failed' => $failed,
            'tested_at' => $row->fresh()->last_tested_at,
            'scenarios' => $results,
        ];
    }

    protected function rowFor(Tenant $tenant, string $mode): FbrIntegration
    {
        $code = $tenant->integrator ?: 'pral';

        return FbrIntegration::query()->firstOrCreate(
            ['tenant_id' => $tenant->id, 'integrator' => $code, 'mode' => $mode],
            ['status' => 'unconfigured'],
        );
    }

    protected function adapter(FbrIntegration $row): PralIntegrator
    {
        $adapter = app(PralIntegrator::class);
        $adapter->configure($row);

        return $adapter;
    }

    protected function interpret(array $raw): array
    {
        $http = (int) ($raw['http_status'] ?? 0);
        $response = $raw['response'] ?? null;
        $vr = is_array($response) ? ($response['validationResponse'] ?? null) : null;

        $statusCode = (string) ($vr['statusCode'] ?? $response['statusCode'] ?? '');
        $status = strtolower((string) ($vr['status'] ?? $response['status'] ?? ''));
        $topErrorCode = (string) ($vr['errorCode'] ?? $response['errorCode'] ?? '');
        $topError = (string) ($vr['error'] ?? $response['error'] ?? '');

        if ($raw['ok'] && ($status === 'valid' || $statusCode === '00')) {
            return [
                'ok' => true,
                'http_status' => $http,
                'status_code' => $statusCode ?: '00',
                'status' => 'Valid',
                'error_code' => null,
                'error' => '',
                'item_errors' => [],
            ];
        }

        $itemErrors = [];
        foreach ((array) ($vr['invoiceStatuses'] ?? []) as $item) {
            $itemStatus = strtolower((string) ($item['status'] ?? $item['statusCode'] ?? ''));
            $code = (string) ($item['errorCode'] ?? '');
            $error = (string) ($item['error'] ?? '');

            if ($itemStatus !== 'valid' && $code !== '00' && ($code !== '' || $error !== '')) {
                $itemErrors[] = [
                    'sno' => (string) ($item['itemSNo'] ?? ''),
                    'error_code' => $code,
                    'error' => $error,
                ];
            }
        }

        $reason = trim($topError);

        if ($reason === '' && $itemErrors !== []) {
            $reason = implode('; ', array_map(
                fn ($e) => trim(($e['error'] ?: 'item '.$e['sno']).($e['error_code'] ? " ({$e['error_code']})" : '')),
                $itemErrors
            ));
        }

        if ($reason === '' && ! $raw['ok']) {
            $reason = (string) ($raw['error'] ?? "FBR returned HTTP {$http}.");
        }

        $message = $this->friendlyMessage($topErrorCode ?: ($itemErrors[0]['error_code'] ?? null), $reason ?: 'The tax authority rejected the request.');

        return [
            'ok' => false,
            'http_status' => $http,
            'status_code' => $statusCode ?: '01',
            'status' => ucfirst($status ?: ($raw['ok'] ? 'Invalid' : 'Error')),
            'error_code' => $topErrorCode ?: ($itemErrors[0]['error_code'] ?? null),
            'error' => $message,
            'item_errors' => $itemErrors,
        ];
    }

    protected function friendlyMessage(?string $code, string $fallback): string
    {
        $map = config('pral.error_codes', []);

        return $code && isset($map[$code]) ? $map[$code] : $fallback;
    }

    protected function environment(Tenant $tenant, string $mode, PralIntegrator $adapter): array
    {
        $reflect = new \ReflectionMethod($adapter, 'token');
        $reflect->setAccessible(true);

        try {
            $token = $reflect->invoke($adapter);
        } catch (\Throwable) {
            $token = null;
        }

        return [
            'mode' => $mode,
            'base_url' => config("pral.{$mode}.base_url"),
            'token_hint' => is_string($token) && $token !== '' ? '••••'.substr($token, -4) : null,
        ];
    }

    protected function meta(): array
    {
        $meta = File::exists($this->scenarioDir.'/meta.php') ? require $this->scenarioDir.'/meta.php' : [];

        return is_array($meta) ? $meta : [];
    }
}
