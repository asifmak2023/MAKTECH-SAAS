<?php

namespace App\Services\Payments\Gateways;

use App\Models\BillingOrder;
use App\Models\Payment;
use App\Services\Payments\AbstractPaymentGateway;

class EasypaisaGateway extends AbstractPaymentGateway
{
    protected function requiredKeys(): array
    {
        if ($this->model->is_sandbox) {
            return [];
        }

        return ['merchant_id', 'api_secret'];
    }

    public function purchase(BillingOrder $order, Payment $payment, array $options = []): array
    {
        $this->assertConfigured();

        $endpoint = $this->model->is_sandbox
            ? ($this->config['sandbox_endpoint'] ?? 'https://easypaystg.easypaisa.com.pk/easypay/Index.jsf')
            : ($this->config['live_endpoint'] ?? 'https://easypay.easypaisa.com.pk/easypay/Index.jsf');

        $storeId = $this->config['merchant_id'] ?? ($this->model->is_sandbox ? 'SANDBOX' : null);
        $secret = $this->config['api_secret'] ?? ($this->model->is_sandbox ? 'SANDBOX_SECRET' : null);

        if (! $storeId || ! $secret) {
            return $this->manualResult($this->reference(), [
                'error' => 'Missing merchant_id or api_secret configuration',
                'required_fields' => ['merchant_id', 'api_secret'],
                'mode' => $this->model->is_sandbox ? 'sandbox' : 'live',
            ]);
        }

        $orderRef = $this->txnRef($payment);
        $amount = number_format((float) $payment->amount, 2, '.', '');
        $expiry = now('Asia/Karachi')->addDay()->format('Ymd His');

        $fields = [
            'storeId' => $storeId,
            'amount' => $amount,
            'postBackURL' => $options['provider_return_url'] ?? $options['return_url'] ?? '',
            'orderRefNum' => $orderRef,
            'expiryDate' => $expiry,
            'autoRedirect' => '1',
            'paymentMethod' => 'MA_PAYMENT_METHOD',
        ];

        if (! blank($this->config['api_key'] ?? null)) {
            $fields['api_key'] = $this->config['api_key'];
        }

        $fields['merchantHashedReq'] = static::makeSecureHash($fields, $secret);

        return [
            'status' => 'pending',
            'redirect_url' => $options['hosted_url'] ?? null,
            'provider_reference' => $orderRef,
            'manual' => false,
            'raw' => [
                'hosted_action' => $endpoint,
                'hosted_method' => 'POST',
                'hosted_fields' => $fields,
                'mode' => $this->model->is_sandbox ? 'sandbox' : 'live',
            ],
        ];
    }

    public function verifyWebhookSignature(array $headers, array $payload): bool
    {
        if ($this->model->is_sandbox) {
            return true;
        }

        $secret = $this->config['api_secret'] ?? null;
        $signature = $payload['merchantHashedReq']
            ?? $payload['hash']
            ?? $payload['signature']
            ?? $this->headerValue($headers, 'X-Signature');

        if (! $secret || ! $signature) {
            return false;
        }

        return hash_equals(static::makeSecureHash($payload, $secret), (string) $signature);
    }

    public function extractWebhookTransactionId(array $payload): ?string
    {
        foreach (['orderRefNum', 'order_id', 'orderId', 'transaction_id', 'reference'] as $key) {
            if (! blank($payload[$key] ?? null)) {
                return (string) $payload[$key];
            }
        }

        return parent::extractWebhookTransactionId($payload);
    }

    public function webhookPaymentStatus(array $payload): string
    {
        $status = $payload['transactionStatus']
            ?? $payload['status']
            ?? $payload['response_code']
            ?? $payload['responseCode']
            ?? null;

        if ($status === null || $status === '') {
            return 'paid';
        }

        $status = strtolower((string) $status);

        if (in_array($status, ['paid', 'success', 'successful', '000', 'completed', 'captured'], true)) {
            return 'paid';
        }

        if (in_array($status, ['pending', 'inprogress', 'in_progress', 'initiated'], true)) {
            return 'pending';
        }

        return 'failed';
    }

    public static function makeSecureHash(array $fields, string $secret): string
    {
        $data = $fields;
        unset($data['merchantHashedReq'], $data['hash'], $data['signature']);
        ksort($data);

        $parts = [];
        foreach ($data as $value) {
            if ($value !== null && $value !== '') {
                $parts[] = $value;
            }
        }

        return hash_hmac('sha256', implode('&', $parts), $secret);
    }

    protected function txnRef(Payment $payment): string
    {
        $base = preg_replace('/[^A-Za-z0-9]/', '', (string) $payment->idempotency_key) ?: $this->reference();

        return strtoupper(substr('EP'.$base, 0, 20));
    }

    protected function headerValue(array $headers, string $name): ?string
    {
        $value = $headers[$name] ?? $headers[strtolower($name)] ?? null;

        if (is_array($value)) {
            $value = $value[0] ?? null;
        }

        return $value !== null && $value !== '' ? (string) $value : null;
    }
}
