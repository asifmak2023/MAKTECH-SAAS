<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Notifications\ResetPasswordLink;
use App\Notifications\VerifyEmailAddress;
use App\Services\TenantService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        protected TenantService $tenants,
    ) {}

    public function register(Request $request): JsonResponse
    {
        TenantContext::forget();

        $data = $request->validate([
            'tenant_name' => ['required', 'string', 'max:255'],
            'tenant_slug' => ['nullable', 'string', 'max:60', 'alpha_dash'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8', 'max:12', 'confirmed'],
            'seller_ntn_cnic' => ['nullable', 'string', 'max:20'],
            'seller_business_name' => ['nullable', 'string', 'max:255'],
            'seller_province' => ['nullable', 'string', 'max:100'],
            'seller_address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'seller_phone' => ['nullable', 'string', 'max:30'],
            'registration_type' => ['nullable', 'string', 'max:40'],
        ], [], [
            'tenant_slug' => 'username',
        ]);

        $tenant = $this->tenants->registerTenant($data);

        $owner = User::withoutGlobalScopes()->findOrFail($tenant->owner_user_id);
        TenantContext::set($tenant);

        $requireVerification = (bool) config('saas.auth.require_email_verification', true);
        if ($requireVerification) {
            $owner->sendEmailVerificationNotification();
        } elseif (! $owner->hasVerifiedEmail()) {
            $owner->forceFill(['email_verified_at' => now()])->save();
            $owner = $owner->fresh();
        }

        return response()->json([
            'token' => $owner->createToken('api')->plainTextToken,
            'user' => $owner->fresh(),
            'tenant' => $tenant,
            'tenant_status' => $tenant->status,
            'email_verified' => $owner->hasVerifiedEmail(),
            'verification_required' => $requireVerification && ! $owner->hasVerifiedEmail(),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'password' => ['required', 'string'],
            'tenant' => ['nullable', 'string'],
        ]);

        $username = trim((string) ($data['username'] ?? ''));
        $email = trim((string) ($data['email'] ?? ''));

        if ($username === '' && $email === '') {
            throw ValidationException::withMessages([
                'username' => ['Enter your username to continue.'],
            ]);
        }

        if ($username !== '') {
            $user = $this->resolveUsernameUser($username);
            $credentialField = 'username';
        } else {
            $user = $this->resolveEmailUser($email, $data['tenant'] ?? null);
            $credentialField = 'email';
        }

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                $credentialField => ['The provided credentials are incorrect.'],
            ]);
        }

        $verificationRequired = (bool) config('saas.auth.require_email_verification', true)
            && ! $user->hasVerifiedEmail()
            && ! $user->isPlatformAdmin();

        if ($user->isPlatformAdmin() || $user->tenant_id === null) {
            TenantContext::forget();

            $user->load('roles');

            return response()->json([
                'token' => $user->createToken('api')->plainTextToken,
                'user' => $user,
                'tenant' => null,
                'is_platform_admin' => true,
                'account_kind' => 'platform_admin',
                'permissions' => $user->permissionCodes(),
                'email_verified' => true,
                'verification_required' => false,
            ]);
        }

        $user->load('tenant');
        $tenant = $user->tenant;
        TenantContext::set($tenant);

        return response()->json([
            'token' => $user->createToken('api')->plainTextToken,
            'user' => $user,
            'tenant' => $tenant,
            'is_platform_admin' => false,
            'account_kind' => 'seller',
            'permissions' => $user->permissionCodes(),
            'email_verified' => $user->hasVerifiedEmail(),
            'verification_required' => $verificationRequired,
        ]);
    }

    protected function resolveUsernameUser(string $username): ?User
    {
        $tenant = Tenant::query()->where('slug', $username)->first();

        if ($tenant) {
            $query = fn () => User::withoutGlobalScopes()->where('tenant_id', $tenant->id);

            if ($tenant->owner_user_id) {
                $owner = $query()->where('id', $tenant->owner_user_id)->first();
                if ($owner) {
                    return $owner;
                }
            }

            return $query()->orderBy('id')->first();
        }

        return User::withoutGlobalScopes()->where('username', $username)->orderBy('id')->first();
    }

    protected function resolveEmailUser(string $email, ?string $tenantSlug): ?User
    {
        if ($tenantSlug) {
            $tenant = Tenant::query()->where('slug', $tenantSlug)->first();
            if ($tenant) {
                $user = User::withoutGlobalScopes()
                    ->where('email', $email)
                    ->where('tenant_id', $tenant->id)
                    ->first();

                if ($user) {
                    return $user;
                }
            }
        }

        return User::withoutGlobalScopes()->where('email', $email)->orderBy('id')->first();
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out']);
    }

    /*
    | Password reset. The same email may exist in more than one workspace, so an
    | optional `tenant` (username) narrows the lookup to that workspace. Without
    | it, a tenant-less (platform admin) account wins, otherwise the first
    | matching account is used - mirroring how /api/auth/login resolves.
    */
    protected function resolvePasswordResetUser(string $email, ?string $tenantSlug): ?User
    {
        $query = fn () => User::withoutGlobalScopes()->where('email', $email);

        if ($tenantSlug) {
            return $query()->whereHas('tenant', function ($q) use ($tenantSlug) {
                $q->where('slug', $tenantSlug);
            })->first() ?? $query()->whereNull('tenant_id')->first();
        }

        return $query()->whereNull('tenant_id')->first()
            ?? $query()->orderBy('id')->first();
    }

    public function sendPasswordResetLink(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'tenant' => ['nullable', 'string', 'max:60', 'alpha_dash'],
        ]);

        $user = $this->resolvePasswordResetUser($data['email'], $data['tenant'] ?? null);

        if ($user) {
            $token = Password::broker()->createToken($user);
            $tenantSlug = $user->tenant_id ? $user->tenant?->slug : null;
            $user->notify(new ResetPasswordLink($token, $user->email, $tenantSlug));
        }

        return response()->json([
            'message' => 'If an account exists for that email, a password reset link has been sent.',
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'token' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'max:12', 'confirmed'],
            'tenant' => ['nullable', 'string', 'max:60', 'alpha_dash'],
        ]);

        $user = $this->resolvePasswordResetUser($data['email'], $data['tenant'] ?? null);
        $repository = Password::broker()->getRepository();

        if (! $user || ! $repository->exists($user, $data['token'])) {
            throw ValidationException::withMessages([
                'token' => ['This password reset link is invalid or has expired. Request a new one.'],
            ]);
        }

        $user->forceFill(['password' => $data['password']])->save();
        $repository->delete($user);
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Your password has been reset. Sign in with your new password.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('tenant');
        $isPlatform = $user->isPlatformAdmin();

        if ($isPlatform) {
            TenantContext::forget();
        }

        $verified = $isPlatform || $user->hasVerifiedEmail();

        return response()->json([
            'user' => $user,
            'tenant' => $isPlatform ? null : $user->tenant,
            'is_platform_admin' => $isPlatform,
            'account_kind' => $isPlatform ? 'platform_admin' : 'seller',
            'permissions' => $user->permissionCodes(),
            'email_verified' => $verified,
            'verification_required' => (bool) config('saas.auth.require_email_verification', true) && ! $verified,
        ]);
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => ['required'],
            'hash' => ['required', 'string'],
            'expires' => ['required', 'integer'],
            'signature' => ['required', 'string'],
        ]);

        if ((int) $data['expires'] < now()->getTimestamp()) {
            throw ValidationException::withMessages([
                'expires' => ['This verification link has expired. Request a new one.'],
            ]);
        }

        $expected = VerifyEmailAddress::makeSignature($data['id'], $data['hash'], (int) $data['expires']);
        $signature = (string) $data['signature'];
        if (strlen($signature) !== strlen($expected) || ! hash_equals($expected, $signature)) {
            throw ValidationException::withMessages([
                'signature' => ['This verification link is invalid.'],
            ]);
        }

        $user = User::withoutGlobalScopes()->findOrFail($data['id']);

        $emailHash = sha1($user->getEmailForVerification());
        $givenHash = (string) $data['hash'];
        if (strlen($givenHash) !== strlen($emailHash) || ! hash_equals($emailHash, $givenHash)) {
            throw ValidationException::withMessages([
                'hash' => ['This verification link is invalid.'],
            ]);
        }

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        TenantContext::set($user->tenant);

        return response()->json([
            'message' => 'Email verified.',
            'email_verified' => true,
            'user' => $user->fresh(),
            'tenant' => $user->tenant,
        ]);
    }

    public function resendVerification(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'Email is already verified.',
                'email_verified' => true,
            ]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Verification email sent.',
            'email_verified' => false,
        ]);
    }

    public function savePushToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'expo_push_token' => ['required', 'string', 'max:255'],
        ]);

        $request->user()->update($data);

        return response()->json(['message' => 'Push token saved']);
    }
}
