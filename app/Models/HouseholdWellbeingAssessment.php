<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HouseholdWellbeingAssessment extends Model
{
    protected $fillable = [
        'household_id',
        'level_id',
        'assessed_by',
        'assessment_date',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'assessment_date' => 'date',
        ];
    }

    public function household(): BelongsTo
    {
        return $this->belongsTo(Household::class);
    }

    public function level(): BelongsTo
    {
        return $this->belongsTo(WellbeingLevel::class, 'level_id');
    }

    public function assessor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assessed_by');
    }
}
