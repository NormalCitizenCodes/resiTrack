<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Concern;
use App\Models\DocumentRequest;
use Illuminate\Database\Eloquent\Builder;

/**
 * Turns raw audit_logs rows into sentences a barangay admin can read
 * ("Registered resident Juan Dela Cruz"), and groups them into the categories
 * the Activity Log filters by. Staff-facing, so English.
 *
 * Unknown (action, table) pairs still show, as a humanized fallback, so a
 * new AuditLogger call never silently disappears from the log.
 */
class ActivityLogPresenter
{
    public const CATEGORIES = [
        'records' => 'Residents and households',
        'programs' => 'Programs and announcements',
        'services' => 'Certificates, reports and ID checks',
        'accounts' => 'Accounts and staff',
        'reports' => 'Report exports',
        'signins' => 'Sign-ins',
    ];

    private const RECORD_TABLES = ['residents', 'households', 'household_wellbeing_assessments', 'duplicate_alerts'];

    private const PROGRAM_TABLES = ['programs', 'program_applications', 'program_schedules', 'announcements'];

    private const SERVICE_TABLES = ['document_requests', 'concerns', 'hotlines'];

    private const ACCOUNT_TABLES = ['users', 'account_deletion_requests', 'account_reactivation_requests', 'password_recovery_requests', 'partner_agencies'];

    /**
     * Book-keeping rows that always come paired with a clearer one (the
     * "reviewed" row beside "approved"/"rejected", the barangay assignment
     * beside the account creation). Hidden so each action reads once.
     */
    public const HIDDEN_ACTIONS = ['deletion_request_reviewed', 'partner_agency_barangay_assigned'];

    /**
     * @param  Builder<AuditLog>  $query
     */
    public static function whereCategory(Builder $query, string $category): void
    {
        match ($category) {
            'signins' => $query->where('action', 'login'),
            'reports' => $query->where('action', 'generated_report'),
            'records' => $query->whereIn('table_affected', self::RECORD_TABLES)->where('action', '!=', 'verify_id'),
            'programs' => $query->whereIn('table_affected', self::PROGRAM_TABLES),
            'services' => $query->where(fn ($q) => $q->whereIn('table_affected', self::SERVICE_TABLES)->orWhere('action', 'verify_id')),
            'accounts' => $query->whereIn('table_affected', self::ACCOUNT_TABLES)->where('action', '!=', 'login'),
            default => null,
        };
    }

