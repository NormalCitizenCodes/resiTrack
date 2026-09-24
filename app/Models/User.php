<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailTrait;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property string $role
 * @property int|null $barangay_id
 * @property int|null $agency_id
 * @property int|null $resident_id
 * @property string|null $registration_id
 * @property string|null $google_id
 * @property bool $is_active
 * @property Carbon|null $deactivated_at
 * @property int|null $deactivated_by
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'role', 'first_name', 'last_name', 'barangay_id', 'agency_id', 'resident_id', 'registration_id', 'google_id', 'is_active', 'deactivated_at', 'deactivated_by', 'last_login_at'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, MustVerifyEmailTrait, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    public const ROLE_SUPER_ADMIN = 'super_admin';

    public const ROLE_BARANGAY_ADMIN = 'barangay_admin';

    public const ROLE_BHW = 'bhw';

    public const ROLE_PARTNER_AGENCY = 'partner_agency';

    public const ROLE_RESIDENT = 'resident';

    /**
     * The DB column defaults to true, but that only takes effect on INSERT -
     * an in-memory instance (e.g. the object CreateNewUser::create() hands
     * straight to Auth::login() during self-registration) never sees it
     * unless it's also set here, or EnsureAccountIsActive would immediately
     * log a freshly registered user back out.
     */
    protected $attributes = [
        'is_active' => true,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'is_active' => 'boolean',
            'deactivated_at' => 'datetime',
            'last_login_at' => 'datetime',
        ];
    }

    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class);
    }

    public function agency(): BelongsTo
    {
        return $this->belongsTo(PartnerAgency::class, 'agency_id');
    }

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class, 'resident_id');
    }

    public function reactivationRequests(): HasMany
    {
        return $this->hasMany(AccountReactivationRequest::class);
    }

    public function deletionRequests(): HasMany
    {
        return $this->hasMany(AccountDeletionRequest::class);
    }

    /**
     * Determine whether the user holds any of the given roles.
     */
    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role, $roles, true);
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === self::ROLE_SUPER_ADMIN;
    }

    /**
     * Barangay-side staff who manage resident records.
     */
    public function isBarangayStaff(): bool
    {
        return $this->hasRole(self::ROLE_SUPER_ADMIN, self::ROLE_BARANGAY_ADMIN, self::ROLE_BHW);
    }

    public function isPendingProfiling(): bool
    {
        return $this->role === self::ROLE_RESIDENT
            && $this->resident_id === null
            && $this->registration_id !== null;
    }

    /**
     * Only accounts from public self-registration (registration_id is set only in
     * CreateNewUser::create()) need to click the emailed link. Staff-created accounts
     * (BHW/admin/agency, and resident portal accounts a BHW creates in person) are
     * already vouched for by the staff member who created them.
     */
    public function hasVerifiedEmail(): bool
    {
        if ($this->registration_id === null) {
            return true;
        }

        return $this->email_verified_at !== null;
    }
}
