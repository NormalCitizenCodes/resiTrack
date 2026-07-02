<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Announcement extends Model
{
    protected $fillable = [
        'posted_by',
        'barangay_id',
        'title',
        'content',
        'posted_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'posted_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class);
    }

    /**
     * No sectors attached means broadcast to every resident in the barangay.
     */
    public function sectors(): BelongsToMany
    {
        return $this->belongsToMany(VulnerabilitySector::class, 'announcement_sectors', 'announcement_id', 'sector_id')
            ->withTimestamps();
    }
}
