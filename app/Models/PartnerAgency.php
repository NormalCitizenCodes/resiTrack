<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PartnerAgency extends Model
{
    /** @use HasFactory<\Database\Factories\PartnerAgencyFactory> */
    use HasFactory;

    protected $fillable = [
        'agency_name',
        'agency_type',
        'contact_person',
        'contact_number',
        'email',
        'address',
        'is_active',
        'registered_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'registered_at' => 'datetime',
        ];
    }

    public function programs(): HasMany
    {
        return $this->hasMany(Program::class, 'agency_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'agency_id');
    }
}
