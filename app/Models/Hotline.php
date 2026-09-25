<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int|null $barangay_id
 * @property string $name
 * @property string $number
 */
class Hotline extends Model
{
    public const CATEGORIES = ['emergency', 'police', 'fire', 'medical', 'disaster', 'barangay', 'other'];

    protected $fillable = [
        'barangay_id',
        'name',
        'number',
        'category',
        'sort_order',
        'created_by',
    ];

    /**
     * Null means city-wide.
     *
     * @return BelongsTo<Barangay, $this>
     */
    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class);
    }
}