    /**
     * @return array{summary: string, subject: string|null, note: string|null, link: string|null}
     */
    public function describe(AuditLog $log): array
    {
        $new = $this->decode($log->new_value);
        $old = $this->decode($log->old_value);
        $value = fn (string $key): ?string => isset($new[$key]) && is_scalar($new[$key]) ? (string) $new[$key]
            : (isset($old[$key]) && is_scalar($old[$key]) ? (string) $old[$key] : null);

        $id = $log->record_id;
        $selfService = ($new['source'] ?? null) === 'self_service';
        $documentLabel = DocumentRequest::TYPE_LABELS[$value('type') ?? ''] ?? 'certificate';
        $concernLabel = Concern::CATEGORY_LABELS[$value('category') ?? ''] ?? null;

        [$summary, $subject, $note, $link] = match ($log->action.'|'.$log->table_affected) {
            'login|users' => ['Signed in', null, null, null],

            'create|residents' => ['Registered resident', $value('name'), null, $id ? "/residents/{$id}" : null],
            'update|residents' => $selfService
                ? ['Updated their own profile', null, null, null]
                : ['Updated resident', $value('name'), null, $id ? "/residents/{$id}" : null],
            'deactivate|residents' => ['Deactivated resident', $value('name'), null, $id ? "/residents/{$id}" : null],
            'activate|residents' => ['Reactivated resident', $value('name'), null, $id ? "/residents/{$id}" : null],
            'force_delete|residents' => ['Permanently deleted resident', trim(($value('name') ?? '').' '.($value('resident_id') ? '('.$value('resident_id').')' : '')), null, null],
            'verify_id|residents' => [
                $value('result') === 'valid' ? 'Scanned a genuine ID card' : 'Scanned an ID card that did not verify',
                $value('resident_id'),
                null,
                $value('result') === 'valid' && $id ? "/residents/{$id}" : null,
            ],

            'create|households' => ['Registered household', $value('household_number'), null, $id ? "/households/{$id}" : null],
            'create|household_wellbeing_assessments' => ['Recorded a wellbeing assessment', null, null, $value('household_id') ? '/households/'.$value('household_id') : null],

            'resolve|duplicate_alerts' => ['Resolved a duplicate alert', null, null, '/duplicate-alerts'],
            'dismiss|duplicate_alerts' => ['Marked a duplicate alert as not a duplicate', null, null, '/duplicate-alerts'],
            'escalate|duplicate_alerts' => ['Escalated a duplicate alert to the admin', null, $value('note'), '/duplicate-alerts'],

            'create|programs' => ['Published program', $value('title'), null, $id ? "/programs/{$id}" : null],
            'update|programs' => ['Edited program', $value('title'), null, $id ? "/programs/{$id}" : null],
            'delete|programs' => ['Deleted program', $value('title'), null, null],
            'apply|program_applications' => $log->user?->role === 'resident'
                ? ['Applied to', $value('program'), null, null]
                : ['Endorsed '.($value('resident') ?? 'a resident').' for', $value('program'), null, null],
            'approve|program_applications' => ['Approved an application for', $value('program'), null, null],
            'reject|program_applications' => ['Rejected a program application', null, null, null],
            'create|program_schedules' => ['Posted a claim date for', $value('program'), null, null],
            'delete|program_schedules' => ['Cancelled a claim date for', $value('program'), null, null],
            'create|announcements' => ['Posted announcement', $value('title'), null, '/announcements'],
            'delete|announcements' => ['Deleted announcement', $value('title'), null, null],

            'create|document_requests' => ['Requested a '.$documentLabel, $value('reference_no'), null, null],
            'delete|document_requests' => ['Cancelled certificate request', $value('reference_no'), null, null],
            'update|document_requests' => [$this->documentStep($value('status')), $value('reference_no'), null, null],
            'create|concerns' => ['Reported a concern'.($concernLabel ? " ({$concernLabel})" : ''), $value('reference_no'), null, null],
            'update|concerns' => ['Set a resident report to '.str_replace('_', ' ', $value('status') ?? 'updated'), $value('reference_no'), $value('response'), null],
            'create|hotlines' => ['Added hotline', trim(($value('name') ?? '').' '.($value('number') ?? '')), null, '/hotlines'],
            'delete|hotlines' => ['Removed hotline', trim(($value('name') ?? '').' '.($value('number') ?? '')), null, '/hotlines'],

            'create|users' => ['Created a staff account for', trim(($value('name') ?? '').' '.($value('role') ? '('.str_replace('_', ' ', $value('role')).')' : '')), null, null],
            'deactivate|users' => ['Deactivated the staff account of', $value('name'), null, null],
            'reactivate|users' => ['Reactivated the staff account of', $value('name'), null, null],
            'account_deactivated|users' => ['Deactivated a resident\'s login account', null, null, null],
            'account_reactivated|users' => ['Reactivated a resident\'s login account', null, null, null],
            'password_reset|users' => ['Set a new password for', $value('name'), null, null],
            'approve|password_recovery_requests' => ['Approved a password recovery request from', $value('name'), null, null],
            'reject|password_recovery_requests' => ['Rejected a password recovery request from', $value('name'), null, null],
            'deletion_requested|account_deletion_requests' => ['Asked for their account to be deleted', null, $value('reason'), null],
            'deletion_request_approved|account_deletion_requests' => ['Approved an account deletion request', null, null, null],
            'deletion_request_rejected|account_deletion_requests' => ['Rejected an account deletion request', null, null, null],
            'account_reactivation_requested|account_reactivation_requests' => ['Asked for their account to be reactivated', null, $value('reason'), null],
            'account_reactivation_approved|account_reactivation_requests' => ['Approved an account reactivation request', null, null, null],
            'account_reactivation_rejected|account_reactivation_requests' => ['Rejected an account reactivation request', null, null, null],
            'partner_agency_created|partner_agencies' => ['Added partner agency', $value('agency_name'), null, null],
            'partner_agency_updated|partner_agencies' => ['Updated partner agency', $value('agency_name'), null, null],
            'partner_agency_profile_updated|partner_agencies' => ['Updated their agency profile', null, null, null],
            'partner_agency_account_created|users' => ['Created a partner agency account', null, null, null],
            'partner_agency_account_updated|users' => ['Updated a partner agency account', null, null, null],
            'partner_agency_account_activated|users' => ['Activated a partner agency account', null, null, null],
            'partner_agency_account_deactivated|users' => ['Deactivated a partner agency account', null, null, null],

            'generated_report|sector_dashboard' => ['Exported the sector report', '('.strtoupper($value('format') ?? 'pdf').')', null, '/reports'],
            'generated_report|resident_population' => ['Exported the resident list', '('.strtoupper($value('format') ?? 'csv').')', null, '/reports'],

            default => [ucfirst(str_replace('_', ' ', $log->action)).' '.str_replace('_', ' ', (string) $log->table_affected), null, null, null],
        };

        return [
            'summary' => $summary,
            'subject' => $subject === '' ? null : $subject,
            'note' => $note,
            'link' => $link,
        ];
    }

    public static function categoryOf(AuditLog $log): string
    {
        return match (true) {
            $log->action === 'login' => 'signins',
            $log->action === 'generated_report' => 'reports',
            $log->action === 'verify_id', in_array($log->table_affected, self::SERVICE_TABLES, true) => 'services',
            in_array($log->table_affected, self::RECORD_TABLES, true) => 'records',
            in_array($log->table_affected, self::PROGRAM_TABLES, true) => 'programs',
            default => 'accounts',
        };
    }

    private function documentStep(?string $status): string
    {
        return match ($status) {
            DocumentRequest::STATUS_READY => 'Marked ready for pickup: certificate request',
            DocumentRequest::STATUS_RELEASED => 'Released certificate request',
            DocumentRequest::STATUS_REJECTED => 'Declined certificate request',
            default => 'Updated certificate request',
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function decode(?string $json): array
    {
        $decoded = $json ? json_decode($json, true) : null;

        return is_array($decoded) ? $decoded : [];
    }
}
