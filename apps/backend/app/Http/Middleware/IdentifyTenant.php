<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Support\TenantContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IdentifyTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = $this->resolveTenant($request);

        if ($tenant) {
            TenantContext::set($tenant);
            $request->attributes->set('tenant', $tenant);
        } else {
            TenantContext::forget();
        }

        return $next($request);
    }

    protected function resolveTenant(Request $request): ?Tenant
    {
        $headerSlug = $request->header('X-Tenant');
        if ($headerSlug) {
            return Tenant::query()->where('slug', $headerSlug)->orWhere('domain', $headerSlug)->first();
        }

        $host = $request->getHost();
        $tenant = Tenant::query()->where('domain', $host)->first();
        if ($tenant) {
            return $tenant;
        }

        $parts = explode('.', $host);
        if (count($parts) > 2) {
            return Tenant::query()->where('slug', $parts[0])->first();
        }

        $slug = $request->query('tenant');
        if ($slug) {
            return Tenant::query()->where('slug', $slug)->first();
        }

        return null;
    }
}
