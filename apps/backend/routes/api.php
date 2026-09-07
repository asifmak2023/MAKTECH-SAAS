<?php

use App\Http\Controllers\Api\Admin\ActivityAdminController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AuditAdminController;
use App\Http\Controllers\Api\Admin\BillingAdminController;
use App\Http\Controllers\Api\Admin\CatalogAdminController;
use App\Http\Controllers\Api\Admin\GatewayAdminController;
use App\Http\Controllers\Api\Admin\SettingsAdminController;
use App\Http\Controllers\Api\Admin\SupportAdminController;
use App\Http\Controllers\Api\Admin\TenantAdminController;
use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\ApprovalController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\FbrIntegrationController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\ReferenceDataController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\SupportController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public
|--------------------------------------------------------------------------
*/
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
});

Route::get('catalog', [CatalogController::class, 'index']);

Route::prefix('public')->group(function () {
    Route::get('invoices/{token}', [ApprovalController::class, 'show']);
    Route::post('invoices/{token}/approve', [ApprovalController::class, 'approve']);
    Route::post('invoices/{token}/reject', [ApprovalController::class, 'reject']);
    Route::get('invoices/{token}/pdf', [ApprovalController::class, 'pdf']);
});

/*
|--------------------------------------------------------------------------
| Authenticated tenant area
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'tenant.required'])->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::post('auth/push-token', [AuthController::class, 'savePushToken']);

    Route::get('dashboard', [InvoiceController::class, 'stats']);

    Route::get('invoices', [InvoiceController::class, 'index']);
    Route::get('invoices/{invoice}', [InvoiceController::class, 'show']);
    Route::get('invoices/{invoice}/pdf', [InvoiceController::class, 'pdf']);

    // Invoice actions that require an active (billing-enabled) tenant.
    Route::middleware('tenant.active')->group(function () {
        Route::post('invoices', [InvoiceController::class, 'store']);
        Route::put('invoices/{invoice}', [InvoiceController::class, 'update']);
        Route::delete('invoices/{invoice}', [InvoiceController::class, 'destroy']);
        Route::post('invoices/{invoice}/send-for-approval', [InvoiceController::class, 'sendForApproval']);
        Route::post('invoices/{invoice}/submit', [InvoiceController::class, 'submit']);
    });

    Route::get('settings', [SettingsController::class, 'show']);
    Route::put('settings', [SettingsController::class, 'update']);
    Route::get('settings/fbr', [FbrIntegrationController::class, 'show']);
    Route::put('settings/fbr', [FbrIntegrationController::class, 'update']);
    Route::put('settings/fbr/{mode}', [FbrIntegrationController::class, 'updateEnvironment']);
    Route::post('settings/fbr/activate', [FbrIntegrationController::class, 'activate']);
    Route::post('settings/fbr/test', [FbrIntegrationController::class, 'test']);
    Route::post('settings/fbr/run-tests', [FbrIntegrationController::class, 'runTests']);
    Route::get('settings/fbr/scenarios', [FbrIntegrationController::class, 'scenarios']);

    Route::get('activity', [ActivityController::class, 'index']);

    Route::get('support/sessions', [SupportController::class, 'index']);
    Route::post('support/sessions', [SupportController::class, 'store']);
    Route::get('support/sessions/{session}', [SupportController::class, 'show']);
    Route::post('support/sessions/{session}/messages', [SupportController::class, 'message']);
    Route::post('support/sessions/{session}/resolve', [SupportController::class, 'resolve']);

    Route::get('customers', [CustomerController::class, 'index']);
    Route::get('customers/{customer}', [CustomerController::class, 'show']);
    Route::middleware('tenant.active')->group(function () {
        Route::post('customers', [CustomerController::class, 'store']);
        Route::put('customers/{customer}', [CustomerController::class, 'update']);
        Route::post('customers/{customer}/archive', [CustomerController::class, 'archive']);
        Route::post('customers/{customer}/restore', [CustomerController::class, 'restore']);

        Route::post('products', [ProductController::class, 'store']);
        Route::put('products/{product}', [ProductController::class, 'update']);
    });
    Route::get('products', [ProductController::class, 'index']);
    Route::get('products/{product}', [ProductController::class, 'show']);

    Route::get('billing/summary', [BillingController::class, 'summary']);
    Route::get('billing/orders', [BillingController::class, 'orders']);
    Route::get('billing/orders/{order}', [BillingController::class, 'showOrder']);
    Route::post('billing/subscribe', [BillingController::class, 'subscribe']);
    Route::post('billing/packages', [BillingController::class, 'buyPackage']);
    Route::post('billing/overage/settle', [BillingController::class, 'settleOverage']);
    Route::post('billing/orders/{order}/pay', [BillingController::class, 'payOrder']);
    Route::post('billing/orders/{order}/cancel', [BillingController::class, 'cancelOrder']);
    Route::get('billing/invoices', [BillingController::class, 'invoices']);
    Route::get('billing/payments', [BillingController::class, 'payments']);
    Route::get('billing/usage', [BillingController::class, 'usage']);

    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::post('notifications/{id}/read', [NotificationController::class, 'markRead']);

    Route::get('reference/hs-codes', [ReferenceDataController::class, 'hsCodes']);
    Route::get('reference/uoms', [ReferenceDataController::class, 'uoms']);
    Route::get('reference/sale-types', [ReferenceDataController::class, 'saleTypes']);
    Route::get('reference/provinces', [ReferenceDataController::class, 'provinces']);
    Route::get('reference/doc-types', [ReferenceDataController::class, 'docTypes']);
    Route::get('reference/rates', [ReferenceDataController::class, 'rates']);
    Route::post('reference/sync', [ReferenceDataController::class, 'sync']);
});

/*
|--------------------------------------------------------------------------
| Platform administrator area (no tenant scope — cross-tenant visibility)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'platform.admin'])->prefix('admin')->group(function () {
    Route::get('dashboard', [AdminDashboardController::class, 'index']);
    Route::get('activity', [ActivityAdminController::class, 'index']);

    Route::get('support', [SupportAdminController::class, 'index']);
    Route::get('support/summary', [SupportAdminController::class, 'summary']);
    Route::get('support/{session}', [SupportAdminController::class, 'show']);
    Route::post('support/{session}/messages', [SupportAdminController::class, 'reply']);
    Route::post('support/{session}/status', [SupportAdminController::class, 'status']);

    Route::get('tenants', [TenantAdminController::class, 'index']);
    Route::post('tenants', [TenantAdminController::class, 'store']);
    Route::get('tenants/{tenant}', [TenantAdminController::class, 'show']);
    Route::put('tenants/{tenant}', [TenantAdminController::class, 'update']);
    Route::post('tenants/{tenant}/status', [TenantAdminController::class, 'changeStatus']);
    Route::post('tenants/{tenant}/credits', [TenantAdminController::class, 'adjustCredits']);
    Route::put('tenants/{tenant}/fbr', [TenantAdminController::class, 'updateFbr']);
    Route::get('tenants/{tenant}/fbr-rows', [TenantAdminController::class, 'integrationRows']);
    Route::delete('customers/{customer}', [CustomerController::class, 'purge']);

    Route::get('catalog/plans', [CatalogAdminController::class, 'plans']);
    Route::post('catalog/plans', [CatalogAdminController::class, 'storePlan']);
    Route::put('catalog/plans/{plan}', [CatalogAdminController::class, 'updatePlan']);
    Route::get('catalog/packages', [CatalogAdminController::class, 'packages']);
    Route::post('catalog/packages', [CatalogAdminController::class, 'storePackage']);
    Route::put('catalog/packages/{package}', [CatalogAdminController::class, 'updatePackage']);

    Route::get('gateways', [GatewayAdminController::class, 'index']);
    Route::post('gateways/seed', [GatewayAdminController::class, 'seed']);
    Route::put('gateways/{gateway}', [GatewayAdminController::class, 'update']);

    Route::get('billing/orders', [BillingAdminController::class, 'orders']);
    Route::get('billing/orders/{order}', [BillingAdminController::class, 'showOrder']);
    Route::post('billing/orders/{order}/refund', [BillingAdminController::class, 'refundOrder']);
    Route::get('billing/invoices', [BillingAdminController::class, 'invoices']);
    Route::get('billing/payments', [BillingAdminController::class, 'payments']);
    Route::post('billing/payments/{payment}/confirm', [BillingAdminController::class, 'confirmPayment']);
    Route::post('billing/payments/{payment}/fail', [BillingAdminController::class, 'failPayment']);

    Route::get('settings', [SettingsAdminController::class, 'index']);
    Route::post('settings/set', [SettingsAdminController::class, 'set']);
    Route::post('settings/sync-roles', [SettingsAdminController::class, 'syncRoles']);
    Route::get('system', [SettingsAdminController::class, 'systemInfo']);

    Route::get('audit-logs', [AuditAdminController::class, 'index']);
    Route::get('audit-logs/{auditLog}', [AuditAdminController::class, 'show']);
});
