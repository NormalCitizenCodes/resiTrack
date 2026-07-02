<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\DuplicateAlert;
use App\Models\Household;
use App\Models\ProgramApplication;
use App\Models\Resident;
use Illuminate\Support\Carbon;

/**
 * Figures for the Reports & Sector Dashboard (Objective 3). Reuses
 * DashboardStatsService for the sector/age breakdowns and adds the report-specific
 * pieces: the 4Ps household count, the 30-day audit summary, and the history of
 * generated reports drawn from the audit_logs trail.
 */
class ReportStatsService
{
    public function __construct(private readonly DashboardStatsService $dashboard) {}

    /**
     * Sector summary shown on the reports page: the five vulnerability sectors
     * plus the household-level 4Ps count.
     *
     * @return array{sectors: array<int, array{code: string, name: string, count: int}>, fourps_households: int}
     */
    public function sectorSummary(?int $barangayId = null): array
    {
        return [
            'sectors' => $this->dashboard->sectorCounts($barangayId),
            'fourps_households' => Household::query()
                ->where('is_4ps_beneficiary', true)
                ->when($barangayId, fn ($q) => $q->where('barangay_id', $barangayId))
                ->count(),
        ];
    }

    /**
     * System activity over the last 30 days for the audit summary box.
     *
     * @return array<string, int>
     */
    public function auditSummary(?int $barangayId = null): array
    {
        $since = Carbon::now()->subDays(30);

        return [
            'records_updated' => AuditLog::query()
                ->whereIn('action', ['create', 'update'])
                ->where('performed_at', '>=', $since)
                ->when($barangayId, fn ($q) => $q->whereHas('user', fn ($u) => $u->where('barangay_id', $barangayId)))
                ->count(),
            'new_registrations' => Resident::query()
                ->where('registered_at', '>=', $since)
                ->when($barangayId, fn ($q) => $q->where('barangay_id', $barangayId))
                ->count(),
            'duplicates_resolved' => DuplicateAlert::query()
                ->where('status', 'resolved')
                ->where('resolved_at', '>=', $since)
                ->inBarangay($barangayId)
                ->count(),
            'program_applications' => ProgramApplication::query()
                ->where('applied_at', '>=', $since)
                ->when($barangayId, fn ($q) => $q->whereHas('resident', fn ($r) => $r->where('barangay_id', $barangayId)))
                ->count(),
        ];
    }

    /**
     * Paginated history of generated reports, drawn from the audit trail.
     */
    public function generatedReports(?int $barangayId = null, int $perPage = 10)
    {
        return AuditLog::query()
            ->where('action', 'generated_report')
            ->with('user:id,name,role')
            ->when($barangayId, fn ($q) => $q->whereHas('user', fn ($u) => $u->where('barangay_id', $barangayId)))
            ->latest('performed_at')
            ->paginate($perPage);
    }
}
