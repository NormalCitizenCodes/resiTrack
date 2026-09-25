<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Program extends Model
{
    protected $fillable = [
        'agency_id',
        'barangay_id',
        'posted_by',
        'title',
        'description',
        'eligibility_criteria',
        'slots_available',
        'slots_filled',
        'start_date',
        'end_date',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    public function agency(): BelongsTo
    {
        return $this->belongsTo(PartnerAgency::class, 'agency_id');
    }

    /**
     * Null means city-wide - open to residents of every barangay.
     */
    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function sectors(): BelongsToMany
    {
        return $this->belongsToMany(VulnerabilitySector::class, 'program_sectors', 'program_id', 'sector_id')
            ->withTimestamps();
    }

    public function applications(): HasMany
    {
        return $this->hasMany(ProgramApplication::class);
    }

    public function beneficiaries(): HasMany
    {
        return $this->hasMany(Beneficiary::class);
    }

    /**
     * The owning agency (within its barangay, if it has one) or a super admin.
     * The same rule ProgramController and ProgramApplicationController apply.
     */
    public function isManagedBy(?User $user): bool
    {
        if ($user === null) {
            return false;
        }

        return $user->isSuperAdmin()
            || ($user->role === User::ROLE_PARTNER_AGENCY
                && $this->agency_id === $user->agency_id
                && ($user->barangay_id === null || $this->barangay_id === null || $this->barangay_id === $user->barangay_id));
    }

    /** @return HasMany<ProgramSchedule, $this> */
    public function schedules(): HasMany
    {
        return $this->hasMany(ProgramSchedule::class)->orderBy('starts_at');
    }
}
