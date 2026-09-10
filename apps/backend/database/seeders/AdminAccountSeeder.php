<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use App\Services\RoleService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminAccountSeeder extends Seeder
{
    /**
     * Create a specific admin account with username "admin" and password "deadpassword"
     */
    public function run(): void
    {
        RoleService::ensureDefaults();

        $superAdminRole = Role::query()
            ->where('tenant_id', null)
            ->where('code', 'platform_super_admin')
            ->first();

        if (!$superAdminRole) {
            $this->command->error('Super admin role not found. Please run PlatformBootstrapSeeder first.');
            return;
        }

        // Create or update the admin user
        $user = User::withoutGlobalScopes()->firstOrNew(['username' => 'admin']);
        
        $user->forceFill([
            'name' => 'Admin User',
            'email' => 'admin@maktech.saas',
            'username' => 'admin',
            'password' => Hash::make('deadpassword'),
            'role' => 'admin',
            'is_platform_admin' => true,
            'is_active' => true,
            'email_verified_at' => now(),
        ])->save();

        // Attach super admin role
        if (!$user->roles()->where('role_id', $superAdminRole->id)->exists()) {
            $user->roles()->attach($superAdminRole->id);
        }

        $this->command->info('Admin account created successfully:');
        $this->command->info('Username: admin');
        $this->command->info('Password: deadpassword');
        $this->command->info('Email: admin@maktech.saas');
        $this->command->info('Role: Platform Super Admin');
    }
}