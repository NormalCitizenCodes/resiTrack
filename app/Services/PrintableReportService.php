<?php

namespace App\Services;

use App\Models\BarangayZone;
use App\Models\Beneficiary;
use App\Models\DuplicateAlert;
use App\Models\Household;
use App\Models\Program;
use App\Models\ProgramApplication;
use App\Models\ProgramClaim;
use App\Models\Resident;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * The figures behind the printable reports (reports/print). Three kinds:
 * a barangay summary, a resident list, and program reach. Every method takes the
 * barangay to report on (null means city-wide, for the super admin) and applies it
 * itself, the same rule as every other resident query in the app.
 */
class PrintableReportService
{
    /** Names beyond this many are cut off, so one print job stays a sensible size. */
    public const MAX_LISTED = 5000;

    public function __construct(private readonly DashboardStatsService $dashboard) {}

    /**
     * @return array<string, mixed>
     */
    public function summary(?int $barangayId, Carbon $from, Carbon $to, bool $compare): array
    {
        $residents = fn (): Builder => Resident::query()->where('is_active', true)->when($barangayId !== null, fn ($q) => $q->where('barangay_id', $barangayId));

        $days = (int) $from->copy()->startOfDay()->diffInDays($to->copy()->startOfDay()) + 1;
        $previousTo = $from->copy()->subDay()->endOfDay();
        $previousFrom = $previousTo->copy()->subDays($days - 1)->startOfDay();

        $count = function (callable $forRange) use ($from, $to, $compare, $previousFrom, $previousTo): array {
            return [
                'current' => (int) $forRange($from->copy()->startOfDay(), $to->copy()->endOfDay()),
                'previous' => $compare ? (int) $forRange($previousFrom, $previousTo) : null,
            ];
        };

        $registrations = fn (Carbon $a, Carbon $b): int => Resident::query()
            ->when($barangayId !== null, fn ($q) => $q->where('barangay_id', $barangayId))
            ->whereBetween('registered_at', [$a, $b])
            ->count();

        $applications = fn (Carbon $a, Carbon $b): int => ProgramApplication::query()
            ->whereBetween('applied_at', [$a, $b])
            ->when($barangayId !== null, fn ($q) => $q->whereHas('resident', fn ($r) => $r->where('barangay_id', $barangayId)))
            ->count();

        $resolved = fn (Carbon $a, Carbon $b): int => DuplicateAlert::query()
            ->where('status', 'resolved')
            ->whereBetween('resolved_at', [$a, $b])
            ->inBarangay($barangayId)
            ->count();

        $sexCounts = $residents()->selectRaw('sex, count(*) as total')->groupBy('sex')->pluck('total', 'sex');

        $puroks = $barangayId === null ? [] : Resident::query()
            ->join('households', 'households.id', '=', 'residents.household_id')
            ->join('barangay_zones', 'barangay_zones.id', '=', 'households.zone_id')
            ->where('residents.is_active', true)
            ->where('residents.barangay_id', $barangayId)
            ->selectRaw('barangay_zones.zone_name as name, count(*) as total')
            ->groupBy('barangay_zones.zone_name')
            ->orderBy('barangay_zones.zone_name')
            ->get()
            ->map(fn ($row) => ['name' => (string) $row->getAttribute('name'), 'count' => (int) $row->getAttribute('total')])
            ->all();

        return [
            'totals' => [
                'residents' => $residents()->count(),
                'households' => Household::query()->when($barangayId !== null, fn ($q) => $q->where('barangay_id', $barangayId))->count(),
                'fourps_households' => Household::query()->where('is_4ps_beneficiary', true)->when($barangayId !== null, fn ($q) => $q->where('barangay_id', $barangayId))->count(),
                'active_beneficiaries' => Beneficiary::query()->where('status', 'active')
                    ->when($barangayId !== null, fn ($q) => $q->whereHas('resident', fn ($r) => $r->where('barangay_id', $barangayId)))
                    ->count(),
            ],
            'sex' => [
                ['label' => 'Female', 'count' => (int) ($sexCounts['female'] ?? 0)],
                ['label' => 'Male', 'count' => (int) ($sexCounts['male'] ?? 0)],
            ],
            'sectors' => $this->dashboard->sectorCounts($barangayId),
            'ages' => array_map(fn (array $bracket) => ['label' => $bracket['label'], 'count' => $bracket['count']], $this->dashboard->ageDistribution($barangayId)),
            'puroks' => $puroks,
            'activity' => [
                ['label' => 'New registrations', ...$count($registrations)],
                ['label' => 'Program applications', ...$count($applications)],
                ['label' => 'Duplicate alerts resolved', ...$count($resolved)],
            ],
            'compared_with' => $compare ? [
                'from' => $previousFrom->toDateString(),
                'to' => $previousTo->toDateString(),
            ] : null,
        ];
    }

