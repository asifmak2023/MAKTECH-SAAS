<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InvoiceUsageEvent extends Model
{
    public const EVENT_RESERVE = 'reserve';
    public const EVENT_CONSUME = 'consume';
    public const EVENT_RELEASE = 'release';

    protected $fillable = [
        'tenant_id',
        'invoice_id',
        'event',
        'source_type',
        'source_id',
        'quantity',
        'unit_price',
        'amount',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'decimal:2',
            'amount' => 'decimal:2',
            'meta' => 'array',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }
}
