<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

/**
 * Records meaningful system mutations into the audit_logs table so the reporting
 * dashboard can surface an activity trail (records updated, registrations,
 * alerts resolved, applications, report generation) for LGU compliance.
 *
 * Called explicitly from controllers - consistent with the codebase's other
 * services (SectorClassificationService, DuplicateDetectionService) rather than
 * Eloquent observers, keeping the trigger points visible and intentional.
 */
class AuditLogger
{
    /**
     * @param  array<string, mixed>|null  $old
     * @param  array<string, mixed>|null  $new
     * @param  int|null  $userId  who did it, when that is not the signed-in user (e.g. during the login event itself)
     */
    public static function record(
        string $action,
        string $table,
        ?int $recordId = null,
        ?array $old = null,
        ?array $new = null,
        ?int $userId = null,
    ): void {
        AuditLog::create([
            'user_id' => $userId ?? Auth::id(),
            'action' => $action,
            'table_affected' => $table,
            'record_id' => $recordId,
            'old_value' => $old !== null ? json_encode($old) : null,
            'new_value' => $new !== null ? json_encode($new) : null,
            'performed_at' => now(),
        ]);
    }
}
