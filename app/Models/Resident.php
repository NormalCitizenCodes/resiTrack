<?php

namespace App\Models;

use App\Services\AuditLogger;
use Carbon\CarbonInterface;
use Database\Factories\ResidentFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * @property-read string $full_name
 * @property-read int|null $age
 * @property Carbon|null $date_of_birth
 * @property Carbon|null $registered_at
 * @property Carbon|null $pregnancy_expected_month
 * @property Carbon|null $profiled_at
 */
class Resident extends Model
{
    /** @use HasFactory<ResidentFactory> */
    use HasFactory;

    protected static function booted(): void
    {
        // A household leader who moves to another household, is deactivated, or turns out to be
        // under 18 no longer leads. The family then picks again, so the household is left without one.
        static::updated(function (Resident $resident): void {
            if (! $resident->wasChanged(['household_id', 'is_active', 'date_of_birth'])) {
                return;
            }

            Household::query()->where('leader_resident_id', $resident->id)->get()->each(function (Household $household) use ($resident): void {
                if (Household::canLead($resident, $household)) {
                    return;
                }

                $household->update(['leader_resident_id' => null]);

                AuditLogger::record('update', 'households', $household->id, null, [
                    'household_number' => $household->household_number,
                    'changed' => 'household leader removed, '.$resident->full_name.' no longer qualifies',
                ]);
            });
        });
    }

    private const ID_PREFIX = 'RES';

    /** RES + 3-digit barangay + 2-digit year + 5-digit number. */
    private const ID_LENGTH = 13;

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
        'pregnancy_expected_month',
        'pregnancy_source',
        'is_active',
        'is_duplicate_flagged',
        'transferred_to_barangay',
        'transfer_date',
        'transfer_status',
        'registered_at',
        'profiled_by_user_id',
        'profiled_at',
        'address_region_code',
        'address_province_code',
        'address_city_code',
        'address_barangay_code',
        'address_street',
        'address_zip',
        'birth_region_code',
        'birth_province_code',
        'birth_city_code',
        'birth_barangay_code',
        'previous_region_code',
        'previous_province_code',
        'previous_city_code',
        'previous_barangay_code',
        'previous_street',
        'previous_zip',
        'previous_address',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'transfer_date' => 'date',
            'registered_at' => 'datetime',
            'profiled_at' => 'datetime',
            'monthly_income' => 'decimal:2',
            'is_pwd' => 'boolean',
            'is_solo_parent' => 'boolean',
            'is_osy' => 'boolean',
            'is_senior_citizen' => 'boolean',
            'is_pregnant' => 'boolean',
            'pregnancy_expected_month' => 'date',
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

    public function portalAccount(): HasOne
    {
        return $this->hasOne(User::class, 'resident_id');
    }

    public function profiledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'profiled_by_user_id');
    }

    /**
     * The next resident ID for a barangay, like RES0182600045: RES, the barangay's
     * three-digit code, the two-digit registration year, then a five-digit running
     * number that counts every resident of that barangay and never resets. The
     * widths are fixed, so the compact form can only be read one way.
     */
    public static function nextOfficialId(int $barangayId, CarbonInterface|string|null $at = null): string
    {
        $code = self::barangayCode($barangayId);
        $year = Carbon::parse($at ?? now())->format('y');

        // Fixed width, so the highest number is also the highest string.
        $last = (string) self::query()
            ->where('resident_id', 'like', self::ID_PREFIX.$code.'%')
            ->whereRaw('length(resident_id) = ?', [self::ID_LENGTH])
            ->max(DB::raw('substr(resident_id, '.(strlen(self::ID_PREFIX) + 3 + 2 + 1).')'));

        return sprintf('%s%s%s%05d', self::ID_PREFIX, $code, $year, ((int) $last) + 1);
    }

    /**
     * The barangay's part of an ID: the last three digits of its PSGC code (unique
     * within a city, and what the PWD ID uses). A barangay not yet linked to a PSGC
     * code falls back to its own number, which still cannot collide because the
     * running number is counted per code.
     */
    private static function barangayCode(int $barangayId): string
    {
        $psgc = (string) Barangay::query()->whereKey($barangayId)->value('psgc_code');

        return strlen($psgc) >= 3 ? substr($psgc, -3) : sprintf('%03d', $barangayId % 1000);
    }

    /** Uppercase letters and digits only, so RES 018 26 00045 and res-018-26-00045 mean the same ID. */
    public static function normalizeOfficialId(string $value): string
    {
        return strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $value));
    }

    /** RES 018 26 00045, for reading. The stored and typed form is the compact one. */
    public static function formatOfficialId(?string $id): ?string
    {
        if ($id !== null && preg_match('/^RES(\d{3})(\d{2})(\d{5})$/', $id, $parts)) {
            return "RES {$parts[1]} {$parts[2]} {$parts[3]}";
        }

        return $id;
    }

    /**
     * The stored spellings an ID typed by a person can match: with or without spaces
     * or hyphens (the exact text is also tried, for an ID kept in an older form).
     * Use with whereIn('resident_id', ...).
     *
     * @return array<int, string>
     */
    public static function officialIdSpellings(string $typed): array
    {
        return array_values(array_unique([strtoupper(trim($typed)), self::normalizeOfficialId($typed)]));
    }

    public function assignOfficialId(): void
    {
        DB::transaction(function () {
            // Two people registering in one barangay at once must not read the same "last" number.
            Barangay::query()->whereKey($this->barangay_id)->lockForUpdate()->first();

            $this->update([
                'resident_id' => self::nextOfficialId((int) $this->barangay_id, $this->registered_at ?? $this->created_at),
            ]);
        });
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

    /** @return HasMany<DocumentRequest, $this> */
    public function documentRequests(): HasMany
    {
        return $this->hasMany(DocumentRequest::class);
    }

    /** @return HasMany<Concern, $this> */
    public function concerns(): HasMany
    {
        return $this->hasMany(Concern::class);
    }

    /**
     * Short signature printed in the ID card's QR code, so a guessed or typed
     * resident number alone does not verify. Tied to APP_KEY: rotating the key
     * invalidates every printed code, which is the point.
     */
    public static function idSignature(string $residentId): string
    {
        return substr(hash_hmac('sha256', 'resident-id|'.$residentId, (string) config('app.key')), 0, 16);
    }
}
