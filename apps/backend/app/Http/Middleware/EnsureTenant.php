<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $userTenant = $user?->tenant;
        $claimed = $request->attributes->get('claimed_tenant');

        if ($user?->tenant_id && $userTenant) {
            if ($claimed && (int) $claimed->id !== (int) $user->tenant_id) {
                return response()->json([
                    'message' => 'X-Tenant does not match the authenticated workspace.',
                    'code' => 'tenant_mismatch',
                ], 403);
            }

            TenantContext::set($userTenant);
            $request->attributes->set('tenant', $userTenant);
        } elseif (! TenantContext::id() && $userTenant) {
            TenantContext::set($userTenant);
            $request->attributes->set('tenant', $userTenant);
        }

        if (! TenantContext::id()) {
            return response()->json([
                'message' => 'Tenant could not be identified. Send X-Tenant header or use a tenant subdomain.',
            ], 400);
        }

        return $next($request);
    }
}
