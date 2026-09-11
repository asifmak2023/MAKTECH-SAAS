<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Response;

class HostedCheckoutController extends Controller
{
    public function show(string $key): Response
    {
        $payment = Payment::query()->where('idempotency_key', $key)->firstOrFail();

        if ($payment->status !== Payment::STATUS_PENDING) {
            abort(410, 'This checkout is no longer available.');
        }

        $raw = (array) $payment->raw_response;
        $action = $raw['hosted_action'] ?? null;
        $fields = $raw['hosted_fields'] ?? null;

        if (! $action || ! is_array($fields) || $fields === []) {
            abort(404, 'No hosted checkout is available for this payment.');
        }

        return response()->view('payments.hosted', [
            'action' => $action,
            'method' => strtoupper((string) ($raw['hosted_method'] ?? 'POST')),
            'fields' => $fields,
            'gateway' => $payment->gateway_code,
        ]);
    }
}
