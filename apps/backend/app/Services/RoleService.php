<?php

namespace App\Services;

use App\Models\Role;

class RoleService
{
    /**
     * Seed the platform-wide role templates (tenant_id = null so every tenant can
     * reuse them). Called on registration/bootstrap and by the database seeder.
     */
    public static function ensureDefaults(): void
    {
        foreach ((array) config('saas.roles', []) as $code => $role) {
            self::upsert('tenant_roles', $code, $role['name'], $role['permissions'], $role['description'] ?? null);
        }

        foreach ((array) config('saas.platform_roles', []) as $code => $role) {
            self::upsert('platform_roles', $code, $role['name'], $role['permissions'], $role['description'] ?? null);
        }
    }

    /**
     * Persist one role template. Global templates keep tenant_id = null; tenant
     * specific copies (from Admin -> Roles) carry a tenant_id.
     */
    public static function upsert(string $scope, string $code, string $name, array $permissions, ?string $description = null, ?int $tenantId = null): Role
    {
        return Role::query()->updateOrCreate(
            ['tenant_id' => $tenantId, 'code' => $code],
            [
                'name' => $name,
                'description' => $description,
                'permissions' => $permissions,
                'is_system' => $tenantId === null,
            ]
        );
    }

    public static function find(string $code, ?int $tenantId = null): ?Role
    {
        return Role::query()->where('code', $code)->when($tenantId !== null, fn ($q) => $q->where('tenant_id', $tenantId))->first();
    }
}
