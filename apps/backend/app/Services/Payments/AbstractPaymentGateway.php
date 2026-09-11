<?php

namespace App\Services\Payments;

use App\Exceptions\GatewayNotConfiguredException;
use App\Models\Payment;
use App\Models\PaymentGateway;
use Illuminate\Support\Str;

abstract class AbstractPaymentGateway implements PaymentGatewayInterface
{
    protected PaymentGateway $model;

    protected array $config = [];

    public function configure(PaymentGateway $model): void
    {
        $this->model = $model;
        $this->config = $model->configArray();
    }

    public function code(): string
    {
        return $this->model->code;
    }

    public function name(): string
    {
        return $this->model->name;
    }

    /**
     * Keys that must be present and non-empty before this gateway may be used.
     */
    protected function requiredKeys(): array
    {
        return (array) config("saas.payment_gateways.{$this->model->code}.config_keys", []);
    }

    protected function assertConfigured(): void
    {
        foreach ($this->requiredKeys() as $key) {
            if (blank($this->config[$key] ?? null)) {
                throw new GatewayNotConfiguredException(
                    $this->model->code,
                    "Missing configuration key [{$key}]. Add it in Admin > Payment Gateways."
                );
            }
        }
    }

    protected function reference(): string
    {
        return strtoupper($this->model->code).'_'.Str::upper(Str::random(8));
    }

    protected function manualResult(string $reference, array $extra = []): array
    {
        return [
            'status' => 'pending',
            'redirect_url' => null,
            'provider_reference' => $reference,
            'manual' => true,
            'raw' => $extra,
        ];
    }

    public function verifyWebhookSignature(array $headers, array $payload): bool
    {
        return false; // gateways without webhooks verify manually
    }

    public function extractWebhookTransactionId(array $payload): ?string
    {
        foreach (['transaction_id', 'reference'] as $key) {
            if (! blank($payload[$key] ?? null)) {
                return (string) $payload[$key];
            }
        }

        return null;
    }

    public function webhookPaymentStatus(array $payload): string
    {
        return 'paid';
    }

    public function hostedCheckoutUrl(Payment $payment): ?string
    {
        $raw = (array) $payment->raw_response;

        if (blank($raw['hosted_action'] ?? null) || ! is_array($raw['hosted_fields'] ?? null)) {
            return null;
        }

        $base = rtrim((string) config('saas.web.app_url', config('app.url')), '/');

        return $base.'/api/billing/payments/hosted/'.urlencode($payment->idempotency_key);
    }
}
