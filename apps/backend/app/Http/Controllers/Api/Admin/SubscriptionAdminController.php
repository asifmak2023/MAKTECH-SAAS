<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TenantSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionAdminController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');

        $query = TenantSubscription::query()
            ->with(['tenant:id,name,slug,status', 'plan:id,code,name,price,billing_interval'])
            ->when($status === 'expired', fn ($q) => $q->whereIn('status', [
                TenantSubscription::STATUS_EXPIRED,
                TenantSubscription::STATUS_CANCELLED,
            ]))
            ->when($status && $status !== 'expired' && $status !== 'all', fn ($q) => $q->where('status', $status))
            ->latest('id');

        return response()->json($query->paginate(20));
    }
}
