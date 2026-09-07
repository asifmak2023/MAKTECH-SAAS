<?php

namespace App\Http\Middleware;

use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePlatformAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->isPlatformAdmin()) {
            return response()->json([
                'message' => 'You do not have permission to access the platform admin area.',
            ], 403);
        }

        // Platform admins are not sellers. Never inherit leftover X-Tenant context.
        TenantContext::forget();

        return $next($request);
    }
}
