<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgramSector extends Model
{
    protected $fillable = [
        'program_id',
        'sector_id',
    ];

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    public function sector(): BelongsTo
    {
        return $this->belongsTo(VulnerabilitySector::class, 'sector_id');
    }
}
