<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WellbeingLevel extends Model
{
    protected $fillable = [
        'level_code',
        'label',
        'description',
    ];

    public function assessments(): HasMany
    {
        return $this->hasMany(HouseholdWellbeingAssessment::class, 'level_id');
    }
}
