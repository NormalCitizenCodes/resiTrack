<?php

namespace App\Models;

use Database\Factories\HouseholdFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Household extends Model
{
    /** @use HasFactory<HouseholdFactory> */
    use HasFactory;

    protected $fillable = [
        'household_id',
        'barangay_id',
        'zone_id',
        'leader_resident_id',
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
        'address_region_code',
        'address_province_code',
        'address_city_code',
        'address_barangay_code',
        'address_street',
        'address_zip',
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

    /** The member the family chose to represent it. */
    public function leader(): BelongsTo
    {
        return $this->belongsTo(Resident::class, 'leader_resident_id');
    }

    /** Leaders must be an active member of the household, and an adult (18 or older). */
    public const LEADER_MIN_AGE = 18;

    public static function canLead(Resident $resident, self $household): bool
    {
        return $resident->household_id === $household->id
            && $resident->is_active
            && $resident->age !== null
            && $resident->age >= self::LEADER_MIN_AGE;
    }

    /**
     * How the barangay refers to the household: the leader's surname, or failing that the
     * most common surname among the members. Needs `leader` and `residents` loaded.
     */
    public function familyName(): ?string
    {
        $leader = $this->leader?->last_name;

        if (is_string($leader) && $leader !== '') {
            return $leader;
        }

        $common = $this->residents->pluck('last_name')->filter()->countBy()->sortDesc()->keys()->first();

        return is_string($common) ? $common : null;
    }

    public function wellbeingAssessments(): HasMany
    {
        return $this->hasMany(HouseholdWellbeingAssessment::class);
    }

    /** @return HasOne<HouseholdWellbeingAssessment, $this> */
    public function currentWellbeing(): HasOne
    {
        return $this->hasOne(HouseholdWellbeingAssessment::class)->latestOfMany(['assessment_date', 'id']);
    }
}
