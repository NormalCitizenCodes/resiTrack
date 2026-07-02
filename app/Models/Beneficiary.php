<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Beneficiary extends Model
{
    protected $fillable = [
        'program_id',
        'resident_id',
        'application_id',
        'status',
        'added_by',
        'date_added',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'date_added' => 'datetime',
        ];
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    public function application(): BelongsTo
    {
        return $this->belongsTo(ProgramApplication::class, 'application_id');
    }

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }
}
