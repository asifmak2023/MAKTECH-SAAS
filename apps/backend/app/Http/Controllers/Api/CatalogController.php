<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use App\Models\UsagePackage;
use App\Services\Payments\PaymentService;
use App\Services\SaasConfig;
use Illuminate\Http\JsonResponse;

class CatalogController extends Controller
{
    public function __construct(protected PaymentService $payments) {}

    /**
     * Public product catalogue: plans, packages and currency info. Used by the
     * registration screen, plan pages and checkout UIs before authentication.
     */
    public function index(): JsonResponse
    {
        $plans = SubscriptionPlan::query()->active()->get()->map(fn (SubscriptionPlan $plan) => [
            'id' => $plan->id,
            'code' => $plan->code,
            'name' => $plan->name,
            'description' => $plan->description,
            'billing_interval' => $plan->billing_interval,
            'price' => (float) $plan->price,
            'annual_price' => $plan->annual_price !== null ? (float) $plan->annual_price : null,
            'currency' => $plan->currency,
            'invoice_limit' => $plan->invoice_limit,
            'overage_allowed' => $plan->overage_allowed,
            'overage_price' => $plan->overage_price !== null
                ? SaasConfig::effectiveInvoicePrice((float) $plan->overage_price)
                : null,
            'trial_days' => $plan->trial_days,
            'features' => $plan->features,
        ]);

        $packages = UsagePackage::query()->active()->get()->map(fn (UsagePackage $package) => [
            'id' => $package->id,
            'code' => $package->code,
            'name' => $package->name,
            'description' => $package->description,
            'invoice_quantity' => $package->invoice_quantity,
            'price' => (float) $package->price,
            'currency' => $package->currency,
            'validity_days' => $package->validity_days,
        ]);

        return response()->json([
            'currency' => SaasConfig::currency(),
            'price_per_invoice' => SaasConfig::effectiveInvoicePrice(),
            'max_invoice_price' => SaasConfig::maxInvoicePrice(),
            'free_invoice_allowance' => SaasConfig::registrationFreeInvoices(),
            'payment_gateways' => collect($this->payments->enabledGateways())
                ->map(fn ($g) => ['code' => $g['code'], 'name' => $g['name'], 'sandbox' => $g['sandbox']])
                ->values(),
            'plans' => $plans,
            'packages' => $packages,
        ]);
    }
}
