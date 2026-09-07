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
        if (! TenantContext::id() && $request->user()?->tenant) {
            TenantContext::set($request->user()->tenant);
        }

        if (! TenantContext::id()) {
            return response()->json([
                'message' => 'Tenant could not be identified. Send X-Tenant header or use a tenant subdomain.',
            ], 400);
        }

        return $next($request);
    }
}
