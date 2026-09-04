<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Household extends Model
{
    /** @use HasFactory<\Database\Factories\HouseholdFactory> */
    use HasFactory;

    protected $fillable = [
        'household_id',
        'barangay_id',
        'zone_id',
        'household_number',
        'address',
        'latitude',
        'longitude',
        'house_materials',
        'house_ownership',
        'water_source',
        'electricity_source',
        'waste_management',
        'toilet_facility',
        'member_count',
        'monthly_income',
        'is_4ps_beneficiary',
    ];

    protected function casts(): array
    {
        return [
            'monthly_income' => 'decimal:2',
            'is_4ps_beneficiary' => 'boolean',
        ];
    }

    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class);
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(BarangayZone::class, 'zone_id');
    }

    public function residents(): HasMany
    {
        return $this->hasMany(Resident::class);
    }

    public function wellbeingAssessments(): HasMany
    {
        return $this->hasMany(HouseholdWellbeingAssessment::class);
    }
}
