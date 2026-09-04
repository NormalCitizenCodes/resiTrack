<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Resident extends Model
{
    /** @use HasFactory<\Database\Factories\ResidentFactory> */
    use HasFactory;

    protected $fillable = [
        'household_id',
        'resident_id',
        'barangay_id',
        'philsys_card_no',
        'last_name',
        'first_name',
        'middle_name',
        'suffix',
        'date_of_birth',
        'place_of_birth',
        'sex',
        'civil_status',
        'religion',
        'citizenship',
        'contact_number',
        'email',
        'address',
        'occupation',
        'employment_status',
        'education_level',
        'education_status',
        'monthly_income',
        'is_pwd',
        'is_solo_parent',
        'is_osy',
        'is_senior_citizen',
        'is_pregnant',
        'is_active',
        'is_duplicate_flagged',
        'transferred_to_barangay',
        'transfer_date',
        'transfer_status',
        'registered_at',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'transfer_date' => 'date',
            'registered_at' => 'datetime',
            'monthly_income' => 'decimal:2',
            'is_pwd' => 'boolean',
            'is_solo_parent' => 'boolean',
            'is_osy' => 'boolean',
            'is_senior_citizen' => 'boolean',
            'is_pregnant' => 'boolean',
            'is_active' => 'boolean',
            'is_duplicate_flagged' => 'boolean',
        ];
    }

    protected $appends = ['full_name', 'age'];

    public function fullName(): Attribute
    {
        return Attribute::get(function (): string {
            return trim(collect([
                $this->first_name,
                $this->middle_name,
                $this->last_name,
                $this->suffix,
            ])->filter()->implode(' '));
        });
    }

    /**
     * Age in years derived from date of birth.
     */
    public function age(): Attribute
    {
        return Attribute::get(function (): ?int {
            return $this->date_of_birth?->age;
        });
    }

    public function household(): BelongsTo
    {
        return $this->belongsTo(Household::class);
    }

    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class);
    }

    public function transferBarangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class, 'transferred_to_barangay');
    }

    public function sectors(): BelongsToMany
    {
        return $this->belongsToMany(VulnerabilitySector::class, 'resident_sectors', 'resident_id', 'sector_id')
            ->withPivot('assigned_at')
            ->withTimestamps();
    }

    public function programApplications(): HasMany
    {
        return $this->hasMany(ProgramApplication::class);
    }

    public function beneficiaries(): HasMany
    {
        return $this->hasMany(Beneficiary::class);
    }
}
