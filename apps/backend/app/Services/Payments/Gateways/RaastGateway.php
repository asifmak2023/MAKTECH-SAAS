<?php

namespace App\Services\Payments\Gateways;

use App\Models\BillingOrder;
use App\Models\Payment;
use App\Services\Payments\AbstractPaymentGateway;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RaastGateway extends AbstractPaymentGateway
{
    /**
     * The sandbox environment simulates the Raast P2M hosted checkout, so it
     * does not require live merchant credentials. Live mode still demands a
     * configured merchant (merchant_id / api_key / etc.).
     */
    protected function requiredKeys(): array
    {
        if ($this->model->is_sandbox) {
            return [];
        }

        return parent::requiredKeys();
    }

    /**
     * Initiate a Raast P2M payment using Request to Pay (RTP) via 1Link Direct
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

        if (!$merchantId || !$apiKey) {
            return $this->manualResult($this->reference(), [
                'error' => 'Missing merchant_id or api_key configuration',
                'required_fields' => ['merchant_id', 'api_key'],
            ]);
        }

        // Make actual API call to 1Link P2M API
        try {
            $response = Http::withHeaders([
                'Accept' => 'application/json',
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer '.$apiKey,
                'X-Merchant-Id' => $merchantId,
            ])->post($endpoint.'/rtpNowMerchant', [
                'merchantId' => $merchantId,
                'requestId' => $payment->idempotency_key,
                'amount' => (string) $payment->amount,
                'currency' => $payment->currency,
                'description' => "Payment for order {$order->order_number}",
                'customerEmail' => $options['customer_email'] ?? null,
                'customerMobile' => $options['customer_mobile'] ?? null,
                'returnUrl' => $options['return_url'] ?? null,
                'webhookUrl' => $options['webhook_url'] ?? null,
            ]);

            if ($response->successful()) {
                $data = $response->json();

                return [
                    'status' => 'pending',
                    'redirect_url' => $data['paymentUrl'] ?? $data['payment_url'] ?? null,
                    'provider_reference' => $data['transactionId'] ?? $data['transaction_id'] ?? $this->reference(),
                    'manual' => false,
                    'raw' => $data,
                ];
            }

            // API call failed - fall back to manual mode
            Log::error('Raast API Error', [
                'status' => $response->status(),
                'body' => $response->body(),
                'payment_id' => $payment->id,
                'mode' => $this->model->is_sandbox ? 'sandbox' : 'live',
                'endpoint' => $endpoint,
            ]);

            return $this->manualResult($this->reference(), [
                'error' => 'API call failed',
                'status' => $response->status(),
                'response' => $response->body(),
                'mode' => $this->model->is_sandbox ? 'sandbox' : 'live',
            ]);

        } catch (\Exception $e) {
            Log::error('Raast Gateway Exception', [
                'message' => $e->getMessage(),
                'payment_id' => $payment->id,
                'mode' => $this->model->is_sandbox ? 'sandbox' : 'live',
                'endpoint' => $endpoint,
            ]);

            return $this->manualResult($this->reference(), [
                'error' => $e->getMessage(),
                'exception' => get_class($e),
                'mode' => $this->model->is_sandbox ? 'sandbox' : 'live',
            ]);
        }
    }

    /**
     * Sandbox callbacks are simulated and carry no HMAC, so they are accepted
     * as-is to let the full webhook flow be exercised. Live Raast P2M
     * notifications are 1LINK-signed; that signature verification must be
     * wired here against the real initiation API before taking live payments.
     */
    public function verifyWebhookSignature(array $headers, array $payload): bool
    {
        if ($this->model->is_sandbox) {
            return true;
        }

        // Implement 1Link signature verification for production
        $signature = $headers['X-Signature'] ?? $headers['x-signature'] ?? null;
        $timestamp = $headers['X-Timestamp'] ?? $headers['x-timestamp'] ?? null;
        $apiSecret = $this->config['api_secret'] ?? null;

        if (!$signature || !$timestamp || !$apiSecret) {
            return false;
        }

        // Create expected signature
        $expectedSignature = hash_hmac('sha256', $timestamp.json_encode($payload), $apiSecret);

        return hash_equals($expectedSignature, $signature);
    }
}
