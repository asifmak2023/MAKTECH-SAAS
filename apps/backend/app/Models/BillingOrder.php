<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BillingOrder extends Model
{
    public const TYPE_SUBSCRIPTION = 'subscription';
    public const TYPE_PACKAGE = 'package';
    public const TYPE_PAY_PER_INVOICE = 'pay_per_invoice';
    public const TYPE_OVERAGE = 'overage';
    public const TYPE_ADJUSTMENT = 'adjustment';
    public const TYPE_CREDIT = 'credit';
    public const TYPE_REFUND = 'refund';

    public const STATUS_PENDING = 'pending';
    public const STATUS_PAYMENT_PROCESSING = 'payment_processing';
    public const STATUS_PAID = 'paid';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_REFUNDED = 'refunded';

    protected $fillable = [
        'order_number',
        'tenant_id',
        'order_type',
        'subscription_plan_id',
        'usage_package_id',
        'tenant_subscription_id',
        'description',
        'currency',
        'amount',
        'tax_amount',
        'total_amount',
        'status',
        'period_start',
        'period_end',
        'due_at',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'period_start' => 'datetime',
            'period_end' => 'datetime',
            'due_at' => 'datetime',
            'paid_at' => 'datetime',
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

    public function package(): BelongsTo
    {
        return $this->belongsTo(UsagePackage::class, 'usage_package_id');
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(TenantSubscription::class, 'tenant_subscription_id');
    }

    public function payments(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function billingInvoice(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(BillingInvoice::class);
    }
}
