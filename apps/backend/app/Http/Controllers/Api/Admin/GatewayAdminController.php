<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GatewayAdminController extends Controller
{
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
                    'config' => $gateway->hideCredentials(),
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

        $current = $gateway->configArray();

        if (isset($data['is_enabled'])) {
            $gateway->is_enabled = (bool) $data['is_enabled'];
        }

        if (isset($data['is_sandbox'])) {
            $gateway->is_sandbox = (bool) $data['is_sandbox'];
        }

        if (isset($data['config'])) {
            foreach ($data['config'] as $key => $value) {
                // Ignore masked sentinel values that admin UIs send back.
                if (is_string($value) && str_contains($value, '••••')) {
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
            'config' => $gateway->hideCredentials(),
        ]);
    }
}
