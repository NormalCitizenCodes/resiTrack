<?php

namespace App\Http\Controllers;

use App\Models\Barangay;
use App\Models\BarangayZone;
use App\Models\Resident;
use App\Models\VulnerabilitySector;
use App\Services\AuditLogger;
use App\Services\DashboardStatsService;
use App\Services\PrintableReportService;
use App\Services\ReportStatsService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    private const TYPES = [
        'summary' => ['title' => 'Barangay Summary Report', 'table' => 'barangay_summary'],
        'residents' => ['title' => 'Resident List', 'table' => 'resident_list'],
        'programs' => ['title' => 'Program Reach Report', 'table' => 'program_reach'],
        'leaders' => ['title' => 'Household Leaders List', 'table' => 'household_leaders'],
    ];

    public function __construct(
        private readonly DashboardStatsService $dashboard,
        private readonly ReportStatsService $reports,
        private readonly PrintableReportService $printable,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $barangayId = $this->scopeId($user);

        return Inertia::render('reports/index', [
            'sectors' => VulnerabilitySector::query()->orderBy('id')->get(['code', 'sector_name'])
                ->map(fn ($sector) => ['code' => $sector->code, 'name' => $sector->sector_name])->all(),
            'zones' => BarangayZone::query()
                ->when($barangayId !== null, fn ($q) => $q->where('barangay_id', $barangayId))
                ->orderBy('zone_name')
                ->get(['id', 'zone_name', 'barangay_id'])
                ->map(fn ($zone) => ['id' => $zone->id, 'name' => $zone->zone_name, 'barangay_id' => $zone->barangay_id])->all(),
            'barangays' => $user->isSuperAdmin() ? Barangay::query()->orderBy('name')->get(['id', 'name'])->all() : [],
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
     * A finished-looking report on screen, ready to print or save as PDF from the
     * browser's own print dialog. Staff see their own barangay only; the super admin
     * sees the whole city or one barangay of their choice.
     */
    public function print(Request $request): Response
    {
        $user = $request->user();

        $validated = $request->validate([
            'type' => ['required', Rule::in(array_keys(self::TYPES))],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'compare' => ['nullable', 'boolean'],
            'barangay_id' => ['nullable', 'integer', 'exists:barangays,id'],
            'sector' => ['nullable', 'string', 'exists:vulnerability_sectors,code'],
            'sex' => ['nullable', Rule::in(['male', 'female'])],
            'age_min' => ['nullable', 'integer', 'min:0', 'max:130'],
            'age_max' => ['nullable', 'integer', 'min:0', 'max:130', 'gte:age_min'],
            'zone_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in(['active', 'all'])],
            'names' => ['nullable', 'boolean'],
            'noted_by' => ['nullable', 'string', 'max:100'],
        ]);

        $barangayId = $user->isSuperAdmin() ? (int) ($validated['barangay_id'] ?? 0) : (int) $user->barangay_id;
        $barangayId = $barangayId > 0 ? $barangayId : null;
        $barangay = $barangayId !== null ? Barangay::find($barangayId) : null;
        $type = $validated['type'];

        // The summary always has a period; the other reports use one only if it was asked for.
        $from = isset($validated['from']) ? Carbon::parse($validated['from']) : null;
        $to = isset($validated['to']) ? Carbon::parse($validated['to']) : null;
        $summaryFrom = $from ?? Carbon::today()->startOfMonth();
        $summaryTo = $to ?? Carbon::today();

        // A purok belongs to one barangay; one from elsewhere is ignored, not an error.
        $zone = isset($validated['zone_id'])
            ? BarangayZone::query()->when($barangayId !== null, fn ($q) => $q->where('barangay_id', $barangayId))->find((int) $validated['zone_id'])
            : null;
        $sector = isset($validated['sector']) ? VulnerabilitySector::where('code', $validated['sector'])->first() : null;
        $showNames = $request->boolean('names', true);

        $filters = [];

        $shown = $type === 'summary' ? [$summaryFrom, $summaryTo] : [$from, $to];
        $period = match (true) {
            $shown[0] !== null && $shown[1] !== null => $shown[0]->format('F j, Y').' to '.$shown[1]->format('F j, Y'),
            $shown[0] !== null => 'From '.$shown[0]->format('F j, Y'),
            $shown[1] !== null => 'Up to '.$shown[1]->format('F j, Y'),
            default => null,
        };

        $report = match ($type) {
            'summary' => $this->printable->summary($barangayId, $summaryFrom, $summaryTo, $request->boolean('compare', true)),
            'programs' => $this->printable->programs($barangayId, $from, $to),
            'leaders' => $this->printable->leaders($barangayId, $zone?->id),
            default => $this->printable->residents($barangayId, [
                'sector' => $sector?->code,
                'sex' => $validated['sex'] ?? null,
                'age_min' => isset($validated['age_min']) ? (int) $validated['age_min'] : null,
                'age_max' => isset($validated['age_max']) ? (int) $validated['age_max'] : null,
                'zone_id' => $zone?->id,
                'status' => $validated['status'] ?? 'active',
                'names' => $showNames,
                'from' => $from,
                'to' => $to,
            ]),
        };

        if ($type === 'leaders' && $zone) {
            $filters[] = ['label' => 'Purok', 'value' => $zone->zone_name];
        }

        if ($type === 'residents') {
            if ($sector) {
                $filters[] = ['label' => 'Sector', 'value' => $sector->sector_name];
            }
            if (isset($validated['sex'])) {
                $filters[] = ['label' => 'Sex', 'value' => ucfirst($validated['sex'])];
            }
            if (isset($validated['age_min']) || isset($validated['age_max'])) {
                $filters[] = ['label' => 'Age', 'value' => ($validated['age_min'] ?? 0).' to '.($validated['age_max'] ?? 'any age')];
            }
            if ($zone) {
                $filters[] = ['label' => 'Purok', 'value' => $zone->zone_name];
            }
            if (($validated['status'] ?? 'active') === 'all') {
                $filters[] = ['label' => 'Records', 'value' => 'Active and inactive'];
            }
        }

        $scopeName = $barangay ? $barangay->name : 'City-wide';

        AuditLogger::record('generated_report', self::TYPES[$type]['table'], null, null, [
            'scope' => $scopeName,
            'format' => 'print',
            'names' => $type === 'residents' ? $showNames : null,
            'period' => $period,
            'filters' => collect($filters)->map(fn (array $filter) => $filter['label'].': '.$filter['value'])->all(),
        ]);

        return Inertia::render('reports/print', [
            // Loaded inside a hidden frame by the report builder: no toolbar, and the builder starts the printing.
            'embed' => $request->boolean('embed'),
            'type' => $type,
            'report' => $report,
            'meta' => [
                'title' => $type === 'summary' && $barangay === null ? 'City-wide Summary Report' : self::TYPES[$type]['title'],
                'scope' => $scopeName,
                'city' => $barangay ? $barangay->city_municipality : 'Cagayan de Oro City',
                'period' => $period,
                'filters' => $filters,
                'generated_at' => Carbon::now()->format('F j, Y g:i A'),
                'generated_by' => $user->name,
                'noted_by' => isset($validated['noted_by']) ? trim($validated['noted_by']) : null,
                'generated_by_role' => $user->roleLabel(),
            ],
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
