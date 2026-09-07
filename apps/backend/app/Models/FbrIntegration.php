<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FbrIntegration extends Model
{
    protected $fillable = [
        'tenant_id',
        'integrator',
        'mode',
        'status',
        'config',
        'last_test_response',
        'last_tested_at',
    ];

    protected function casts(): array
    {
        return [
            'last_test_response' => 'array',
            'last_tested_at' => 'datetime',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function configArray(): array
    {
        $value = $this->config;

        if (! $value) {
            return [];
        }

        try {
            return (array) json_decode((string) \Illuminate\Support\Facades\Crypt::decryptString($value), true);
        } catch (\Throwable) {
            return (array) json_decode((string) $value, true);
        }
    }

    public function setConfigArray(array $config): static
    {
        $this->config = \Illuminate\Support\Facades\Crypt::encryptString((string) json_encode($config));

        return $this;
    }
}
