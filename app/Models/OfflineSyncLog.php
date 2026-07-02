<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OfflineSyncLog extends Model
{
    protected $fillable = [
        'user_id',
        'barangay_id',
        'device_id',
        'table_affected',
        'record_id',
        'action',
        'sync_status',
        'created_offline_at',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'created_offline_at' => 'datetime',
            'synced_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class);
    }
}
