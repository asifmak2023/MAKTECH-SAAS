<?php

namespace App\Services\Payments;

use App\Models\BillingOrder;
use App\Models\Payment;
use App\Models\PaymentGateway;

interface PaymentGatewayInterface
{
    public function code(): string;

    public function name(): string;

    /**
     * Load the DB configuration row (encrypted secrets are already decrypted by
     * the model's configArray()). Throw GatewayNotConfiguredException when the
     * provider is not ready to take live payments.
     */
    public function configure(PaymentGateway $model): void;

    /**
     * Initiate a payment for an order.
     *
     * @return array{status:string, redirect_url:?string, provider_reference:?string, manual:bool, raw:array}
     */
    public function purchase(BillingOrder $order, Payment $payment, array $options = []): array;

    /**
     * Return true when the webhook payload can be trusted for this gateway.
     */
    public function verifyWebhookSignature(array $headers, array $payload): bool;

    public function extractWebhookTransactionId(array $payload): ?string;

    /**
     * Map a verified IPN payload to paid, failed, or pending.
     */
    public function webhookPaymentStatus(array $payload): string;
}
