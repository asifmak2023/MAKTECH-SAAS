<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Services\TenantService;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(
        protected TenantService $tenants,
    ) {}

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tenant_name' => ['required', 'string', 'max:255'],
            'tenant_slug' => ['nullable', 'string', 'max:60', 'alpha_dash'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
            'seller_ntn_cnic' => ['nullable', 'string', 'max:20'],
            'seller_business_name' => ['nullable', 'string', 'max:255'],
            'seller_province' => ['nullable', 'string', 'max:100'],
            'seller_address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'seller_phone' => ['nullable', 'string', 'max:30'],
            'registration_type' => ['nullable', 'string', 'max:40'],
        ]);

        $tenant = $this->tenants->registerTenant($data);

        $owner = User::query()->findOrFail($tenant->owner_user_id);
        TenantContext::set($tenant);

        return response()->json([
            'token' => $owner->createToken('api')->plainTextToken,
            'user' => $owner->fresh(),
            'tenant' => $tenant,
            'tenant_status' => $tenant->status,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'tenant' => ['nullable', 'string'],
        ]);

        $tenant = TenantContext::get();
        if (! $tenant && ! empty($data['tenant'])) {
            $tenant = Tenant::query()->where('slug', $data['tenant'])->first();
            TenantContext::set($tenant);
        }

        $query = User::withoutGlobalScopes()->where('email', $data['email']);
        if ($tenant) {
            $query->where('tenant_id', $tenant->id);
        }

        $user = $query->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($user->is_platform_admin || $user->tenant_id === null) {
            TenantContext::forget();

            $user->load('roles');

            return response()->json([
                'token' => $user->createToken('api')->plainTextToken,
                'user' => $user,
                'tenant' => null,
                'is_platform_admin' => true,
                'permissions' => $user->permissionCodes(),
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
            'permissions' => $user->permissionCodes(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('tenant');
        $isPlatform = $user->isPlatformAdmin();

        return response()->json([
            'user' => $user,
            'tenant' => $isPlatform ? null : $user->tenant,
            'is_platform_admin' => $isPlatform,
            'permissions' => $user->permissionCodes(),
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
