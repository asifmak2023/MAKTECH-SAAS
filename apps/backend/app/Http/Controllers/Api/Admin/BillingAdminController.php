<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\BillingOrder;
use App\Models\Payment;
use App\Services\BillingService;
use App\Services\Payments\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingAdminController extends Controller
{
    public function __construct(
        protected BillingService $billing,
        protected PaymentService $payments,
    ) {}

    public function orders(Request $request): JsonResponse
    {
        $orders = BillingOrder::query()
            ->with(['tenant:id,name,slug', 'plan', 'package'])
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('type'), fn ($q, $s) => $q->where('order_type', $s))
            ->when($request->query('tenant_id'), fn ($q, $s) => $q->where('tenant_id', $s))
            ->latest()
            ->paginate(20);

        return response()->json($orders);
    }

    public function showOrder(BillingOrder $order): JsonResponse
    {
        return response()->json($order->load('tenant', 'plan', 'package', 'subscription', 'payments', 'billingInvoice'));
    }

    public function invoices(Request $request): JsonResponse
    {
        $invoices = BillingInvoice::query()
            ->with(['tenant:id,name,slug', 'order'])
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(20);

        return response()->json($invoices);
    }

    public function payments(Request $request): JsonResponse
    {
        $payments = Payment::query()
            ->with(['tenant:id,name,slug', 'order'])
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(20);

        return response()->json($payments);
    }

    public function confirmPayment(Request $request, Payment $payment): JsonResponse
    {
        return response()->json([
            'message' => 'Payment confirmed.',
            'payment' => $this->payments->confirmPayment($payment),
        ]);
    }

    public function failPayment(Request $request, Payment $payment): JsonResponse
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:1000']]);

        return response()->json([
            'message' => 'Payment marked as failed.',
            'payment' => $this->payments->markPaymentFailed($payment, $data['reason'] ?? 'Rejected by platform administrator'),
        ]);
    }

    public function refundOrder(Request $request, BillingOrder $order): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $refunded = $this->billing->refundOrder($order, (float) $data['amount'], $data['reason']);

        return response()->json(['message' => 'Refund recorded.', 'order' => $refunded]);
    }
}
