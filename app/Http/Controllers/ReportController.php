<?php

namespace App\Http\Controllers;

use App\Models\Resident;
use App\Services\AuditLogger;
use App\Services\DashboardStatsService;
use App\Services\ReportStatsService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function __construct(
        private readonly DashboardStatsService $dashboard,
        private readonly ReportStatsService $reports,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $barangayId = $this->scopeId($user);

        return Inertia::render('reports/index', [
            'scope' => $user->isSuperAdmin() ? 'City-wide' : ($user->barangay?->name ?? 'Barangay'),
            'totals' => [
                'residents' => Resident::query()->where('is_active', true)
                    ->when($barangayId, fn ($q) => $q->where('barangay_id', $barangayId))->count(),
            ],
            'sectorSummary' => $this->reports->sectorSummary($barangayId),
            'auditSummary' => $this->reports->auditSummary($barangayId),
            'ageDistribution' => $this->dashboard->ageDistribution($barangayId),
            'generatedReports' => $this->reports->generatedReports($barangayId),
        ]);
    }

    /**
     * Sector Dashboard report → printable PDF for DSWD/DILG compliance.
     */
    public function exportPdf(Request $request)
    {
        $user = $request->user();
        $barangayId = $this->scopeId($user);
        $scope = $user->isSuperAdmin() ? 'City-wide' : ($user->barangay?->name ?? 'Barangay');

        $data = [
            'scope' => $scope,
            'generatedAt' => Carbon::now(),
            'generatedBy' => $user->name,
            'totalResidents' => Resident::query()->where('is_active', true)
                ->when($barangayId, fn ($q) => $q->where('barangay_id', $barangayId))->count(),
            'ageDistribution' => $this->dashboard->ageDistribution($barangayId),
            'sectorSummary' => $this->reports->sectorSummary($barangayId),
            'auditSummary' => $this->reports->auditSummary($barangayId),
        ];

        AuditLogger::record('generated_report', 'sector_dashboard', null, null, [
            'scope' => $scope,
            'format' => 'pdf',
        ]);

        $pdf = Pdf::loadView('reports.sector-dashboard', $data);

        return $pdf->download('sector-dashboard-'.Carbon::now()->format('Y-m-d').'.pdf');
    }

    /**
     * Resident Population report → CSV roster export.
     */
    public function exportCsv(Request $request): StreamedResponse
    {
        $user = $request->user();
        $barangayId = $this->scopeId($user);
        $scope = $user->isSuperAdmin() ? 'City-wide' : ($user->barangay?->name ?? 'Barangay');

        AuditLogger::record('generated_report', 'resident_population', null, null, [
            'scope' => $scope,
            'format' => 'csv',
        ]);

        $filename = 'resident-population-'.Carbon::now()->format('Y-m-d').'.csv';

        return response()->streamDownload(function () use ($barangayId) {
            $out = fopen('php://output', 'w');
            fputcsv($out, [
                'Last Name', 'First Name', 'Middle Name', 'Date of Birth', 'Age', 'Sex',
                'Civil Status', 'Address', 'Household No.', 'Sectors', 'Active',
            ]);

            Resident::query()
                ->with(['sectors:id,sector_name', 'household:id,household_number'])
                ->when($barangayId, fn ($q) => $q->where('barangay_id', $barangayId))
                ->orderBy('last_name')
                ->chunk(200, function ($residents) use ($out) {
                    foreach ($residents as $resident) {
                        fputcsv($out, [
                            $resident->last_name,
                            $resident->first_name,
                            $resident->middle_name,
                            $resident->date_of_birth?->format('Y-m-d'),
                            $resident->age,
                            $resident->sex,
                            $resident->civil_status,
                            $resident->address,
                            $resident->household?->household_number,
                            $resident->sectors->pluck('sector_name')->implode('; '),
                            $resident->is_active ? 'Yes' : 'No',
                        ]);
                    }
                });

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    private function scopeId($user): ?int
    {
        return $user->isSuperAdmin() ? null : $user->barangay_id;
    }
}
