<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FbrSubmissionHistory extends Model
{
    protected $table = 'fbr_submission_history';

    public $timestamps = false;

    protected $fillable = [
        'tenant_id',
        'invoice_id',
        'user_id',
        'action',
        'attempt',
        'request',
        'response',
        'status',
        'error_code',
        'error_message',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'request' => 'array',
            'response' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }
}
