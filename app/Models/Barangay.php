<?php

namespace App\Models;

use Database\Factories\BarangayFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Barangay extends Model
{
    /** @use HasFactory<BarangayFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'city_municipality',
        'province',
        'region',
        'psgc_code',
    ];

    public function zones(): HasMany
    {
        return $this->hasMany(BarangayZone::class);
    }

    public function households(): HasMany
    {
        return $this->hasMany(Household::class);
    }

    public function residents(): HasMany
    {
        return $this->hasMany(Resident::class);
    }
}
