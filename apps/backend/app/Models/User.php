<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use BelongsToTenant, HasApiTokens, HasFactory, Notifiable;

    public const ROLE_PLATFORM_ADMIN = 'platform_admin';

    protected $fillable = [
        'tenant_id',
        'name',
        'email',
        'phone',
        'password',
        'role',
        'is_platform_admin',
        'is_active',
        'locale',
        'timezone',
        'expo_push_token',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_platform_admin' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles')->withTimestamps();
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isPlatformAdmin(): bool
    {
        if ($this->is_platform_admin) {
            return true;
        }

        return $this->roles()->where('code', 'like', 'platform_%')->exists();
    }

    public function isTenantOwner(): bool
    {
        return $this->tenant?->owner_user_id === $this->id
            || $this->role === 'admin'
            || $this->hasRole('tenant_owner');
    }

    public function hasRole(string $code): bool
    {
        return $this->roles()->where('code', $code)->exists()
            || ($this->role === 'admin' && in_array($code, ['tenant_owner', 'tenant_admin'], true));
    }

    public function permissionCodes(): array
    {
        $permissions = [];

        foreach ($this->roles()->get() as $role) {
            $permissions = array_merge($permissions, (array) ($role->permissions ?? []));
        }

        // Legacy tenant roles map onto built-in permission sets.
        $legacyMap = [
            'admin' => 'tenant_owner',
            'user' => 'tenant_invoice_user',
        ];
        if (array_key_exists($this->role ?? '', $legacyMap)) {
            $code = $legacyMap[$this->role];
            $seeded = config("saas.roles.{$code}.permissions", []);
            $permissions = array_merge($permissions, $seeded);
        }

        return array_values(array_unique($permissions));
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->isPlatformAdmin() || $this->is_platform_admin) {
            return true;
        }

        foreach ($this->permissionCodes() as $granted) {
            if ($granted === $permission) {
                return true;
            }
            if (str_ends_with($granted, '.*') && str_starts_with($permission, rtrim($granted, '*'))) {
                return true;
            }
        }

        return false;
    }
}
