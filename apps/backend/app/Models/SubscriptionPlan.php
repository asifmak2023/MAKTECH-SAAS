<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    protected $fillable = [
        'code',
        'name',
        'description',
        'billing_interval',
        'price',
        'annual_price',
        'currency',
        'invoice_limit',
        'overage_allowed',
        'overage_price',
        'grace_period_hours',
        'trial_days',
        'features',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'annual_price' => 'decimal:2',
            'overage_allowed' => 'boolean',
            'overage_price' => 'decimal:2',
            'features' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true)->orderBy('sort_order');
    }

    public function displayPrice(string $interval = 'monthly'): string
    {
        return number_format((float) ($interval === 'yearly' && $this->annual_price !== null ? $this->annual_price : $this->price), 0);
    }
}
