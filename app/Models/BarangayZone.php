<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BarangayZone extends Model
{
    protected $fillable = [
        'barangay_id',
        'zone_name',
        'latitude',
        'longitude',
        'boundary_coordinates',
    ];

    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class);
    }

    public function households(): HasMany
    {
        return $this->hasMany(Household::class, 'zone_id');
    }
}
