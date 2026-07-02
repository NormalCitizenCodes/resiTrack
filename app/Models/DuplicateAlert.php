<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DuplicateAlert extends Model
{
    protected $fillable = [
        'resident_id_1',
        'resident_id_2',
        'similarity_score',
        'match_basis',
        'status',
        'resolved_by',
        'detected_at',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'similarity_score' => 'float',
            'detected_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function residentOne(): BelongsTo
    {
        return $this->belongsTo(Resident::class, 'resident_id_1');
    }

    public function residentTwo(): BelongsTo
    {
        return $this->belongsTo(Resident::class, 'resident_id_2');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    /**
     * Restrict to alerts where EITHER matched resident belongs to the barangay,
     * so a receiving barangay still sees an incoming transfer. A null barangay
     * (super admin / city-wide) applies no restriction.
     */
    public function scopeInBarangay(Builder $query, ?int $barangayId): Builder
    {
        if ($barangayId === null) {
            return $query;
        }

        return $query->where(function ($outer) use ($barangayId) {
            $outer->whereHas('residentOne', fn ($r) => $r->where('barangay_id', $barangayId))
                ->orWhereHas('residentTwo', fn ($r) => $r->where('barangay_id', $barangayId));
        });
    }
}
