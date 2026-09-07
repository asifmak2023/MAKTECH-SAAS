<?php

use App\Http\Middleware\EnsureActiveTenant;
use App\Http\Middleware\EnsurePlatformAdmin;
use App\Http\Middleware\EnsureTenant;
use App\Http\Middleware\IdentifyTenant;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'tenant' => IdentifyTenant::class,
            'tenant.required' => EnsureTenant::class,
            'tenant.active' => EnsureActiveTenant::class,
            'platform.admin' => EnsurePlatformAdmin::class,
        ]);

        $middleware->api(prepend: [
            IdentifyTenant::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*') && $e instanceof \Illuminate\Database\Eloquent\ModelNotFoundException) {
                return response()->json(['message' => 'Resource not found.'], 404);
            }

            if ($request->is('api/*') && $e instanceof \App\Exceptions\UsageLimitExceededException) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'code' => 'usage_limit_exceeded',
                ], $e->statusCode);
            }

            if ($request->is('api/*') && $e instanceof \App\Exceptions\PaymentException) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'code' => 'payment_error',
                ], $e->statusCode);
            }

            if ($request->is('api/*') && $e instanceof \App\Exceptions\TenantStatusException) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'code' => 'tenant_status',
                ], $e->statusCode);
            }
        });
    })->create();
