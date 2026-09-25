<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $resident_id
 * @property int $barangay_id
 * @property int|null $requested_by
 * @property string|null $reference_no
 * @property string $type
 * @property string $status
 * @property string|null $remarks
 */
class DocumentRequest extends Model
{
    public const TYPES = ['residency', 'indigency', 'clearance'];

    public const STATUS_PENDING = 'pending';

    public const STATUS_READY = 'ready';

    public const STATUS_RELEASED = 'released';

    public const STATUS_REJECTED = 'rejected';

    /** Readable names, used in notifications and on the staff pages. */
    public const TYPE_LABELS = [
        'residency' => 'Certificate of Residency',
        'indigency' => 'Certificate of Indigency',
        'clearance' => 'Barangay Clearance',
    ];

    protected $fillable = [
        'reference_no',
        'resident_id',
        'barangay_id',
        'requested_by',
        'type',
        'purpose',
        'status',
        'remarks',
        'handled_by',
        'ready_at',
        'released_at',
    ];

    protected function casts(): array
    {
        return [
            'ready_at' => 'datetime',
            'released_at' => 'datetime',
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

    public function typeLabel(): string
    {
        return self::TYPE_LABELS[$this->type] ?? $this->type;
    }

    /** Set once the row has an id, like RES-/HH- ids: DOC-2026-000012. */
    public function assignReferenceNo(): void
    {
        $this->update(['reference_no' => sprintf('DOC-%d-%06d', ($this->created_at ?? now())->year, $this->id)]);
    }
}
