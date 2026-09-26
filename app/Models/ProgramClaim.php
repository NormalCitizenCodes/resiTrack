<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $program_id
 * @property int $resident_id
 * @property int|null $schedule_id
 * @property Carbon $claim_date
 * @property Carbon $claimed_at
 * @property int|null $recorded_by
 * @property string|null $note
 */
class ProgramClaim extends Model
{
    protected $fillable = [
        'program_id',
        'resident_id',
        'schedule_id',
        'claim_date',
        'claimed_at',
        'recorded_by',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'claim_date' => 'date',
            'claimed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Program, $this> */
    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    /** @return BelongsTo<Resident, $this> */
    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    /** @return BelongsTo<ProgramSchedule, $this> */
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(ProgramSchedule::class, 'schedule_id');
    }

    /** @return BelongsTo<User, $this> */
    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
