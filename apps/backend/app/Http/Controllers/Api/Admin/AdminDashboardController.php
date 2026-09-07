<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BillingInvoice;
use App\Models\BillingOrder;
use App\Models\Payment;
use App\Models\Tenant;
use App\Models\TenantSubscription;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminDashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $paidPayments = Payment::query()->where('status', Payment::STATUS_PAID);

        return response()->json([
            'tenants' => [
                'total' => Tenant::query()->count(),
                'trial' => Tenant::query()->where('status', Tenant::STATUS_TRIAL)->count(),
                'active' => Tenant::query()->where('status', Tenant::STATUS_ACTIVE)->count(),
                'past_due' => Tenant::query()->where('status', Tenant::STATUS_PAST_DUE)->count(),
                'grace' => Tenant::query()->where('status', Tenant::STATUS_GRACE_PERIOD)->count(),
                'suspended' => Tenant::query()->where('status', Tenant::STATUS_SUSPENDED)->count(),
            ],
            'users' => User::query()->count(),
            'finance' => [
                'gross_revenue' => (float) $paidPayments->sum('amount'),
                'paid_payments' => (int) (clone $paidPayments)->count(),
                'open_orders' => BillingOrder::query()->whereIn('status', [BillingOrder::STATUS_PENDING, BillingOrder::STATUS_PAYMENT_PROCESSING])->count(),
                'unpaid_invoices' => BillingInvoice::query()->where('status', BillingInvoice::STATUS_UNPAID)->sum('total_amount'),
            ],
            'subscriptions' => TenantSubscription::query()
                ->selectRaw('status, count(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status'),
            'recent_orders' => BillingOrder::query()->with('tenant:id,name,slug')->latest()->limit(10)->get(),
            'recent_payments' => Payment::query()->with('tenant:id,name,slug')->latest()->limit(10)->get(),
        ]);
    }
}