    /**
     * @param  array{sector: ?string, sex: ?string, age_min: ?int, age_max: ?int, zone_id: ?int, status: string, names: bool, from: ?Carbon, to: ?Carbon}  $filters
     * @return array<string, mixed>
     */
    public function residents(?int $barangayId, array $filters): array
    {
        $query = Resident::query()
            ->when($barangayId !== null, fn ($q) => $q->where('barangay_id', $barangayId));

        if ($filters['status'] !== 'all') {
            $query->where('is_active', true);
        }

        if ($filters['sex'] !== null) {
            $query->where('sex', $filters['sex']);
        }

        if ($filters['sector'] !== null) {
            $sector = $filters['sector'];
            $query->whereHas('sectors', fn ($s) => $s->where('vulnerability_sectors.code', $sector));
        }

        if ($filters['zone_id'] !== null) {
            $zone = $filters['zone_id'];
            $query->whereHas('household', fn ($h) => $h->where('zone_id', $zone));
        }

        if ($filters['age_min'] !== null || $filters['age_max'] !== null) {
            $query->whereNotNull('date_of_birth');
        }

        if ($filters['age_min'] !== null) {
            $query->whereDate('date_of_birth', '<=', Carbon::today()->subYears($filters['age_min'])->toDateString());
        }

        if ($filters['age_max'] !== null) {
            $query->whereDate('date_of_birth', '>=', Carbon::today()->subYears($filters['age_max'] + 1)->addDay()->toDateString());
        }

        if ($filters['from'] !== null) {
            $query->where('registered_at', '>=', $filters['from']->copy()->startOfDay());
        }

        if ($filters['to'] !== null) {
            $query->where('registered_at', '<=', $filters['to']->copy()->endOfDay());
        }

        $total = (clone $query)->count();

        $people = $query
            ->with(['sectors:id,code,sector_name', 'household:id,household_number,zone_id'])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->limit(20000)
            ->get();

        /** @var array<int, string> $zoneNames */
        $zoneNames = BarangayZone::query()->pluck('zone_name', 'id')->all();
        $purokOf = function (Resident $person) use ($zoneNames): ?string {
            $zoneId = $person->household?->getAttribute('zone_id');

            return is_numeric($zoneId) ? ($zoneNames[(int) $zoneId] ?? null) : null;
        };

        $sex = ['female' => 0, 'male' => 0];
        $sectors = [];
        $puroks = [];
        $ages = ['0–12' => 0, '13–17' => 0, '18–35' => 0, '36–59' => 0, '60+' => 0];

        foreach ($people as $person) {
            $key = $person->sex === 'male' ? 'male' : 'female';
            $sex[$key]++;

            $age = $person->age;

            if ($age !== null) {
                $ages[match (true) {
                    $age <= 12 => '0–12',
                    $age <= 17 => '13–17',
                    $age <= 35 => '18–35',
                    $age <= 59 => '36–59',
                    default => '60+',
                }]++;
            }

            foreach ($person->sectors as $sector) {
                $name = (string) $sector->getAttribute('sector_name');
                $sectors[$name] = ($sectors[$name] ?? 0) + 1;
            }

            $purok = $purokOf($person) ?? 'No purok recorded';
            $puroks[$purok] = ($puroks[$purok] ?? 0) + 1;
        }

        ksort($puroks);

        $rows = [];

        if ($filters['names']) {
            foreach ($people->take(self::MAX_LISTED) as $person) {
                $rows[] = [
                    'name' => trim("{$person->last_name}, {$person->first_name} {$person->middle_name}"),
                    'sex' => $person->sex === 'male' ? 'M' : 'F',
                    'age' => $person->age,
                    'sectors' => $person->sectors->pluck('sector_name')->implode(', '),
                    'purok' => $purokOf($person),
                    'household' => $person->household?->getAttribute('household_number'),
                    'active' => (bool) $person->is_active,
                ];
            }
        }

        return [
            'show_names' => $filters['names'],
            'total' => $total,
            'truncated' => $filters['names'] && $total > self::MAX_LISTED,
            'rows' => $rows,
            'sex' => [['label' => 'Female', 'count' => $sex['female']], ['label' => 'Male', 'count' => $sex['male']]],
            'ages' => collect($ages)->map(fn (int $count, string $label) => ['label' => $label, 'count' => $count])->values()->all(),
            'sectors' => collect($sectors)->map(fn (int $count, string $name) => ['name' => $name, 'count' => $count])->sortByDesc('count')->values()->all(),
            'puroks' => collect($puroks)->map(fn (int $count, string $name) => ['name' => $name, 'count' => $count])->values()->all(),
        ];
    }

