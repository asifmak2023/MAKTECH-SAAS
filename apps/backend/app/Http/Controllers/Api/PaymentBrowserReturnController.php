<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Payments\PaymentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class PaymentBrowserReturnController extends Controller
{
    public function __construct(
        protected PaymentService $payments,
    ) {}

    public function handle(Request $request, string $gateway): RedirectResponse
    {
        try {
            $this->payments->handleWebhook(
                $gateway,
                $request->headers->all(),
                $request->all(),
            );
        } catch (\Throwable) {
        }

        $order = $request->query('order')
            ?? $request->input('order')
            ?? $request->input('ppmpf_2')
            ?? $request->input('pp_BillReference');
        $payment = $request->query('payment')
            ?? $request->input('payment')
            ?? $request->input('ppmpf_1');

        $target = $this->payments->webAppUrl().config('saas.payments.return_path', '/billing/payments/return');
        $query = array_filter([
            'order' => $order,
            'payment' => $payment,
            'gateway' => $gateway,
        ], fn ($value) => $value !== null && $value !== '');

        return redirect()->away($target.(str_contains($target, '?') ? '&' : '?').http_build_query($query));
    }
}
