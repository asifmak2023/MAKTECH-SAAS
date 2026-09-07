<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class PaymentGateway extends Model
{
    protected $fillable = [
        'code',
        'name',
        'description',
        'is_enabled',
        'is_sandbox',
        'config',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_enabled' => 'boolean',
            'is_sandbox' => 'boolean',
        ];
    }

    public function configArray(): array
    {
        $value = $this->config;

        if (! $value) {
            return [];
        }

        try {
            return (array) json_decode((string) Crypt::decryptString($value), true);
        } catch (\Throwable) {
            // Fall back to a plain (non-encrypted) payload for older seed rows.
            return (array) json_decode((string) $value, true);
        }
    }

    public function setConfigArray(array $config): static
    {
        $this->config = Crypt::encryptString((string) json_encode($config));

        return $this;
    }

    public function hideCredentials(): array
    {
        return collect($this->configArray())
            ->map(fn ($value, $key) => str_contains((string) $key, 'secret')
                || str_contains((string) $key, 'key')
                || str_contains((string) $key, 'password')
                || str_contains((string) $key, 'salt')
                ? '••••••••'
                : $value)
            ->all();
    }

    public function scopeEnabled($query)
    {
        return $query->where('is_enabled', true);
    }
}
