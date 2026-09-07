<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\BillingOrder;
use App\Models\FbrIntegration;
use App\Models\FbrSubmissionHistory;
use App\Models\Payment;
use App\Models\SupportSession;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $today = now()->startOfDay();
        $paidPayments = Payment::query()->where('status', Payment::STATUS_PAID);

        $manualGateways = ['bank', 'raast', 'jazzcash', 'easypaisa', 'sadapay', 'nayapay', 'card'];

        $failedToday = FbrSubmissionHistory::query()
            ->where('status', 'failed')
            ->where('created_at', '>=', $today)
            ->count();

        $lastFbr = FbrSubmissionHistory::query()->latest('id')->first();

        return response()->json([
            'sellers' => [
                'total' => Tenant::query()->count(),
                'active' => Tenant::query()->whereIn('status', [Tenant::STATUS_ACTIVE, Tenant::STATUS_TRIAL])->count(),
                'trial' => Tenant::query()->where('status', Tenant::STATUS_TRIAL)->count(),
                'pending' => Tenant::query()->where('status', Tenant::STATUS_PENDING)->count(),
                'past_due' => Tenant::query()->where('status', Tenant::STATUS_PAST_DUE)->count(),
                'grace' => Tenant::query()->where('status', Tenant::STATUS_GRACE_PERIOD)->count(),
                'suspended' => Tenant::query()->where('status', Tenant::STATUS_SUSPENDED)->count(),
                'new_today' => Tenant::query()->where('created_at', '>=', $today)->count(),
            ],
            'tenants' => [
                'total' => Tenant::query()->count(),
                'trial' => Tenant::query()->where('status', Tenant::STATUS_TRIAL)->count(),
                'active' => Tenant::query()->where('status', Tenant::STATUS_ACTIVE)->count(),
                'past_due' => Tenant::query()->where('status', Tenant::STATUS_PAST_DUE)->count(),
                'grace' => Tenant::query()->where('status', Tenant::STATUS_GRACE_PERIOD)->count(),
                'suspended' => Tenant::query()->where('status', Tenant::STATUS_SUSPENDED)->count(),
            ],
            'users' => User::query()->where('is_platform_admin', false)->whereNotNull('tenant_id')->count(),
            'finance' => [
                'gross_revenue' => (float) (clone $paidPayments)->sum('amount'),
                'paid_payments' => (int) (clone $paidPayments)->count(),
                'payments_today' => (int) Payment::query()->where('status', Payment::STATUS_PAID)->where('paid_at', '>=', $today)->count(),
                'open_orders' => BillingOrder::query()->whereIn('status', [BillingOrder::STATUS_PENDING, BillingOrder::STATUS_PAYMENT_PROCESSING])->count(),
                'unpaid_invoices' => (float) BillingInvoice::query()->where('status', BillingInvoice::STATUS_UNPAID)->sum('total_amount'),
                'pending_manual_payments' => Payment::query()
                    ->whereIn('status', [Payment::STATUS_PENDING, Payment::STATUS_PROCESSING])
                    ->whereIn('gateway_code', $manualGateways)
                    ->count(),
            ],
            'subscriptions' => [
                'by_status' => TenantSubscription::query()
                    ->selectRaw('status, count(*) as total')
                    ->groupBy('status')
                    ->pluck('total', 'status'),
                'active' => TenantSubscription::query()->where('status', TenantSubscription::STATUS_ACTIVE)->count(),
                'pending' => TenantSubscription::query()->where('status', TenantSubscription::STATUS_PENDING)->count(),
                'expired' => TenantSubscription::query()->whereIn('status', [TenantSubscription::STATUS_EXPIRED, TenantSubscription::STATUS_CANCELLED])->count(),
                'grace' => TenantSubscription::query()->where('status', TenantSubscription::STATUS_GRACE_PERIOD)->count(),
            ],
            'pral' => [
                'sandbox_configured' => FbrIntegration::query()->where('mode', 'sandbox')->where('status', 'configured')->count(),
                'production_configured' => FbrIntegration::query()->where('mode', 'production')->where('status', 'configured')->count(),
                'failed_today' => $failedToday,
                'last_event_at' => $lastFbr?->created_at?->toIso8601String(),
                'last_status' => $lastFbr?->status,
                'sandbox_status' => $this->pralHealth('sandbox'),
                'production_status' => $this->pralHealth('production'),
            ],
            'support' => [
                'open' => SupportSession::query()->where('status', SupportSession::STATUS_OPEN)->count(),
                'in_progress' => SupportSession::query()->where('status', SupportSession::STATUS_IN_PROGRESS)->count(),
                'active' => SupportSession::query()->whereIn('status', [SupportSession::STATUS_OPEN, SupportSession::STATUS_IN_PROGRESS])->count(),
            ],
            'errors_today' => $failedToday + (int) DB::table('audit_logs')
                ->where('created_at', '>=', $today)
                ->where(function ($q) {
                    $q->where('action', 'like', '%failed%')->orWhere('action', 'like', '%error%');
                })
                ->count(),
            'recent_orders' => BillingOrder::query()->with('tenant:id,name,slug')->latest()->limit(10)->get(),
            'recent_payments' => Payment::query()->with(['tenant:id,name,slug', 'order:id,order_number'])->latest()->limit(10)->get(),
        ]);
    }

    protected function pralHealth(string $mode): string
    {
        $recentFail = FbrSubmissionHistory::query()
            ->where('status', 'failed')
            ->where('created_at', '>=', now()->subHours(6))
            ->whereHas('tenant', fn ($q) => $q->where('fbr_mode', $mode))
            ->exists();

        $configured = FbrIntegration::query()->where('mode', $mode)->where('status', 'configured')->exists();

        if ($recentFail) {
            return 'degraded';
        }

        return $configured ? 'operational' : 'unconfigured';
    }
}
