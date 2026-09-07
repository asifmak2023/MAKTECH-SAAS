<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\Fbr\FbrIntegrationService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function show(): JsonResponse
    {
        $tenant = TenantContext::get();

        return response()->json($tenant);
    }

    public function update(Request $request): JsonResponse
    {
        $tenant = TenantContext::get();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'legal_name' => ['nullable', 'string', 'max:255'],
            'seller_ntn_cnic' => ['nullable', 'string', 'max:20'],
            'seller_business_name' => ['nullable', 'string', 'max:255'],
            'seller_province' => ['nullable', 'string', 'max:100'],
            'seller_address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'business_category' => ['nullable', 'string', 'max:120'],
            'seller_email' => ['nullable', 'email'],
            'seller_phone' => ['nullable', 'string', 'max:30'],
            'billing_email' => ['nullable', 'email'],
            'registration_type' => ['nullable', 'string', 'max:40'],
            'auto_submit_on_approval' => ['sometimes', 'boolean'],
            'default_gateway' => ['nullable', 'string', 'max:40'],
        ]);

        if (array_key_exists('default_gateway', $data)) {
            $settings = $tenant->settings ?? [];
            $settings['default_gateway'] = $data['default_gateway'];
            unset($data['default_gateway']);
            $tenant->settings = $settings;
        }

        $tenant->update($data);

        return response()->json($tenant->fresh());
    }
}
