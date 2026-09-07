<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use App\Models\UsagePackage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogAdminController extends Controller
{
    public function plans(): JsonResponse
    {
        return response()->json(SubscriptionPlan::query()->orderBy('sort_order')->orderBy('id')->get());
    }

    public function storePlan(Request $request): JsonResponse
    {
        $data = $this->planRules($request);
        $plan = SubscriptionPlan::query()->create($data);

        return response()->json($plan, 201);
    }

    public function updatePlan(Request $request, SubscriptionPlan $plan): JsonResponse
    {
        $data = $this->planRules($request);
        $plan->update($data);

        return response()->json($plan->fresh());
    }

    protected function planRules(Request $request): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:60'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'billing_interval' => ['required', 'in:monthly,yearly'],
            'price' => ['required', 'numeric', 'min:0'],
            'annual_price' => ['nullable', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'invoice_limit' => ['nullable', 'integer', 'min:0'],
            'overage_allowed' => ['sometimes', 'boolean'],
            'overage_price' => ['nullable', 'numeric', 'min:0'],
            'grace_period_hours' => ['nullable', 'integer', 'min:1', 'max:720'],
            'trial_days' => ['nullable', 'integer', 'min:0', 'max:365'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
        ]);
    }

    public function packages(): JsonResponse
    {
        return response()->json(UsagePackage::query()->orderBy('sort_order')->orderBy('id')->get());
    }

    public function storePackage(Request $request): JsonResponse
    {
        $data = $this->packageRules($request);
        $package = UsagePackage::query()->create($data);

        return response()->json($package, 201);
    }

    public function updatePackage(Request $request, UsagePackage $package): JsonResponse
    {
        $data = $this->packageRules($request);
        $package->update($data);

        return response()->json($package->fresh());
    }

    protected function packageRules(Request $request): array
    {
        return $request->validate([
            'code' => ['required', 'string', 'max:60'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'invoice_quantity' => ['required', 'integer', 'min:1'],
            'price' => ['required', 'numeric', 'min:0'],
            'currency' => ['nullable', 'string', 'size:3'],
            'validity_days' => ['nullable', 'integer', 'min:0', 'max:3650'],
            'overage_allowed' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['nullable', 'integer'],
        ]);
    }
}