    /**
     * The household leaders, purok by purok, for an attendance or claim sheet: who to call, how to
     * reach them, and a blank to sign. Households with no leader recorded are counted, not listed.
     *
     * @return array<string, mixed>
     */
    public function leaders(?int $barangayId, ?int $zoneId): array
    {
        $households = Household::query()
            ->when($barangayId !== null, fn ($q) => $q->where('barangay_id', $barangayId))
            ->when($zoneId !== null, fn ($q) => $q->where('zone_id', $zoneId))
            ->with(['zone:id,zone_name', 'leader:id,first_name,middle_name,last_name,suffix,contact_number', 'residents:id,household_id,last_name'])
            ->withCount(['residents as active_members' => fn ($q) => $q->where('is_active', true)])
            ->get();

        $groups = [];
        $without = 0;

        foreach ($households as $household) {
            if ($household->leader === null) {
                $without++;

                continue;
            }

            $purok = $household->zone?->getAttribute('zone_name');
            $purok = is_string($purok) ? $purok : 'No purok recorded';

            $groups[$purok][] = [
                'family' => $household->familyName() ?? '-',
                'leader' => $household->leader->full_name,
                'contact' => $household->leader->contact_number,
                'members' => (int) $household->getAttribute('active_members'),
                'household' => $household->household_number,
            ];
        }

        ksort($groups);

        return [
            'groups' => collect($groups)->map(function (array $rows, string $purok) {
                usort($rows, fn (array $a, array $b) => strcasecmp($a['family'], $b['family']));

                return ['purok' => $purok, 'rows' => $rows];
            })->values()->all(),
            'total' => array_sum(array_map('count', $groups)),
            'without_leader' => $without,
        ];
    }

    private function dateOnly(mixed $value): ?string
    {
        return $value instanceof CarbonInterface ? $value->toDateString() : null;
    }

    /**
     * How far each program has reached the residents it is meant for: who could
     * qualify, who applied, who was approved and who is an active beneficiary.
     *
     * @return array<string, mixed>
     */
    public function programs(?int $barangayId, ?Carbon $from, ?Carbon $to): array
    {
        $fromDate = $from?->toDateString();
        $toDate = $to?->toDateString();

        $programs = Program::query()
            ->with(['agency:id,agency_name', 'sectors:id'])
            ->when($barangayId !== null, fn ($q) => $q->where(fn ($inner) => $inner->whereNull('barangay_id')->orWhere('barangay_id', $barangayId)))
            ->when($fromDate !== null, fn ($q) => $q->where(fn ($inner) => $inner->whereNull('end_date')->orWhereDate('end_date', '>=', (string) $fromDate)))
            ->when($toDate !== null, fn ($q) => $q->where(fn ($inner) => $inner->whereNull('start_date')->orWhereDate('start_date', '<=', (string) $toDate)))
            ->orderBy('title')
            ->get();

        $rows = [];

        foreach ($programs as $program) {
            $sectorIds = $program->sectors->pluck('id')->all();

            // A program aimed at one barangay only counts that barangay's residents.
            $eligibleBarangay = $program->barangay_id ?? $barangayId;

            $eligible = Resident::query()
                ->where('is_active', true)
                ->when($eligibleBarangay !== null, fn ($q) => $q->where('barangay_id', $eligibleBarangay))
                ->when($sectorIds !== [], fn ($q) => $q->whereHas('sectors', fn ($s) => $s->whereIn('vulnerability_sectors.id', $sectorIds)))
                ->count();

            $byStatus = ProgramApplication::query()
                ->where('program_id', $program->id)
                ->when($barangayId !== null, fn ($q) => $q->whereHas('resident', fn ($r) => $r->where('barangay_id', $barangayId)))
                ->select('status', DB::raw('count(*) as total'))
                ->groupBy('status')
                ->pluck('total', 'status')
                ->all();

            $beneficiaries = Beneficiary::query()
                ->where('program_id', $program->id)
                ->where('status', 'active')
                ->when($barangayId !== null, fn ($q) => $q->whereHas('resident', fn ($r) => $r->where('barangay_id', $barangayId)))
                ->count();

            $applicants = (int) array_sum($byStatus);

            // Beneficiaries who actually came to claim (each person counted once, however many claim days).
            $claimed = ProgramClaim::query()
                ->where('program_id', $program->id)
                ->when($barangayId !== null, fn ($q) => $q->whereHas('resident', fn ($r) => $r->where('barangay_id', $barangayId)))
                ->distinct()
                ->count('resident_id');

            $rows[] = [
                'title' => $program->title,
                'agency' => $program->agency?->getAttribute('agency_name'),
                'status' => $program->status,
                'city_wide' => $program->barangay_id === null,
                'starts' => $this->dateOnly($program->getAttribute('start_date')),
                'ends' => $this->dateOnly($program->getAttribute('end_date')),
                'slots' => $program->slots_available,
                'eligible' => $eligible,
                'applicants' => $applicants,
                'pending' => (int) ($byStatus['pending'] ?? 0),
                'approved' => (int) ($byStatus['approved'] ?? 0),
                'rejected' => (int) ($byStatus['rejected'] ?? 0),
                'beneficiaries' => $beneficiaries,
                'claimed' => $claimed,
                'not_applied' => max(0, $eligible - $applicants),
                'reach' => $eligible > 0 ? (int) round($beneficiaries / $eligible * 100) : null,
            ];
        }

        return [
            'rows' => $rows,
            'totals' => [
                'programs' => count($rows),
                'eligible_places' => array_sum(array_column($rows, 'eligible')),
                'beneficiaries' => array_sum(array_column($rows, 'beneficiaries')),
                'applicants' => array_sum(array_column($rows, 'applicants')),
            ],
        ];
    }
}
