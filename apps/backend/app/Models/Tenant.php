<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Tenant extends Model
{
    use SoftDeletes, HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_TRIAL = 'trial';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_PAST_DUE = 'past_due';
    public const STATUS_GRACE_PERIOD = 'grace_period';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_CANCELLED = 'cancelled';

    public const BILLING_PAYG = 'payg';
    public const BILLING_SUBSCRIPTION = 'subscription';

    protected $fillable = [
        'name',
        'legal_name',
        'slug',
        'domain',
        'status',
        'registration_type',
        'seller_ntn_cnic',
        'seller_business_name',
        'seller_province',
        'seller_address',
        'city',
        'business_category',
        'seller_email',
        'seller_phone',
        'billing_email',
        'logo_path',
        'auto_submit_on_approval',
        'is_active',
        'currency',
        'integrator',
        'fbr_mode',
        'owner_user_id',
        'trial_ends_at',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'auto_submit_on_approval' => 'boolean',
            'is_active' => 'boolean',
            'settings' => 'array',
            'trial_ends_at' => 'datetime',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(TenantSubscription::class)->latest('id');
    }

    public function activeSubscription(): HasOne
    {
        return $this->hasOne(TenantSubscription::class)
            ->whereIn('status', [TenantSubscription::STATUS_TRIAL, TenantSubscription::STATUS_ACTIVE, TenantSubscription::STATUS_GRACE_PERIOD])
            ->latestOfMany();
    }

    public function packagePurchases(): HasMany
    {
        return $this->hasMany(UsagePackagePurchase::class);
    }

    public function activePackagePurchases(): HasMany
    {
        return $this->packagePurchases()->available()->orderBy('expires_at');
    }

    public function billingOrders(): HasMany
    {
        return $this->hasMany(BillingOrder::class);
    }

    public function billingInvoices(): HasMany
    {
        return $this->hasMany(BillingInvoice::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(BillingLedgerEntry::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function fbrIntegrations(): HasMany
    {
        return $this->hasMany(FbrIntegration::class);
    }

    public function roles(): HasMany
    {
        return $this->hasMany(Role::class);
    }

    public function isActive(): bool
    {
        return $this->is_active && ! in_array($this->status, [self::STATUS_SUSPENDED, self::STATUS_CANCELLED], true);
    }

    public function isSuspended(): bool
    {
        return $this->status === self::STATUS_SUSPENDED || ! $this->is_active;
    }

    public function canBillInvoices(): bool
    {
        return in_array($this->status, [
            self::STATUS_TRIAL,
            self::STATUS_ACTIVE,
            self::STATUS_PAST_DUE,
            self::STATUS_GRACE_PERIOD,
        ], true) && $this->is_active;
    }
}
