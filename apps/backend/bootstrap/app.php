<?php

use App\Exceptions\PaymentException;
use App\Exceptions\TenantStatusException;
use App\Exceptions\UsageLimitExceededException;
use App\Http\Middleware\EnsureActiveTenant;
use App\Http\Middleware\EnsurePlatformAdmin;
use App\Http\Middleware\EnsureSeller;
use App\Http\Middleware\EnsureTenant;
use App\Http\Middleware\IdentifyTenant;
use Illuminate\Database\Eloquent\ModelNotFoundException;
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
            'seller' => EnsureSeller::class,
            'platform.admin' => EnsurePlatformAdmin::class,
        ]);

        $middleware->api(prepend: [
            IdentifyTenant::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*') && $e instanceof ModelNotFoundException) {
                return response()->json(['message' => 'Resource not found.'], 404);
            }

            if ($request->is('api/*') && $e instanceof UsageLimitExceededException) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'code' => 'usage_limit_exceeded',
                ], $e->statusCode);
            }

            if ($request->is('api/*') && $e instanceof PaymentException) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'code' => 'payment_error',
                ], $e->statusCode);
            }

            if ($request->is('api/*') && $e instanceof TenantStatusException) {
                return response()->json([
                    'message' => $e->getMessage(),
                    'code' => 'tenant_status',
                ], $e->statusCode);
            }
        });
    })->create();
