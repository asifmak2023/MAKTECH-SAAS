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
        'token_fingerprint',
        'last_test_response',
        'last_tested_at',
    ];

    /**
     * Keyed HMAC of a token value. Tokens are stored inside the encrypted
     * `config` blob, so uniqueness across accounts is derived from this
     * fingerprint (peppered with the app key) rather than the plaintext.
     */
    public static function fingerprintFor(string $token): string
    {
        return hash_hmac('sha256', trim($token), (string) config('app.key'));
    }

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
