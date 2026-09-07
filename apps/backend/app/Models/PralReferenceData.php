<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PralReferenceData extends Model
{
    protected $table = 'pral_reference_data';

    protected $fillable = [
        'type',
        'code',
        'name',
        'payload',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'synced_at' => 'datetime',
        ];
    }
}
