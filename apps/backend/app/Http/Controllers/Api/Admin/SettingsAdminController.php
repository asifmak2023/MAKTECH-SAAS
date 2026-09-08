<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use App\Services\RoleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsAdminController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'settings' => PlatformSetting::query()->orderBy('group')->orderBy('key')->get(),
            'available_groups' => [
                'general' => ['currency', 'platform_name', 'support_email', 'support_phone', 'timezone'],
                'tenant' => ['trial_days', 'default_grace_period_hours', 'allow_public_registration', 'require_admin_approval', 'registration_credit_invoices'],
                'billing' => ['default_invoice_price', 'max_invoice_price', 'usage_consumption_order', 'low_quota_thresholds', 'tax_rate', 'default_gateway', 'payment_expiry_hours', 'suspend_on_grace_expiry', 'allow_overage'],
            ],
            'saas_statuses' => config('saas.statuses'),
            'consumption_orders' => ['packages_first', 'credits_first'],
            'integrators' => app(\App\Services\Fbr\FbrIntegrationService::class)->availableIntegrators(),
        ]);
    }

    public function set(Request $request): JsonResponse
    {
        $data = $request->validate([
            'group' => ['required', 'string', 'max:60'],
            'key' => ['required', 'string', 'max:120'],
            'value' => ['required'],
        ]);

        PlatformSetting::set($data['group'], $data['key'], $data['value']);

        return response()->json(['message' => 'Setting saved.', 'setting' => PlatformSetting::query()
            ->where('group', $data['group'])
            ->where('key', $data['key'])
            ->first()]);
    }

    public function syncRoles(): JsonResponse
    {
        RoleService::ensureDefaults();

        return response()->json(['message' => 'Roles synced from config.']);
    }

    public function systemInfo(): JsonResponse
    {
        return response()->json([
            'app' => config('app.name'),
            'env' => config('app.env'),
            'version' => '0.1.0',
            'php' => PHP_VERSION,
            'laravel' => app()->version(),
            'time' => now()->toIso8601String(),
        ]);
    }
}
