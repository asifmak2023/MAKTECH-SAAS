<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UsagePackage extends Model
{
    protected $fillable = [
        'code',
        'name',
        'description',
        'invoice_quantity',
        'price',
        'currency',
        'validity_days',
        'overage_allowed',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'overage_allowed' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order');
    }
}
