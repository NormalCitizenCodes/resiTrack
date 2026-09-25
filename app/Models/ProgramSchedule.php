<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $program_id
 * @property string $title
 * @property Carbon $starts_at
 * @property string $location
 * @property string|null $what_to_bring
 * @property string|null $notes
 */
class ProgramSchedule extends Model
{
    protected $fillable = [
        'program_id',
        'title',
        'starts_at',
        'location',
        'what_to_bring',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Program, $this> */
    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }
}
