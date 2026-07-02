<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SectorCriteria extends Model
{
    protected $table = 'sector_criteria';

    protected $fillable = [
        'sector_id',
        'criteria_field',
        'criteria_operator',
        'criteria_value',
        'effective_date',
    ];

    protected function casts(): array
    {
        return [
            'effective_date' => 'date',
        ];
    }

    public function sector(): BelongsTo
    {
        return $this->belongsTo(VulnerabilitySector::class, 'sector_id');
    }
}
