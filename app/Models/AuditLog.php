<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int|null $user_id
 * @property string $action
 * @property string|null $table_affected
 * @property int|null $record_id
 * @property string|null $old_value
 * @property string|null $new_value
 * @property CarbonImmutable|null $performed_at
 */
class AuditLog extends Model
{
    protected $fillable = [
        'user_id',
        'action',
        'table_affected',
        'record_id',
        'old_value',
        'new_value',
        'performed_at',
    ];

    protected function casts(): array
    {
        return [
            'performed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
