<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use App\Services\RoleService;
use Illuminate\Database\Seeder;

class AdminAccountSeeder extends Seeder
{
    public function run(): void
    {
        RoleService::ensureDefaults();

        $superAdminRole = Role::query()
            ->where('tenant_id', null)
            ->where('code', 'platform_super_admin')
            ->first();

        if (! $superAdminRole) {
            $this->command?->error('Super admin role not found. Please run PlatformBootstrapSeeder first.');

            return;
        }

        $email = (string) config('saas.seed_admin.email');
        $username = (string) config('saas.seed_admin.username');
        $password = (string) config('saas.seed_admin.password');

        if ($email === '' || $username === '' || $password === '') {
            $this->command?->warn('Skipping AdminAccountSeeder: set SAAS_SEED_ADMIN_EMAIL, SAAS_SEED_ADMIN_USERNAME, and SAAS_SEED_ADMIN_PASSWORD.');

            return;
        }

        $user = User::withoutGlobalScopes()->firstOrNew(['username' => $username]);
        $payload = [
            'name' => $user->name ?: 'Admin User',
            'email' => $email,
            'username' => $username,
            'role' => 'admin',
            'is_platform_admin' => true,
            'is_active' => true,
            'email_verified_at' => $user->email_verified_at ?? now(),
        ];

        if (! $user->exists || $user->password === null) {
            $payload['password'] = $password;
        }

        $user->forceFill($payload)->save();

        if (! $user->roles()->where('role_id', $superAdminRole->id)->exists()) {
            $user->roles()->attach($superAdminRole->id);
        }

        $this->command?->info('Admin account ready: '.$username.' <'.$email.'>');
        $this->command?->info('Password is taken from SAAS_SEED_ADMIN_PASSWORD (not printed).');
    }
}