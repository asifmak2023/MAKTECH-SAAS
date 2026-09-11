<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\PaymentException;
use App\Http\Controllers\Controller;
use App\Models\BillingOrder;
use App\Models\Payment;
use App\Models\PaymentGateway;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Models\UsagePackage;
use App\Services\BillingService;
use App\Services\EntitlementService;
use App\Services\Payments\PaymentService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    public function __construct(
        protected BillingService $billing,
        protected EntitlementService $entitlement,
        protected PaymentService $payments,
    ) {}

    public function tenant(): Tenant
    {
        return TenantContext::get() ?? abort(400, 'Tenant context missing.');
    }

    public function summary(): JsonResponse
    {
        $tenant = $this->tenant();
        $subscription = $tenant->activeSubscription;

        return response()->json([
            'tenant' => $tenant->only(['id', 'slug', 'name', 'status', 'is_active', 'currency', 'fbr_mode', 'integrator']),
            'currency' => $tenant->currency ?? 'PKR',
            'billing_mode' => $tenant->settings['billing_mode'] ?? 'payg',
            'free_invoice_credits' => (int) ($tenant->settings['free_invoice_credits'] ?? 0),
            'usage' => $this->entitlement->usageSummary($tenant),
            'outstanding_balance' => $this->billing->outstandingBalance($tenant),
            'subscription' => $subscription ? [
                'id' => $subscription->id,
                'plan' => $subscription->plan?->name,
                'plan_id' => $subscription->subscription_plan_id,
                'status' => $subscription->status,
                'interval' => $subscription->billing_interval,
                'price' => (float) $subscription->price,
                'invoice_limit' => $subscription->invoice_limit,
                'current_period_end' => $subscription->current_period_end,
                'next_billing_date' => $subscription->next_billing_date,
                'grace_ends_at' => $subscription->grace_ends_at,
                'auto_renew' => (bool) $subscription->auto_renew,
            ] : null,
            'open_orders' => $tenant->billingOrders()
                ->whereIn('status', [BillingOrder::STATUS_PENDING, BillingOrder::STATUS_PAYMENT_PROCESSING])
                ->count(),
            'payment_gateways' => $this->payments->enabledGateways(),
        ]);
    }

    public function orders(): JsonResponse
    {
        $orders = $this->tenant()->billingOrders()
            ->with(['plan', 'package'])
            ->latest()
            ->paginate(15);

        return response()->json($orders);
    }

    public function showOrder(BillingOrder $order): JsonResponse
    {
        $this->authorizeOrder($order);

        return response()->json($order->load('plan', 'package', 'payments', 'billingInvoice'));
    }

    public function invoices(): JsonResponse
    {
        $invoices = $this->tenant()->billingInvoices()->with('order')->latest()->paginate(15);

        return response()->json($invoices);
    }

    public function payments(): JsonResponse
    {
        $payments = $this->tenant()->payments()->with('order')->latest()->paginate(15);

        return response()->json($payments);
    }

    public function usage(): JsonResponse
    {
        $tenant = $this->tenant();

        return response()->json([
            'usage' => $this->entitlement->usageSummary($tenant),
            'recent_events' => $tenant->invoices()
                ->whereNotNull('usage_consumed_at')
                ->latest()
                ->limit(20)
                ->get(['id', 'invoice_ref_no', 'status', 'usage_source_type', 'usage_consumed_at', 'submitted_at']),
        ]);
    }

    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subscription_plan_id' => ['required', 'integer'],
            'interval' => ['required', 'in:monthly,yearly'],
            'gateway' => ['required', 'string'],
            'auto_renew' => ['sometimes', 'boolean'],
        ]);

        $plan = SubscriptionPlan::query()->where('is_active', true)->findOrFail($data['subscription_plan_id']);
        $tenant = $this->tenant();

        ['order' => $order, 'subscription' => $subscription] = $this->billing->beginSubscription(
            $tenant,
            $plan,
            $data['interval'],
            (bool) ($data['auto_renew'] ?? true),
        );

        try {
            $result = $this->payments->checkout($order, $data['gateway']);
        } catch (\Throwable $e) {
            $subscription->update([
                'status' => \App\Models\TenantSubscription::STATUS_CANCELLED,
                'cancelled_at' => now(),
            ]);

            throw $e;
        }

        return response()->json([
            'order' => $result['order'],
            'subscription' => $subscription->fresh(),
            'payment' => $result['payment'],
            'gateway' => $result['gateway'],
            'status' => $result['status'],
            'manual' => $result['manual'],
            'message' => $result['message'],
            'urls' => $result['urls'] ?? $this->payments->gatewayUrls($data['gateway']),
            'redirect_url' => $result['redirect_url'] ?? null,
            'instructions' => $result['instructions'] ?? [],
        ], $result['status'] === 'paid' ? 200 : 202);
    }

    public function buyPackage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'usage_package_id' => ['required', 'integer'],
            'gateway' => ['required', 'string'],
        ]);

        $package = UsagePackage::query()->where('is_active', true)->findOrFail($data['usage_package_id']);
        $tenant = $this->tenant();

        $order = $this->billing->createPackageOrder($tenant, $package);

        $result = $this->payments->checkout($order, $data['gateway']);

        return response()->json([
            'order' => $result['order'],
            'payment' => $result['payment'],
            'gateway' => $result['gateway'],
            'status' => $result['status'],
            'manual' => $result['manual'],
            'message' => $result['message'],
            'urls' => $result['urls'] ?? $this->payments->gatewayUrls($data['gateway']),
            'redirect_url' => $result['redirect_url'] ?? null,
            'instructions' => $result['instructions'] ?? [],
        ], $result['status'] === 'paid' ? 200 : 202);
    }

    public function settleOverage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'gateway' => ['required', 'string'],
        ]);

        $tenant = $this->tenant();

        $order = $this->billing->createOverageOrder($tenant);

        if (! $order) {
            return response()->json(['message' => 'There is no outstanding usage to settle.'], 200);
        }

        $result = $this->payments->checkout($order, $data['gateway']);

        return response()->json([
            'order' => $result['order'],
            'payment' => $result['payment'],
            'gateway' => $result['gateway'],
            'status' => $result['status'],
            'manual' => $result['manual'],
            'message' => $result['message'],
            'urls' => $result['urls'] ?? $this->payments->gatewayUrls($data['gateway']),
            'redirect_url' => $result['redirect_url'] ?? null,
            'instructions' => $result['instructions'] ?? [],
        ], $result['status'] === 'paid' ? 200 : 202);
    }

    public function payOrder(Request $request, BillingOrder $order): JsonResponse
    {
        $this->authorizeOrder($order);

        $data = $request->validate(['gateway' => ['required', 'string']]);

        $result = $this->payments->checkout($order, $data['gateway']);

        return response()->json($result);
    }

    /**
     * Seller-side completion for sandbox gateway payments. A plan is only
     * activated once this simulated Raast P2M payment succeeds; live gateway
     * payments keep being confirmed by the gateway webhook / platform admin.
     */
    public function completeSandboxPayment(Payment $payment): JsonResponse
    {
        if ((int) $payment->tenant_id !== (int) $this->tenant()->id) {
            abort(404, 'Payment not found.');
        }

        $gateway = PaymentGateway::query()->where('code', $payment->gateway_code)->first();

        if (! $gateway || ! $gateway->is_sandbox) {
            throw new PaymentException(
                'This payment cannot be completed from the seller console. It is confirmed once it clears at the gateway.',
                403
            );
        }

        if ($payment->status !== Payment::STATUS_PENDING) {
            throw new PaymentException('This payment is not awaiting completion.', 409);
        }

        $order = $payment->order;

        if (! $order || in_array($order->status, [
            BillingOrder::STATUS_CANCELLED,
            BillingOrder::STATUS_REFUNDED,
            BillingOrder::STATUS_EXPIRED,
            BillingOrder::STATUS_PAID,
        ], true)) {
            throw new PaymentException('This order can no longer be paid.', 409);
        }

        $this->payments->confirmPayment($payment);

        $subscription = $order->tenant_subscription_id
            ? TenantSubscription::query()->with('plan')->find($order->tenant_subscription_id)
            : null;

        return response()->json([
            'payment' => $payment->fresh(),
            'order' => $order->fresh(),
            'subscription' => $subscription,
            'status' => 'paid',
            'message' => 'Payment successful. Your subscription is now active.',
        ]);
    }

    public function cancelOrder(BillingOrder $order): JsonResponse
    {
        $this->authorizeOrder($order);

        if ($order->status !== BillingOrder::STATUS_PENDING && $order->status !== BillingOrder::STATUS_PAYMENT_PROCESSING) {
            throw new PaymentException('This order can no longer be cancelled.', 409);
        }

        $order->payments()->where('status', 'pending')->update(['status' => 'cancelled']);
        $order->update(['status' => BillingOrder::STATUS_CANCELLED]);

        return response()->json($order->fresh());
    }

    protected function authorizeOrder(BillingOrder $order): void
    {
        abort_unless((int) $order->tenant_id === (int) $this->tenant()->id, 403, 'Not your order.');
    }
}
