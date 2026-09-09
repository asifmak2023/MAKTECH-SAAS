<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TenantService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;

class GoogleAuthController extends Controller
{
    public function __construct(
        protected TenantService $tenants,
    ) {}

    public function status(): JsonResponse
    {
        return response()->json([
            'enabled' => (bool) config('services.google.enabled'),
        ]);
    }

    public function redirect(): JsonResponse
    {
        if (! (bool) config('services.google.enabled')) {
            return response()->json([
                'message' => 'Google sign-in is not configured yet.',
            ], 503);
        }

        $url = Socialite::driver('google')->stateless()->redirect()->getTargetUrl();

        return response()->json(['url' => $url]);
    }

    public function callback(Request $request): RedirectResponse
    {
        $webBase = rtrim((string) config('saas.web.app_url'), '/');
        $fail = fn (string $reason) => redirect()->away($webBase.'/auth/google/callback?error='.urlencode($reason));

        if (! (bool) config('services.google.enabled')) {
            return $fail('Google sign-in is not configured yet.');
        }

        try {
            $google = Socialite::driver('google')->stateless()->user();
        } catch (\Throwable $e) {
            Log::warning('google_oauth_callback_failed', ['error' => $e->getMessage()]);

            return $fail('Google sign-in did not complete. Please try again.');
        }

        if (! $google || ! filter_var($google->getEmail(), FILTER_VALIDATE_EMAIL)) {
            return $fail('Your Google account has no valid email address.');
        }

        TenantContext::forget();

        $email = strtolower(trim((string) $google->getEmail()));
        $user = User::withoutGlobalScopes()->where('email', $email)->orderBy('id')->first();

        if (! $user) {
            $user = $this->createAccountFromGoogle($google, $email);
        }

        if (! $user) {
            return $fail('We could not create an account for that email.');
        }

        if (! $user->isPlatformAdmin() && ! $user->hasVerifiedEmail()) {
            $user->forceFill(['email_verified_at' => now()])->save();
            $user = $user->fresh();
        }

        if ($user->isPlatformAdmin() || $user->tenant_id === null) {
            TenantContext::forget();
            $user->load('roles');

            $query = http_build_query([
                'token' => $user->createToken('api')->plainTextToken,
                'tenant' => '',
                'is_platform_admin' => '1',
                'account_kind' => 'platform_admin',
                'email' => $email,
            ]);

            return redirect()->away($webBase.'/auth/google/callback?'.$query);
        }

        $user->load('tenant');
        $tenant = $user->tenant;
        TenantContext::set($tenant);

        $query = http_build_query([
            'token' => $user->createToken('api')->plainTextToken,
            'tenant' => $tenant->slug,
            'is_platform_admin' => '0',
            'account_kind' => 'seller',
            'email' => $email,
        ]);

        return redirect()->away($webBase.'/auth/google/callback?'.$query);
    }

    protected function createAccountFromGoogle(mixed $google, string $email): ?User
    {
        $name = trim((string) $google->getName());
        $localPart = Str::slug(Str::before($email, '@'));
        $tenantName = $name !== '' ? $name : $localPart;

        if ($tenantName === '') {
            return null;
        }

        try {
            $tenant = $this->tenants->registerTenant([
                'tenant_name' => Str::limit($tenantName, 120),
                'tenant_slug' => Str::limit($localPart, 48),
                'name' => Str::limit($tenantName, 255),
                'username' => Str::limit($localPart, 60),
                'email' => $email,
                'email_verified' => true,
                'registration_type' => 'google',
            ]);

            return User::withoutGlobalScopes()->find($tenant->owner_user_id);
        } catch (\Throwable $e) {
            Log::error('google_oauth_auto_register_failed', ['email' => $email, 'error' => $e->getMessage()]);

            return null;
        }
    }
}
