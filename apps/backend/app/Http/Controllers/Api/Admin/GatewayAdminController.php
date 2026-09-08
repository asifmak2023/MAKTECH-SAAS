<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GatewayAdminController extends Controller
{
    private const SECRET_HINTS = ['secret', 'password', 'salt'];

    protected function isSecretKey(string $key): bool
    {
        $key = strtolower($key);

        if (str_contains($key, 'api_key') || str_contains($key, 'api_key_id')) {
            return true;
        }

        foreach (self::SECRET_HINTS as $hint) {
            if (str_contains($key, $hint)) {
                return true;
            }
        }

        return false;
    }

    protected function labelFor(string $key): string
    {
        $labels = [
            'merchant_id' => 'Merchant ID',
            'api_key' => 'API Key',
            'api_secret' => 'API Secret',
            'password' => 'Password',
            'integrity_salt' => 'Integrity Salt',
            'iban' => 'IBAN',
            'alias' => 'Raast Alias',
            'sandbox_endpoint' => 'Sandbox Endpoint',
            'live_endpoint' => 'Live Endpoint',
            'auto_approve' => 'Auto-approve payments',
            'bank_name' => 'Bank Name',
            'account_title' => 'Account Title',
            'account_number' => 'Account Number',
            'instructions' => 'Payment Instructions',
        ];

        return $labels[$key] ?? ucfirst(str_replace(['_', '-'], ' ', $key));
    }

    /**
     * Field metadata (never actual secret values) so the admin console can
     * render an editable form for every configured provider.
     */
    protected function fieldMetaFor(PaymentGateway $gateway): array
    {
        $code = $gateway->code;
        $keys = (array) config("saas.payment_gateways.{$code}.config_keys", []);
        $stored = $gateway->configArray();
        $envCreds = (array) config("saas.payment_gateways.{$code}.env_credentials", []);

        return collect($keys)->map(function (string $key) use ($stored, $envCreds) {
            $secret = $this->isSecretKey($key);
            $spec = $envCreds[$key] ?? null;
            $envName = is_array($spec) ? ($spec['env'] ?? null) : (is_string($spec) ? $spec : null);
            $hasEnv = $envName ? ! blank(env($envName)) : false;
            $dbValue = $stored[$key] ?? null;
            $fromDb = ! blank($dbValue);

            return [
                'key' => $key,
                'label' => $this->labelFor($key),
                'secret' => $secret,
                'value' => $secret ? null : ($fromDb ? $dbValue : null),
                'stored' => $fromDb,
                'env_name' => $envName,
                'from_env' => $hasEnv && ! $fromDb,
            ];
        })->all();
    }

    public function index(): JsonResponse
    {
        $rows = PaymentGateway::query()->orderBy('sort_order')->orderBy('id')->get()
            ->map(function (PaymentGateway $gateway) {
                $meta = (array) config("saas.payment_gateways.{$gateway->code}", []);

                return [
                    'id' => $gateway->id,
                    'code' => $gateway->code,
                    'name' => $gateway->name,
                    'description' => $gateway->description,
                    'is_enabled' => $gateway->is_enabled,
                    'is_sandbox' => $gateway->is_sandbox,
                    'config_keys' => $meta['config_keys'] ?? [],
                    'supports_recurring' => $meta['supports_recurring'] ?? false,
                    'adapter' => $meta['adapter'] ?? null,
                    'fields' => $this->fieldMetaFor($gateway),
                ];
            })
            ->values();

        return response()->json($rows);
    }

    /**
     * (Re)create rows for every built-in provider declared in config/saas.php.
     */
    public function seed(): JsonResponse
    {
        $created = 0;

        foreach ((array) config('saas.payment_gateways', []) as $code => $meta) {
            $exists = PaymentGateway::query()->where('code', $code)->exists();

            PaymentGateway::query()->updateOrCreate(
                ['code' => $code],
                [
                    'name' => $meta['name'] ?? $code,
                    'is_enabled' => (bool) ($meta['enabled'] ?? false),
                    'is_sandbox' => true,
                ]
            );

            if (! $exists) {
                $created++;
            }
        }

        return response()->json(['message' => 'Payment gateway rows synced.', 'created' => $created]);
    }

    public function update(Request $request, PaymentGateway $gateway): JsonResponse
    {
        $data = $request->validate([
            'is_enabled' => ['sometimes', 'boolean'],
            'is_sandbox' => ['sometimes', 'boolean'],
            'config' => ['sometimes', 'array'],
        ]);

        $allowed = (array) config("saas.payment_gateways.{$gateway->code}.config_keys", []);
        $current = $gateway->configArray();

        if (isset($data['is_enabled'])) {
            $gateway->is_enabled = (bool) $data['is_enabled'];
        }

        if (isset($data['is_sandbox'])) {
            $gateway->is_sandbox = (bool) $data['is_sandbox'];
        }

        if (isset($data['config'])) {
            foreach ($data['config'] as $key => $value) {
                if (! in_array($key, $allowed, true)) {
                    continue;
                }

                // Ignore masked sentinel values that admin UIs send back.
                if (is_string($value) && str_contains($value, '••••')) {
                    continue;
                }

                // Blank/null clears the field so the .env fallback (if any)
                // resumes. Empty strings arrive as null via the global
                // ConvertEmptyStringsToNull middleware.
                if ($value === null || (is_string($value) && trim($value) === '')) {
                    unset($current[$key]);
                    continue;
                }

                $current[$key] = $value;
            }

            $gateway->setConfigArray($current);
        }

        $gateway->save();
        $gateway->refresh();

        return response()->json([
            'id' => $gateway->id,
            'code' => $gateway->code,
            'name' => $gateway->name,
            'is_enabled' => $gateway->is_enabled,
            'is_sandbox' => $gateway->is_sandbox,
            'fields' => $this->fieldMetaFor($gateway),
        ]);
    }
}
