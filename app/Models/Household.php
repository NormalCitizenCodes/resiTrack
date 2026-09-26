<?php

namespace App\Models;

use Database\Factories\HouseholdFactory;
use Illuminate\Database\Eloquent\Builder;
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
     * Households a search term points at. The barangay says "the Pollich household", so a
     * surname finds it (a member's or the leader's), as do the number and the address.
     *
     * @param  Builder<Household>  $query
     * @return Builder<Household>
     */
    public function scopeMatching(Builder $query, string $term): Builder
    {
        return $query->where(function (Builder $inner) use ($term) {
            $inner->where('household_number', 'like', "%{$term}%")
                ->orWhere('address', 'like', "%{$term}%")
                ->orWhereHas('residents', fn (Builder $residents) => $residents->where('last_name', 'like', "%{$term}%"));
        });
    }

    /**
     * What a household picker shows for a choice. Needs `leader` and `residents` loaded.
     *
     * @return array{id: int, household_number: string|null, address: string|null, family_name: string|null}
     */
    public function pickerOption(): array
    {
        return [
            'id' => $this->id,
            'household_number' => $this->household_number,
            'address' => $this->address,
            'family_name' => $this->familyName(),
        ];
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
