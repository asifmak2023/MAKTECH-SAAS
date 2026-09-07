<?php

namespace App\Services;

use App\Models\PlatformSetting;
use App\Models\Tenant;

class SaasConfig
{
    public static function get(string $group, string $key, mixed $default = null): mixed
    {
        return PlatformSetting::get($group, $key, $default);
    }

    public static function invoicePrice(): float
    {
        return (float) self::get('billing', 'default_invoice_price', config('saas.billing.default_invoice_price'));
    }

    public static function consumptionOrder(): string
    {
        return (string) self::get('billing', 'usage_consumption_order', config('saas.billing.default_usage_consumption_order'));
    }

    public static function lowQuotaThresholds(): array
    {
        $thresholds = self::get('billing', 'low_quota_thresholds', config('saas.billing.low_quota_thresholds'));

        return array_map('intval', (array) ($thresholds ?: []));
    }

    public static function gracePeriodHours(Tenant $tenant): int
    {
        $tenantOverride = $tenant->settings['grace_period_hours'] ?? null;

        return (int) ($tenantOverride
            ?? self::get('tenant', 'default_grace_period_hours', config('saas.tenant.default_grace_period_hours')));
    }

    public static function allowPublicRegistration(): bool
    {
        return (bool) self::get('tenant', 'allow_public_registration', config('saas.tenant.allow_public_registration'));
    }

    public static function requireAdminApproval(): bool
    {
        return (bool) self::get('tenant', 'require_admin_approval', config('saas.tenant.require_admin_approval'));
    }

    public static function defaultTrialDays(): int
    {
        return (int) self::get('tenant', 'trial_days', config('saas.tenant.trial_days'));
    }

    public static function registrationFreeInvoices(): int
    {
        return (int) self::get('tenant', 'registration_credit_invoices', config('saas.tenant.registration_credit_invoices'));
    }

    public static function currency(): string
    {
        return (string) self::get('general', 'currency', config('saas.currency'));
    }
}
