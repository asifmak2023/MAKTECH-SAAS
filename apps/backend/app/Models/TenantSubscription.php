<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenantSubscription extends Model
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_TRIAL = 'trial';
    public const STATUS_ACTIVE = 'active';
    public const STATUS_PAST_DUE = 'past_due';
    public const STATUS_GRACE_PERIOD = 'grace_period';
    public const STATUS_SUSPENDED = 'suspended';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_EXPIRED = 'expired';

    protected $fillable = [
        'tenant_id',
        'subscription_plan_id',
        'status',
        'billing_interval',
        'price',
        'currency',
        'invoice_limit',
        'overage_allowed',
        'overage_price',
        'used_invoices',
        'reserved_invoices',
        'grace_period_hours',
        'trial_ends_at',
        'starts_at',
        'current_period_start',
        'current_period_end',
        'next_billing_date',
        'grace_ends_at',
        'suspended_at',
        'cancelled_at',
        'auto_renew',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'overage_allowed' => 'boolean',
            'overage_price' => 'decimal:2',
            'used_invoices' => 'integer',
            'reserved_invoices' => 'integer',
            'trial_ends_at' => 'datetime',
            'starts_at' => 'datetime',
            'current_period_start' => 'datetime',
            'current_period_end' => 'datetime',
            'next_billing_date' => 'datetime',
            'grace_ends_at' => 'datetime',
            'suspended_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'auto_renew' => 'boolean',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id');
    }

    public function isBillable(): bool
    {
        return in_array($this->status, [self::STATUS_ACTIVE, self::STATUS_TRIAL, self::STATUS_GRACE_PERIOD], true);
    }
}
