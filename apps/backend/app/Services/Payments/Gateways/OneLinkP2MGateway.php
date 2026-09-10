<?php

namespace App\Services\Payments\Gateways;

use App\Models\BillingOrder;
use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Services\Payments\AbstractPaymentGateway;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OneLinkP2MGateway extends AbstractPaymentGateway
{
    /**
     * Resolve 1LINK merchant credentials. Values saved from the admin console
     * (encrypted in the `payment_gateways` table) take priority; the .env
     * credentials are only the fallback.
     */
    public function configure(PaymentGateway $model): void
    {
        parent::configure($model);

        foreach ((array) config("saas.payment_gateways.{$this->model->code}.env_credentials", []) as $key => $spec) {
            if (! blank($this->config[$key] ?? null)) {
                continue;
            }

            $envName = is_array($spec) ? ($spec['env'] ?? null) : null;
            $envName = $envName ?: (is_string($spec) ? $spec : $key);
            $value = env($envName);

            if (! blank($value)) {
                $this->config[$key] = $value;
            }
        }
    }

    /**
     * The sandbox environment does not require live merchant credentials.
     */
    protected function requiredKeys(): array
    {
        if ($this->model->is_sandbox) {
            return [];
        }

        return parent::requiredKeys();
    }

    /**
     * Initiate a 1Link P2M payment using various methods (QR, RTP, etc.)
     */
    public function purchase(BillingOrder $order, Payment $payment, array $options = []): array
    {
        $this->assertConfigured();

        $endpoint = $this->model->is_sandbox
            ? ($this->config['sandbox_endpoint'] ?? 'https://sandbox.1link.net.pk')
            : ($this->config['live_endpoint'] ?? 'https://api.1link.net.pk');

        $merchantId = $this->config['merchant_id'] ?? null;
        $apiKey = $this->config['api_key'] ?? null;
        $apiSecret = $this->config['api_secret'] ?? null;
        $paymentMethod = $options['payment_method'] ?? 'rtp'; // rtp, qr, alias, iban

        // Sandbox mode - simulate payment
        if ($this->model->is_sandbox) {
            return [
                'status' => 'pending',
                'redirect_url' => null,
                'provider_reference' => $this->reference(),
                'manual' => true,
                'raw' => [
                    'simulated' => true,
                    'mode' => 'sandbox',
                    'payment_method' => $paymentMethod,
                    'merchant_id' => $merchantId,
                    'amount' => $payment->amount,
                    'currency' => $payment->currency,
                ],
            ];
        }

        // Live mode - make actual API call based on payment method
        try {
            $response = $this->makeApiCall($endpoint, $paymentMethod, [
                'merchantId' => $merchantId,
                'requestId' => $payment->idempotency_key,
                'amount' => (string) $payment->amount,
                'currency' => $payment->currency,
                'description' => "Payment for order {$order->order_number}",
                'customerEmail' => $options['customer_email'] ?? null,
                'customerMobile' => $options['customer_mobile'] ?? null,
                'returnUrl' => $options['return_url'] ?? null,
                'webhookUrl' => $options['webhook_url'] ?? null,
                'iban' => $this->config['iban'] ?? null,
                'alias' => $this->config['alias'] ?? null,
            ], $apiKey, $merchantId);

            if ($response->successful()) {
                $data = $response->json();

                return [
                    'status' => 'pending',
                    'redirect_url' => $data['paymentUrl'] ?? $data['qrCode'] ?? null,
                    'provider_reference' => $data['transactionId'] ?? $data['requestId'] ?? $this->reference(),
                    'manual' => false,
                    'raw' => $data,
                ];
            }

            // API call failed
            Log::error('1Link P2M API Error', [
                'status' => $response->status(),
                'body' => $response->body(),
                'payment_id' => $payment->id,
                'payment_method' => $paymentMethod,
            ]);

            return $this->manualResult($this->reference(), [
                'error' => 'API call failed',
                'status' => $response->status(),
                'response' => $response->body(),
            ]);

        } catch (\Exception $e) {
            Log::error('1Link P2M Gateway Exception', [
                'message' => $e->getMessage(),
                'payment_id' => $payment->id,
                'payment_method' => $paymentMethod,
            ]);

            return $this->manualResult($this->reference(), [
                'error' => $e->getMessage(),
                'exception' => get_class($e),
            ]);
        }
    }

    /**
     * Make API call based on payment method
     */
    protected function makeApiCall(string $endpoint, string $paymentMethod, array $data, string $apiKey, string $merchantId)
    {
        $headers = [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer '.$apiKey,
            'X-merchant-id' => $merchantId,
        ];

        switch ($paymentMethod) {
            case 'qr':
                return Http::withHeaders($headers)
                    ->post($endpoint.'/generateDQRCMerchant', $data);

            case 'rtp':
                return Http::withHeaders($headers)
                    ->post($endpoint.'/rtpNowMerchant', $data);

            case 'rtp_later':
                return Http::withHeaders($headers)
                    ->post($endpoint.'/rtpLaterMerchant', $data);

            case 'alias':
                return Http::withHeaders($headers)
                    ->post($endpoint.'/preRTPAliasInquiryMerchant', $data);

            default:
                return Http::withHeaders($headers)
                    ->post($endpoint.'/rtpNowMerchant', $data);
        }
    }

    /**
     * Verify webhook signature from 1Link P2M
     */
    public function verifyWebhookSignature(array $headers, array $payload): bool
    {
        if ($this->model->is_sandbox) {
            return true;
        }

        // Implement 1Link signature verification
        $signature = $headers['X-Signature'] ?? $headers['x-signature'] ?? null;
        $timestamp = $headers['X-Timestamp'] ?? $headers['x-timestamp'] ?? null;
        $apiSecret = $this->config['api_secret'] ?? null;

        if (!$signature || !$timestamp || !$apiSecret) {
            return false;
        }

        // Create expected signature using HMAC-SHA256
        $expectedSignature = hash_hmac('sha256', $timestamp.json_encode($payload), $apiSecret);

        return hash_equals($expectedSignature, $signature);
    }
}