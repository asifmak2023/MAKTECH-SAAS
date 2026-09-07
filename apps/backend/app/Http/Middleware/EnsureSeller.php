<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSeller
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->isPlatformAdmin()) {
            return response()->json([
                'message' => 'Platform administrators cannot access the seller workspace. Use the admin console instead.',
                'code' => 'admin_forbidden_seller',
            ], 403);
        }

        if (! $user->tenant_id) {
            return response()->json([
                'message' => 'This account is not attached to a seller workspace.',
                'code' => 'not_a_seller',
            ], 403);
        }

        return $next($request);
    }
}
