<?php

return [

    /*
    |--------------------------------------------------------------------------
    | SaaS platform defaults
    |--------------------------------------------------------------------------
    | Central place for SaaS / billing defaults. Every value that controls the
    | commercial behaviour can be overridden at runtime from the platform admin
    | "Settings" screens. Those overrides are stored in `platform_settings` and
    | take precedence over the static defaults below.
    */

    'currency' => env('SAAS_CURRENCY', 'PKR'),

    'platform_name' => env('APP_NAME', 'FBR Digital Invoicing System'),

    'support_email' => env('SAAS_SUPPORT_EMAIL', 'support@example.com'),

    'support_phone' => env('SAAS_SUPPORT_PHONE', ''),

    'timezone' => env('APP_TIMEZONE', 'Asia/Karachi'),

    /*
    | Tenant lifecycle defaults.
    */
    'tenant' => [
        'default_status' => 'active',
        'trial_days' => (int) env('SAAS_TRIAL_DAYS', 0),
        'default_grace_period_hours' => (int) env('SAAS_GRACE_PERIOD_HOURS', 48),
        'allow_public_registration' => (bool) env('SAAS_ALLOW_PUBLIC_REGISTRATION', true),
        'require_admin_approval' => (bool) env('SAAS_REQUIRE_ADMIN_APPROVAL', false),
        'registration_credit_invoices' => (int) env('SAAS_REGISTRATION_CREDIT_INVOICES', 5),
    ],

    'statuses' => [
        'pending',
        'trial',
        'active',
        'past_due',
        'grace_period',
        'suspended',
        'cancelled',
    ],

    /*
    | Pay-per-invoice default price (Model A). The platform owner edits this in
    | Admin -> Billing settings. The exact price applied to a billable event is
    | always snapshotted into the billing ledger.
    */
    'billing' => [
        'default_invoice_price' => (float) env('SAAS_PRICE_PER_INVOICE', 10),
        'max_invoice_price' => (float) env('SAAS_MAX_INVOICE_PRICE', 10),
        'default_usage_consumption_order' => env('SAAS_USAGE_CONSUMPTION_ORDER', 'packages_first'),
        'low_quota_thresholds' => [80, 90, 95, 100],
        'invoice_number_prefix' => env('SAAS_BILLING_INVOICE_PREFIX', 'BILL'),
        'order_number_prefix' => env('SAAS_ORDER_PREFIX', 'ORD'),
    ],

    /*
    | Payer-facing web app. Return/cancel URLs handed to payment providers are
    | built from this origin. Override WEB_APP_URL in .env whenever the public
    | host of the Next.js app changes - no code edits required.
    */
    'web' => [
        'app_url' => rtrim((string) env('WEB_APP_URL', env('APP_URL', 'http://localhost')), '/'),
    ],

    'auth' => [
        'require_email_verification' => filter_var(env('SAAS_REQUIRE_EMAIL_VERIFICATION', true), FILTER_VALIDATE_BOOLEAN),
        'verification_expire_minutes' => (int) env('SAAS_EMAIL_VERIFICATION_EXPIRE', 60),
    ],

    'payments' => [
        'return_path' => env('SAAS_PAYMENT_RETURN_PATH', '/billing/payments/return'),
        'cancel_path' => env('SAAS_PAYMENT_CANCEL_PATH', '/billing'),
        'webhook_prefix' => env('SAAS_PAYMENT_WEBHOOK_PREFIX', '/api/webhooks'),
    ],

    /*
    | Built-in payment providers. `enabled` here is only the seed default; the
    | platform owner toggles providers from Admin -> Payment Gateways. Secrets
    | live in the `payment_gateways` table encrypted at rest.
    */
    'payment_gateways' => [
        'mock' => [
            'name' => 'Demo / Sandbox Gateway',
            'adapter' => \App\Services\Payments\Gateways\MockGateway::class,
            'supports_recurring' => false,
            'enabled' => (bool) env('SAAS_ENABLE_MOCK_GATEWAY', true),
            'config_keys' => ['auto_approve'],
        ],
        'jazzcash' => [
            'name' => 'JazzCash',
            'adapter' => \App\Services\Payments\Gateways\JazzCashGateway::class,
            'supports_recurring' => true,
            'enabled' => false,
            'config_keys' => ['merchant_id', 'password', 'integrity_salt', 'sandbox_endpoint', 'live_endpoint'],
        ],
        'easypaisa' => [
            'name' => 'Easypaisa',
            'adapter' => \App\Services\Payments\Gateways\EasypaisaGateway::class,
            'supports_recurring' => false,
            'enabled' => false,
            'config_keys' => ['merchant_id', 'api_key', 'api_secret', 'sandbox_endpoint', 'live_endpoint'],
        ],
        'sadapay' => [
            'name' => 'SadaPay',
            'adapter' => \App\Services\Payments\Gateways\SadapayGateway::class,
            'supports_recurring' => false,
            'enabled' => false,
            'config_keys' => ['merchant_id', 'api_key', 'api_secret', 'sandbox_endpoint', 'live_endpoint'],
        ],
        'nayapay' => [
            'name' => 'NayaPay',
            'adapter' => \App\Services\Payments\Gateways\NayapayGateway::class,
            'supports_recurring' => false,
            'enabled' => false,
            'config_keys' => ['merchant_id', 'api_key', 'api_secret', 'sandbox_endpoint', 'live_endpoint'],
        ],
        'raast' => [
            'name' => 'Raast (P2M)',
            'adapter' => \App\Services\Payments\Gateways\RaastGateway::class,
            'supports_recurring' => false,
            'enabled' => (bool) env('SAAS_ENABLE_RAAST_GATEWAY', true),
            'config_keys' => ['merchant_id', 'api_key', 'api_secret', 'sandbox_endpoint', 'live_endpoint'],
            'env_credentials' => [
                'merchant_id' => ['env' => 'ONELINK_MERCHANT_ID'],
                'api_key' => ['env' => 'ONELINK_API_KEY'],
                'api_secret' => ['env' => 'ONELINK_API_SECRET'],
                'sandbox_endpoint' => ['env' => 'ONELINK_SANDBOX_ENDPOINT'],
                'live_endpoint' => ['env' => 'ONELINK_LIVE_ENDPOINT'],
            ],
        ],
        'onelink_p2m' => [
            'name' => '1Link P2M',
            'adapter' => \App\Services\Payments\Gateways\OneLinkP2MGateway::class,
            'supports_recurring' => false,
            'enabled' => (bool) env('SAAS_ENABLE_ONELINK_P2M_GATEWAY', true),
            'config_keys' => ['merchant_id', 'api_key', 'api_secret', 'sandbox_endpoint', 'live_endpoint'],
            'env_credentials' => [
                'api_key' => ['env' => 'ONELINK_P2M_API_KEY'],
                'api_secret' => ['env' => 'ONELINK_P2M_API_SECRET'],
                'merchant_id' => ['env' => 'ONELINK_P2M_MERCHANT_ID'],
                'sandbox_endpoint' => ['env' => 'ONELINK_P2M_SANDBOX_ENDPOINT'],
                'live_endpoint' => ['env' => 'ONELINK_P2M_LIVE_ENDPOINT'],
            ],
        ],
        'bank_transfer' => [
            'name' => 'Bank Transfer',
            'adapter' => \App\Services\Payments\Gateways\BankTransferGateway::class,
            'supports_recurring' => false,
            'enabled' => false,
            'config_keys' => ['bank_name', 'account_title', 'account_number', 'iban', 'instructions'],
        ],
        'card' => [
            'name' => 'Debit / Credit Card',
            'adapter' => \App\Services\Payments\Gateways\CardGateway::class,
            'supports_recurring' => true,
            'enabled' => false,
            'config_keys' => ['merchant_id', 'api_key', 'api_secret', 'sandbox_endpoint', 'live_endpoint'],
        ],
    ],

    'integrators' => [
        'pral' => [
            'name' => 'PRAL (FBR Licensed Integrator)',
            'adapter' => \App\Services\Fbr\Integrators\PralIntegrator::class,
            'supports_sandbox' => true,
        ],
        'generic' => [
            'name' => 'Generic Licensed Integrator (HTTP + bearer token)',
            'adapter' => \App\Services\Fbr\Integrators\GenericIntegrator::class,
            'supports_sandbox' => true,
        ],
    ],

    /*
    | Platform administrators are identified by:
    |   1. users.is_platform_admin = true, OR
    |   2. an e-mail address listed here (seed convenience).
    */
    'platform_admin_emails' => array_filter(array_map('trim', explode(',', (string) env('SAAS_PLATFORM_ADMIN_EMAILS', 'admin@saas.local')))),

    /*
    | Seeded tenant roles -> permission codes.
    */
    'roles' => [
        'tenant_owner' => [
            'name' => 'Tenant Owner',
            'permissions' => ['tenant.manage', 'invoice.*', 'customer.*', 'product.*', 'billing.view', 'billing.pay', 'settings.manage', 'user.manage', 'fbr.manage', 'usage.view'],
        ],
        'tenant_admin' => [
            'name' => 'Tenant Admin',
            'permissions' => ['invoice.*', 'customer.*', 'product.*', 'billing.view', 'billing.pay', 'settings.manage', 'user.manage', 'fbr.manage', 'usage.view'],
        ],
        'tenant_accountant' => [
            'name' => 'Tenant Accountant',
            'permissions' => ['invoice.create', 'invoice.edit', 'invoice.submit', 'invoice.view', 'customer.view', 'product.view', 'billing.view', 'usage.view', 'report.view'],
        ],
        'tenant_invoice_user' => [
            'name' => 'Tenant Invoice User',
            'permissions' => ['invoice.create', 'invoice.edit', 'invoice.view', 'customer.view', 'product.view', 'usage.view'],
        ],
        'tenant_viewer' => [
            'name' => 'Tenant Viewer',
            'permissions' => ['invoice.view', 'customer.view', 'product.view', 'usage.view'],
        ],
    ],

    'platform_roles' => [
        'platform_super_admin' => [
            'name' => 'Platform Super Admin',
            'permissions' => ['admin.*', 'admin.tenants', 'admin.billing', 'admin.payments', 'admin.settings', 'admin.fbr', 'admin.audit'],
        ],
        'platform_billing_admin' => [
            'name' => 'Platform Billing Admin',
            'permissions' => ['admin.billing', 'admin.payments', 'admin.settings'],
        ],
        'platform_support_admin' => [
            'name' => 'Platform Support Admin',
            'permissions' => ['admin.tenants', 'admin.audit', 'admin.billing'],
        ],
    ],
];
