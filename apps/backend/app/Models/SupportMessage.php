<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportMessage extends Model
{
    protected $fillable = [
        'support_session_id',
        'sender_type',
        'sender_id',
        'body',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(SupportSession::class, 'support_session_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
