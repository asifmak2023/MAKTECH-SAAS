<?php

namespace App\Services\Payments;

use App\Exceptions\GatewayNotConfiguredException;
use App\Exceptions\PaymentException;
use App\Models\BillingOrder;
use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Services\BillingService;
use App\Services\SaasConfig;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PaymentService
{
    public function __construct(
        protected BillingService $billing,
    ) {}

    /**
     * Gateways the tenant can currently pay with, secrets removed.
     */
    public function enabledGateways(): array
    {
        return PaymentGateway::query()
            ->enabled()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(function (PaymentGateway $gateway) {
                $meta = (array) config("saas.payment_gateways.{$gateway->code}", []);

                return [
                    'code' => $gateway->code,
                    'name' => $gateway->name,
                    'description' => $gateway->description,
                    'sandbox' => $gateway->is_sandbox,
                    'supports_recurring' => (bool) ($meta['supports_recurring'] ?? false),
                    'config' => $gateway->hideCredentials(),
                ];
            })
            ->values()
            ->all();
    }

    public function resolve(string $code): PaymentGateway
    {
        $gateway = PaymentGateway::query()->where('code', $code)->enabled()->first();

        if (! $gateway) {
            throw new GatewayNotConfiguredException($code, 'It is either disabled or not configured. Please pick another method.');
        }

        return $gateway;
    }

    public function adapterFor(PaymentGateway $gateway): PaymentGatewayInterface
    {
        $class = config("saas.payment_gateways.{$gateway->code}.adapter");

        if (! $class || ! class_exists($class)) {
            throw new GatewayNotConfiguredException($gateway->code, 'Adapter missing for this provider.');
        }

        $adapter = app($class);

        if (! $adapter instanceof PaymentGatewayInterface) {
            throw new GatewayNotConfiguredException($gateway->code, 'Adapter does not implement the gateway contract.');
        }

        $adapter->configure($gateway);

        return $adapter;
    }

    public function createPendingPayment(BillingOrder $order, string $gatewayCode): Payment
    {
        return Payment::query()->firstOrCreate(
            ['billing_order_id' => $order->id, 'gateway_code' => $gatewayCode, 'status' => Payment::STATUS_PENDING],
            [
                'tenant_id' => $order->tenant_id,
                'idempotency_key' => 'order-'.$order->id.'-'.$gatewayCode.'-'.Str::uuid(),
                'amount' => $order->total_amount,
                'currency' => $order->currency,
                'initiated_at' => now(),
            ]
        );
    }

    /**
     * Start checkout for an order on a given gateway.
     *
     * @return array{order:BillingOrder, payment:Payment, gateway:array, status:string, manual:bool, redirect_url:?string, provider_reference:?string, message:?string}
     */
    public function checkout(BillingOrder $order, string $gatewayCode, array $options = []): array
    {
        $gateway = $this->resolve($gatewayCode);

        return DB::transaction(function () use ($order, $gateway, $options) {
            $order = $order->fresh();

            if ($order->status === BillingOrder::STATUS_PAID) {
                throw new PaymentException('This order is already paid.', 409);
            }

            if (in_array($order->status, [BillingOrder::STATUS_CANCELLED, BillingOrder::STATUS_REFUNDED, BillingOrder::STATUS_EXPIRED], true)) {
                throw new PaymentException("This order can no longer be paid ({$order->status}). Please create a new order.", 409);
            }

            $payment = $this->createPendingPayment($order, $gateway->code);

            $order->update(['status' => BillingOrder::STATUS_PAYMENT_PROCESSING]);

            $adapter = $this->adapterFor($gateway);
            $urls = $this->gatewayUrls($gateway->code, $order, $payment);

            try {
                $result = $adapter->purchase($order, $payment, array_merge($urls, $options));
            } catch (\Throwable $e) {
                $order->update(['status' => BillingOrder::STATUS_PENDING]);
                $payment->update([
                    'status' => Payment::STATUS_FAILED,
                    'failed_at' => now(),
                    'failure_reason' => $e->getMessage(),
                    'raw_response' => ['error' => $e->getMessage()],
                ]);

                throw $e;
            }

            $payment->update([
                'provider_reference' => $result['provider_reference'] ?? null,
                'gateway_transaction_id' => $result['provider_reference'] ?? $payment->gateway_transaction_id,
                'raw_response' => array_merge((array) $payment->raw_response, $result['raw'] ?? []),
            ]);

            $payment = $payment->fresh();
            $hostedUrl = method_exists($adapter, 'hostedCheckoutUrl') ? $adapter->hostedCheckoutUrl($payment) : null;
            $redirectUrl = $result['redirect_url'] ?? $hostedUrl;

            if (($result['status'] ?? '') === 'paid') {
                $payment->update([
                    'status' => Payment::STATUS_PAID,
                    'paid_at' => now(),
                ]);

                $this->billing->markOrderPaid($order, $payment);

                return [
                    'order' => $order->fresh(),
                    'payment' => $payment->fresh(),
                    'gateway' => ['code' => $gateway->code, 'name' => $gateway->name, 'sandbox' => $gateway->is_sandbox],
                    'status' => 'paid',
                    'manual' => false,
                    'redirect_url' => $redirectUrl,
                    'provider_reference' => $result['provider_reference'] ?? null,
                    'urls' => $urls,
                    'message' => 'Payment successful.',
                ];
            }

            $order->update(['status' => BillingOrder::STATUS_PAYMENT_PROCESSING]);

            return [
                'order' => $order->fresh(),
                'payment' => $payment->fresh(),
                'gateway' => ['code' => $gateway->code, 'name' => $gateway->name, 'sandbox' => $gateway->is_sandbox],
                'status' => $payment->status,
                'manual' => (bool) ($result['manual'] ?? false),
                'redirect_url' => $redirectUrl,
                'provider_reference' => $result['provider_reference'] ?? null,
                'urls' => $urls,
                'message' => $result['manual']
                    ? 'Payment instructions are attached to this order. It will be activated once verified.'
                    : 'Your payment is being processed.',
                'instructions' => $result['raw'] ?? [],
            ];
        });
    }

    /**
     * Public origin of the payer-facing app (configured via WEB_APP_URL).
     */
    public function webAppUrl(): string
    {
        return rtrim((string) config('saas.web.app_url', config('app.url')), '/');
    }

    /**
     * Callback URLs to hand to a payment provider when registering the
     * transaction, built from the public web origin. Return/cancel are payer
     * browser redirects; webhook_url is the server-to-server notify endpoint.
     */
    public function gatewayUrls(string $gatewayCode, ?BillingOrder $order = null, ?Payment $payment = null): array
    {
        $base = $this->webAppUrl();
        $query = array_filter([
            'order' => $order?->id,
            'payment' => $payment?->id,
            'gateway' => $gatewayCode,
        ]);
        $providerReturn = $base.'/api/payments/return/'.$gatewayCode;
        if ($query) {
            $providerReturn .= '?'.http_build_query($query);
        }

        $hosted = $payment
            ? $base.'/api/billing/payments/hosted/'.urlencode((string) $payment->idempotency_key)
            : null;

        return [
            'return_url' => $base.config('saas.payments.return_path', '/billing/payments/return'),
            'cancel_url' => $base.config('saas.payments.cancel_path', '/billing'),
            'webhook_url' => $base.'/'.ltrim((string) config('saas.payments.webhook_prefix', '/api/webhooks'), '/').'/'.$gatewayCode,
            'provider_return_url' => $providerReturn,
            'hosted_url' => $hosted,
        ];
    }

    /**
     * Admin (or verified bank transfer) confirmation that a pending payment cleared.
     */
    public function confirmPayment(Payment $payment): Payment
    {
        return DB::transaction(function () use ($payment) {
            if ($payment->status === Payment::STATUS_PAID) {
                return $payment;
            }

            if (! $payment->billing_order_id) {
                throw new PaymentException('Payment is not linked to an order.');
            }

            $payment->update([
                'status' => Payment::STATUS_PAID,
                'paid_at' => now(),
            ]);

            $this->billing->markOrderPaid($payment->order, $payment);

            return $payment->fresh();
        });
    }

    public function markPaymentFailed(Payment $payment, string $reason): Payment
    {
        $payment->update([
            'status' => Payment::STATUS_FAILED,
            'failed_at' => now(),
            'failure_reason' => $reason,
        ]);

        if ($payment->order && $payment->order->status === BillingOrder::STATUS_PAYMENT_PROCESSING) {
            $payment->order->update(['status' => BillingOrder::STATUS_PENDING]);
        }

        return $payment->fresh();
    }

    public function cancelPending(Payment $payment): Payment
    {
        $payment->update(['status' => Payment::STATUS_CANCELLED]);

        if ($payment->order && $payment->order->status === BillingOrder::STATUS_PAYMENT_PROCESSING) {
            $payment->order->update(['status' => BillingOrder::STATUS_PENDING]);
        }

        return $payment->fresh();
    }

    /**
     * Inbound webhook callback from a gateway. The adapter must verify the
     * signature before we mark anything paid.
     */
    public function handleWebhook(string $gatewayCode, array $headers, array $payload, ?string $transactionId = null): array
    {
        $gateway = $this->resolve($gatewayCode);
        $adapter = $this->adapterFor($gateway);

        if (! $adapter->verifyWebhookSignature($headers, $payload)) {
            throw new PaymentException('Webhook signature verification failed.', 403);
        }

        $transactionId = $transactionId
            ?? $adapter->extractWebhookTransactionId($payload)
            ?? $payload['transaction_id']
            ?? $payload['reference']
            ?? null;

        $payment = Payment::query()
            ->where('gateway_code', $gatewayCode)
            ->where(fn ($q) => $q->where('gateway_transaction_id', $transactionId)->orWhere('provider_reference', $transactionId))
            ->where('status', Payment::STATUS_PENDING)
            ->first();

        if (! $payment) {
            throw new PaymentException('No pending payment matches this webhook.', 404);
        }

        $status = $adapter->webhookPaymentStatus($payload);

        if ($status === 'pending') {
            $payment->update([
                'raw_response' => array_merge((array) $payment->raw_response, ['ipn' => $payload]),
            ]);

            return ['handled' => true, 'status' => 'pending', 'order' => $payment->billing_order_id];
        }

        if ($status === 'failed') {
            $this->markPaymentFailed(
                $payment,
                (string) ($payload['pp_ResponseMessage'] ?? $payload['transactionStatus'] ?? $payload['message'] ?? 'Gateway declined the payment.')
            );

            return ['handled' => true, 'status' => 'failed', 'order' => $payment->billing_order_id];
        }

        $this->confirmPayment($payment);

        return ['handled' => true, 'status' => 'paid', 'order' => $payment->billing_order_id];
    }

    /**
     * Scheduled: expire abandoned payments/orders older than the configured window.
     */
    public function expireAbandonedPayments(?int $hours = null): int
    {
        $hours = $hours ?? (int) SaasConfig::get('billing', 'payment_expiry_hours', 24);
        $cutoff = now()->subHours(max(1, $hours));

        $orders = BillingOrder::query()
            ->where('status', BillingOrder::STATUS_PAYMENT_PROCESSING)
            ->where('updated_at', '<', $cutoff)
            ->get();

        foreach ($orders as $order) {
            $order->payments()->where('status', Payment::STATUS_PENDING)->update([
                'status' => Payment::STATUS_EXPIRED,
            ]);

            $order->update(['status' => BillingOrder::STATUS_EXPIRED]);
        }

        return $orders->count();
    }
}
