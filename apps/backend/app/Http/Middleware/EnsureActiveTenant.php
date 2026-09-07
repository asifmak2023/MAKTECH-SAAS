<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = TenantContext::get() ?? $request->user()?->tenant;

        if (! $tenant) {
            return response()->json([
                'message' => 'Tenant could not be identified for this account.',
            ], 400);
        }

        TenantContext::set($tenant);

        if (! $tenant->canBillInvoices()) {
            return response()->json([
                'message' => 'Your account is not active ('.($tenant->status ?? 'inactive').'). Please settle your outstanding balance to continue invoicing.',
                'tenant_status' => $tenant->status,
            ], 403);
        }

        return $next($request);
    }
}
