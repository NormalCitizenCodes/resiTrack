<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResidentSector extends Model
{
    protected $fillable = [
        'resident_id',
        'sector_id',
        'assigned_at',
    ];

    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
        ];
    }

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    public function sector(): BelongsTo
    {
        return $this->belongsTo(VulnerabilitySector::class, 'sector_id');
    }
}
