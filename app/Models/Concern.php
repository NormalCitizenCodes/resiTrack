<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $resident_id
 * @property int $barangay_id
 * @property int|null $reported_by
 * @property string|null $reference_no
 * @property string $category
 * @property string $status
 * @property string|null $response
 * @property Carbon|null $resolved_at
 */
class Concern extends Model
{
    public const CATEGORIES = ['streetlight', 'garbage', 'drainage', 'road', 'safety', 'noise', 'record_correction', 'other'];

    public const STATUSES = ['open', 'in_progress', 'resolved', 'closed'];

    /** Readable names for staff pages and notifications. */
    public const CATEGORY_LABELS = [
        'streetlight' => 'Streetlight',
        'garbage' => 'Garbage collection',
        'drainage' => 'Drainage or flooding',
        'road' => 'Road or sidewalk',
        'safety' => 'Peace and order',
        'noise' => 'Noise or nuisance',
        'record_correction' => 'Correction to my record',
        'other' => 'Other',
    ];

    protected $fillable = [
        'reference_no',
        'resident_id',
        'barangay_id',
        'reported_by',
        'category',
        'description',
        'location',
        'status',
        'response',
        'handled_by',
        'resolved_at',
    ];

    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Resident, $this> */
    public function resident(): BelongsTo
    {
        return $this->belongsTo(Resident::class);
    }

    /** @return BelongsTo<Barangay, $this> */
    public function barangay(): BelongsTo
    {
        return $this->belongsTo(Barangay::class);
    }

    /** @return BelongsTo<User, $this> */
    public function handledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    public function categoryLabel(): string
    {
        return self::CATEGORY_LABELS[$this->category] ?? $this->category;
    }

    public function assignReferenceNo(): void
    {
        $this->update(['reference_no' => sprintf('CON-%d-%06d', ($this->created_at ?? now())->year, $this->id)]);
    }
}
