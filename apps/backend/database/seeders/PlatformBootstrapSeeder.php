<?php

namespace Database\Seeders;

use App\Models\PaymentGateway;
use App\Models\PlatformSetting;
use App\Models\Role;
use App\Models\User;
use App\Services\RoleService;
use Illuminate\Database\Seeder;

class PlatformBootstrapSeeder extends Seeder
{
    public function run(): void
    {
        RoleService::ensureDefaults();

        // Built-in payment providers declared in config/saas.php
        foreach ((array) config('saas.payment_gateways', []) as $code => $meta) {
            PaymentGateway::query()->updateOrCreate(
                ['code' => $code],
                [
                    'name' => $meta['name'] ?? $code,
                    'description' => $meta['name'] ?? $code,
                    'is_enabled' => (bool) ($meta['enabled'] ?? false),
                    'is_sandbox' => true,
                    'sort_order' => array_search($code, array_keys((array) config('saas.payment_gateways')), true) + 1,
                ]
            );
        }

        // Baseline platform settings visible in Admin -> Settings.
        $defaults = [
            ['general', 'currency', config('saas.currency')],
            ['general', 'platform_name', config('saas.platform_name')],
            ['tenant', 'trial_days', config('saas.tenant.trial_days')],
            ['tenant', 'default_grace_period_hours', config('saas.tenant.default_grace_period_hours')],
            ['tenant', 'allow_public_registration', config('saas.tenant.allow_public_registration')],
            ['tenant', 'require_admin_approval', config('saas.tenant.require_admin_approval')],
            ['tenant', 'registration_credit_invoices', config('saas.tenant.registration_credit_invoices')],
            ['billing', 'default_invoice_price', config('saas.billing.default_invoice_price')],
            ['billing', 'max_invoice_price', config('saas.billing.max_invoice_price')],
            ['billing', 'usage_consumption_order', config('saas.billing.default_usage_consumption_order')],
            ['billing', 'low_quota_thresholds', config('saas.billing.low_quota_thresholds')],
            ['billing', 'tax_rate', 0],
            ['billing', 'default_gateway', 'mock'],
            ['billing', 'payment_expiry_hours', 24],
            ['billing', 'suspend_on_grace_expiry', true],
            ['billing', 'allow_overage', true],
        ];

        foreach ($defaults as [$group, $key, $value]) {
            PlatformSetting::set($group, $key, $value);
        }

        $superAdminRole = Role::query()->where('tenant_id', null)->where('code', 'platform_super_admin')->first();

        foreach ((array) config('saas.platform_admin_emails', []) as $email) {
            $user = User::withoutGlobalScopes()->firstOrNew(['email' => $email]);
            $user->forceFill([
                'name' => $user->name ?? 'Platform Admin',
                'password' => $user->password ?? env('SAAS_PLATFORM_ADMIN_PASSWORD', 'password'),
                'role' => $user->role ?? 'admin',
                'is_platform_admin' => true,
                'is_active' => true,
            ])->save();

            if ($superAdminRole && ! $user->roles()->where('role_id', $superAdminRole->id)->exists()) {
                $user->roles()->attach($superAdminRole->id);
            }
        }
    }
}
