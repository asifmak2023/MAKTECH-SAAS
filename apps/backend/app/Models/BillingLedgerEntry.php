<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BillingLedgerEntry extends Model
{
    protected $table = 'billing_ledger';

    public const ENTRY_PACKAGE_PURCHASE = 'PACKAGE_PURCHASE';
    public const ENTRY_INVOICE_USAGE = 'INVOICE_USAGE';
    public const ENTRY_SUBSCRIPTION_CHARGE = 'SUBSCRIPTION_CHARGE';
    public const ENTRY_OVERAGE_CHARGE = 'OVERAGE_CHARGE';
    public const ENTRY_PAY_PER_INVOICE = 'PAY_PER_INVOICE';
    public const ENTRY_REFUND = 'REFUND';
    public const ENTRY_CREDIT = 'CREDIT';
    public const ENTRY_ADJUSTMENT = 'ADJUSTMENT';
    public const ENTRY_PAYMENT = 'PAYMENT';
    public const ENTRY_REVERSAL = 'REVERSAL';

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'entry_type',
        'reference_type',
        'reference_id',
        'quantity',
        'unit_price',
        'amount',
        'currency',
        'description',
        'meta',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'decimal:2',
            'amount' => 'decimal:2',
            'meta' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected static function booted(): void
    {
        static::creating(function (self $entry) {
            $entry->created_at = $entry->created_at ?? now();
        });
    }
}
