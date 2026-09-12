<?php

namespace App\Services\Payments\Gateways;

use App\Models\BillingOrder;
use App\Models\Payment;
use App\Services\Payments\AbstractPaymentGateway;

class JazzCashGateway extends AbstractPaymentGateway
{
    protected function requiredKeys(): array
    {
        if ($this->model->is_sandbox) {
            return [];
        }

        return ['merchant_id', 'password', 'integrity_salt'];
    }

    public function purchase(BillingOrder $order, Payment $payment, array $options = []): array
    {
        $this->assertConfigured();

        $endpoint = $this->model->is_sandbox
            ? ($this->config['sandbox_endpoint'] ?? 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/')
            : ($this->config['live_endpoint'] ?? 'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/');

        $merchantId = $this->config['merchant_id'] ?? ($this->model->is_sandbox ? 'SANDBOX' : null);
        $password = $this->config['password'] ?? ($this->model->is_sandbox ? 'SANDBOX' : null);
        $salt = $this->config['integrity_salt'] ?? ($this->model->is_sandbox ? 'SANDBOX_SALT' : null);

        if (! $merchantId || ! $password || ! $salt) {
            return $this->manualResult($this->reference(), [
                'error' => 'Missing merchant_id, password or integrity_salt configuration',
                'required_fields' => ['merchant_id', 'password', 'integrity_salt'],
                'mode' => $this->model->is_sandbox ? 'sandbox' : 'live',
            ]);
        }

        $txnRef = $this->txnRef($payment);
        $now = now('Asia/Karachi');
        $amountPaisa = (string) (int) round(((float) $payment->amount) * 100);

        $fields = [
            'pp_Version' => '1.1',
            'pp_TxnType' => 'MWALLET',
            'pp_Language' => 'EN',
            'pp_MerchantID' => $merchantId,
            'pp_Password' => $password,
            'pp_TxnRefNo' => $txnRef,
            'pp_Amount' => $amountPaisa,
            'pp_TxnCurrency' => $payment->currency ?: 'PKR',
            'pp_TxnDateTime' => $now->format('YmdHis'),
            'pp_BillReference' => $order->order_number,
            'pp_Description' => 'Payment for order '.$order->order_number,
            'pp_TxnExpiryDateTime' => $now->copy()->addDay()->format('YmdHis'),
            'pp_ReturnURL' => $options['provider_return_url'] ?? $options['return_url'] ?? '',
            'ppmpf_1' => (string) $payment->id,
            'ppmpf_2' => (string) $order->id,
        ];

        $fields['pp_SecureHash'] = static::makeSecureHash($fields, $salt);

        return [
            'status' => 'pending',
            'redirect_url' => $options['hosted_url'] ?? null,
            'provider_reference' => $txnRef,
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

        $salt = $this->config['integrity_salt'] ?? null;
        $signature = $payload['pp_SecureHash'] ?? $payload['secure_hash'] ?? null;

        if (! $salt || ! $signature) {
            return false;
        }

        return hash_equals(static::makeSecureHash($payload, $salt), (string) $signature);
    }

    public function extractWebhookTransactionId(array $payload): ?string
    {
        foreach (['pp_TxnRefNo', 'transaction_id', 'reference'] as $key) {
            if (! blank($payload[$key] ?? null)) {
                return (string) $payload[$key];
            }
        }

        return parent::extractWebhookTransactionId($payload);
    }

    public function webhookPaymentStatus(array $payload): string
    {
        $code = $payload['pp_ResponseCode'] ?? $payload['response_code'] ?? null;

        if ($code === null || $code === '') {
            return 'paid';
        }

        $code = (string) $code;

        if ($code === '000') {
            return 'paid';
        }

        if (in_array($code, ['124', '157'], true)) {
            return 'pending';
        }

        return 'failed';
    }

    public static function makeSecureHash(array $fields, string $salt): string
    {
        $data = $fields;
        unset($data['pp_SecureHash'], $data['secure_hash']);
        ksort($data);

        $str = $salt;
        foreach ($data as $value) {
            if ($value !== null && $value !== '') {
                $str .= '&'.$value;
            }
        }

        return hash_hmac('sha256', $str, $salt);
    }

    protected function txnRef(Payment $payment): string
    {
        $base = preg_replace('/[^A-Za-z0-9]/', '', (string) $payment->idempotency_key) ?: $this->reference();

        return strtoupper(substr('JC'.$base, 0, 20));
    }
}
