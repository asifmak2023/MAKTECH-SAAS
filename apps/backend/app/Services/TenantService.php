<?php

namespace App\Services;

use App\Exceptions\TenantStatusException;
use App\Models\BillingLedgerEntry;
use App\Models\FbrIntegration;
use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TenantService
{
    public function __construct(
        protected AuditService $audit,
        protected NotificationService $notifications,
    ) {}

    /**
     * Register a brand new tenant + owner user (public self-service onboarding).
     */
    public function registerTenant(array $data): Tenant
    {
        return DB::transaction(function () use ($data) {
            $tenant = $this->createTenant($data);

            $user = $this->createOwner($tenant, $data);

            $tenant->update(['owner_user_id' => $user->id]);

            $this->bootstrapTenant($tenant);

            $this->audit->record('tenant.registered', 'tenant', $tenant->id, [], $tenant->only(['id', 'name', 'slug']), $tenant->id, $user);

            return $tenant->fresh();
        });
    }

    /**
     * Platform administrator creates a tenant (+ owner optional).
     */
    public function createByAdmin(array $data, ?array $owner = null): Tenant
    {
        return DB::transaction(function () use ($data, $owner) {
            $tenant = $this->createTenant($data);

            if (! empty($owner['name']) && ! empty($owner['email'])) {
                $owner['email_verified'] = $owner['email_verified'] ?? true;
                $user = $this->createOwner($tenant, $owner);
                $tenant->update(['owner_user_id' => $user->id]);
            }

            $this->bootstrapTenant($tenant);

            $this->audit->record('tenant.created', 'tenant', $tenant->id, [], $tenant->only(['id', 'name', 'slug']), $tenant->id);

            return $tenant->fresh();
        });
    }

    public function bootstrapTenant(Tenant $tenant): void
    {
        RoleService::ensureDefaults();

        $free = SaasConfig::registrationFreeInvoices();
        $settings = $tenant->settings ?? [];
        $settings['billing_mode'] = $settings['billing_mode'] ?? 'payg';
        $settings['free_invoice_credits'] = $settings['free_invoice_credits'] ?? max(0, $free);
        $settings['low_quota_notified'] = $settings['low_quota_notified'] ?? [];
        $tenant->update(['settings' => $settings]);

        foreach (['sandbox', 'production'] as $mode) {
            FbrIntegration::query()->firstOrCreate(
                ['tenant_id' => $tenant->id, 'integrator' => 'pral', 'mode' => $mode],
                ['status' => 'unconfigured'],
            );
        }
    }

    public function createOwner(Tenant $tenant, array $data): User
    {
        $attributes = [
            'tenant_id' => $tenant->id,
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'] ?? Str::password(12),
            'role' => 'admin',
            'phone' => $data['phone'] ?? null,
        ];

        $username = trim((string) ($data['username'] ?? $tenant->slug ?? ''));
        if ($username !== '' && ! User::withoutGlobalScopes()->where('username', $username)->exists()) {
            $attributes['username'] = $username;
        }

        $user = User::withoutGlobalScopes()->create($attributes);

        if (! empty($data['email_verified'])) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        $ownerRole = Role::query()->where('tenant_id', null)->where('code', 'tenant_owner')->first();
        if ($ownerRole) {
            $user->roles()->attach($ownerRole->id, ['tenant_id' => $tenant->id]);
        }

        return $user;
    }

    public function createTenant(array $data): Tenant
    {
        $allowPublic = SaasConfig::allowPublicRegistration();
        $requireApproval = SaasConfig::requireAdminApproval();
        $trialDays = (int) ($data['trial_days'] ?? SaasConfig::defaultTrialDays());

        $slug = $data['tenant_slug'] ?? Str::slug($data['tenant_name'] ?? $data['name']);
        if (Tenant::query()->withTrashed()->where('slug', $slug)->exists()) {
            $slug .= '-'.Str::lower(Str::random(4));
        }

        $status = Tenant::STATUS_ACTIVE;
        if (! $allowPublic && empty($data['_admin_created'])) {
            $status = Tenant::STATUS_PENDING;
        } elseif ($requireApproval && empty($data['_admin_created'])) {
            $status = Tenant::STATUS_PENDING;
        } elseif ($trialDays > 0) {
            $status = Tenant::STATUS_TRIAL;
        }

        $tenant = Tenant::query()->create([
            'name' => $data['tenant_name'] ?? $data['name'],
            'legal_name' => $data['legal_name'] ?? null,
            'slug' => $slug,
            'status' => $status,
            'seller_ntn_cnic' => $data['seller_ntn_cnic'] ?? null,
            'seller_business_name' => $data['seller_business_name'] ?? ($data['tenant_name'] ?? $data['name']),
            'seller_province' => $data['seller_province'] ?? null,
            'seller_address' => $data['seller_address'] ?? null,
            'city' => $data['city'] ?? null,
            'seller_email' => $data['seller_email'] ?? $data['email'] ?? null,
            'seller_phone' => $data['seller_phone'] ?? $data['phone'] ?? null,
            'billing_email' => $data['billing_email'] ?? null,
            'registration_type' => $data['registration_type'] ?? null,
            'auto_submit_on_approval' => (bool) ($data['auto_submit_on_approval'] ?? false),
            'trial_ends_at' => $trialDays > 0 ? now()->addDays($trialDays) : null,
        ]);

        return $tenant;
    }

    public function changeStatus(Tenant $tenant, string $status, ?string $note = null): Tenant
    {
        if (! in_array($status, config('saas.statuses', []), true)) {
            throw new \InvalidArgumentException("Unsupported tenant status [{$status}].");
        }

        $old = $tenant->only(['status', 'is_active']);
        $tenant->update([
            'status' => $status,
            'is_active' => ! in_array($status, [Tenant::STATUS_SUSPENDED, Tenant::STATUS_CANCELLED], true),
        ]);

        $this->audit->record("tenant.status.{$status}", 'tenant', $tenant->id, $old, $tenant->only(['status', 'is_active']), $tenant->id);

        if ($status === Tenant::STATUS_SUSPENDED) {
            $this->notifications->toTenant($tenant, 'tenant_suspended', 'Your account has been suspended',
                'Your account was suspended because of an unresolved payment. You can still view history and settle your balance.',
                ['tenant' => $tenant->slug]);
        } elseif (in_array($status, [Tenant::STATUS_ACTIVE, Tenant::STATUS_TRIAL], true)) {
            $this->notifications->toTenant($tenant, 'tenant_activated', 'Your account is active again',
                'Your account is active. You can resume creating and submitting invoices.',
                ['tenant' => $tenant->slug]);
        }

        return $tenant->fresh();
    }

    public function suspend(Tenant $tenant, ?string $note = null): Tenant
    {
        $tenant->status = Tenant::STATUS_SUSPENDED;
        $tenant->is_active = false;
        $tenant->save();

        return $this->changeStatus($tenant->fresh(), Tenant::STATUS_SUSPENDED, $note);
    }

    public function activate(Tenant $tenant, string $status = Tenant::STATUS_ACTIVE): Tenant
    {
        return $this->changeStatus($tenant, $status);
    }

    public function transitionToGrace(Tenant $tenant, ?int $hours = null): Tenant
    {
        $hours = $hours ?? SaasConfig::gracePeriodHours($tenant);

        $tenant->update([
            'status' => Tenant::STATUS_GRACE_PERIOD,
            'is_active' => true,
        ]);

        $this->notifications->toTenant($tenant, 'grace_period_started',
            'Payment due — grace period active',
            "Your billing payment is overdue. You have {$hours} hours to pay before your account is suspended.");

        $this->audit->record('tenant.grace_started', 'tenant', $tenant->id, [], ['hours' => $hours], $tenant->id);

        return $tenant->fresh();
    }

    /**
     * Adjust the tenant invoice-quota ledger (credits / adjustments).
     */
    public function adjustCredits(Tenant $tenant, int $quantity, string $description, float $unitPrice = 0): BillingLedgerEntry
    {
        $entry = BillingLedgerEntry::query()->create([
            'tenant_id' => $tenant->id,
            'entry_type' => BillingLedgerEntry::ENTRY_ADJUSTMENT,
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'amount' => round($quantity * $unitPrice, 2),
            'currency' => $tenant->currency ?? 'PKR',
            'description' => $description,
        ]);

        $settings = $tenant->settings ?? [];
        $credits = max(0, (int) ($settings['free_invoice_credits'] ?? 0) + $quantity);
        $settings['free_invoice_credits'] = $credits;
        $tenant->update(['settings' => $settings]);

        $this->audit->record('tenant.credits.adjust', 'tenant', $tenant->id, [], ['quantity' => $quantity, 'description' => $description], $tenant->id);

        return $entry;
    }

    public function setFbrMode(Tenant $tenant, string $mode): Tenant
    {
        $tenant->update(['fbr_mode' => in_array($mode, ['sandbox', 'production'], true) ? $mode : 'sandbox']);

        return $tenant->fresh();
    }
}
