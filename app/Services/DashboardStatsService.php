<?php

namespace App\Services;

use App\Models\Barangay;
use App\Models\DuplicateAlert;
use App\Models\Household;
use App\Models\Resident;
use App\Models\VulnerabilitySector;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Aggregates the figures shown on the barangay dashboard and sector reports.
 */
class DashboardStatsService
{
    /**
     * Headline + breakdown statistics, optionally scoped to a single barangay.
     *
     * @return array<string, mixed>
     */
    public function forBarangay(?int $barangayId = null): array
    {
        $residents = Resident::query()->where('is_active', true);
        $households = Household::query();

        if ($barangayId) {
            $residents->where('barangay_id', $barangayId);
            $households->where('barangay_id', $barangayId);
        }

        $householdCount = (clone $households)->count();
        $residentsInHomes = (clone $residents)->whereNotNull('household_id')->count();

        return [
            'total_residents' => (clone $residents)->count(),
            'total_households' => $householdCount,
            'registrations' => $this->registrationTrend($barangayId),
            'household_facts' => [
                'average_size' => $householdCount > 0 ? round($residentsInHomes / $householdCount, 1) : null,
                'fourps' => (clone $households)->where('is_4ps_beneficiary', true)->count(),
                'no_purok' => (clone $households)->whereNull('zone_id')->count(),
            ],
            'pending_duplicates' => $this->pendingDuplicates($barangayId),
            'age_distribution' => $this->ageDistribution($barangayId),
            'sector_counts' => $this->sectorCounts($barangayId),
            'compound' => $this->compoundVulnerability($barangayId),
        ];
    }

    /**
     * New registrations in each of the last six calendar months, oldest first, the
     * current month last (and still filling up).
     *
     * @return array<int, array{month: string, label: string, count: int}>
     */
    public function registrationTrend(?int $barangayId = null): array
    {
        $thisMonth = Carbon::today()->startOfMonth();
        $trend = [];

        for ($back = 5; $back >= 0; $back--) {
            $start = $thisMonth->copy()->subMonths($back);

            $trend[] = [
                'month' => $start->format('M'),
                'label' => $start->format('F Y'),
                'count' => Resident::query()
                    ->when($barangayId, fn ($q) => $q->where('barangay_id', $barangayId))
                    ->whereBetween('registered_at', [$start, $start->copy()->endOfMonth()])
                    ->count(),
            ];
        }

        return $trend;
    }

    /**
     * Population split into the five age brackets used on the dashboard.
     *
     * @return array<int, array{label: string, count: int, male: int, female: int}>
     */
    public function ageDistribution(?int $barangayId = null): array
    {
        $brackets = [
            ['label' => '0–12', 'min' => 0, 'max' => 12],
            ['label' => '13–17', 'min' => 13, 'max' => 17],
            ['label' => '18–35', 'min' => 18, 'max' => 35],
            ['label' => '36–59', 'min' => 36, 'max' => 59],
            ['label' => '60+', 'min' => 60, 'max' => 200],
        ];

        return array_map(function (array $bracket) use ($barangayId) {
            $today = Carbon::today();
            $maxBirth = $today->copy()->subYears($bracket['min'])->toDateString();
            $minBirth = $today->copy()->subYears($bracket['max'] + 1)->addDay()->toDateString();

            $query = Resident::query()
                ->where('is_active', true)
                ->whereNotNull('date_of_birth')
                ->whereDate('date_of_birth', '<=', $maxBirth)
                ->whereDate('date_of_birth', '>=', $minBirth);

            if ($barangayId) {
                $query->where('barangay_id', $barangayId);
            }

            return [
                'label' => $bracket['label'],
                'count' => (clone $query)->count(),
                'male' => (clone $query)->where('sex', 'male')->count(),
                'female' => (clone $query)->where('sex', 'female')->count(),
            ];
        }, $brackets);
    }

    /**
     * How many residents carry more than one vulnerability sector, and the most
     * common pairings. The sector counts overlap (they add up to more than the
     * number of residents), which is the point of compound classification.
     *
     * @return array{with_sector: int, multi: int, combos: array<int, array{label: string, count: int}>}
     */
    public function compoundVulnerability(?int $barangayId = null): array
    {
        $bySector = DB::table('resident_sectors as rs')
            ->join('residents as r', 'r.id', '=', 'rs.resident_id')
            ->join('vulnerability_sectors as s', 's.id', '=', 'rs.sector_id')
            ->where('r.is_active', true)
            ->when($barangayId, fn ($query) => $query->where('r.barangay_id', $barangayId))
            ->get(['rs.resident_id', 's.sector_name'])
            ->groupBy('resident_id');

        $pairs = [];

        foreach ($bySector as $rows) {
            $names = $rows->pluck('sector_name')->unique()->sort()->values()->all();

            for ($i = 0; $i < count($names); $i++) {
                for ($j = $i + 1; $j < count($names); $j++) {
                    $key = $names[$i].' + '.$names[$j];
                    $pairs[$key] = ($pairs[$key] ?? 0) + 1;
                }
            }
        }

        arsort($pairs);

        return [
            'with_sector' => $bySector->count(),
            'multi' => $bySector->filter(fn ($rows) => $rows->pluck('sector_name')->unique()->count() > 1)->count(),
            'combos' => collect($pairs)->take(3)->map(fn (int $count, string $label) => ['label' => $label, 'count' => $count])->values()->all(),
        ];
    }

    /**
     * Per-sector resident counts, one row per vulnerability sector.
     *
     * @return array<int, array{code: string, name: string, count: int}>
     */
    public function sectorCounts(?int $barangayId = null): array
    {
        return VulnerabilitySector::query()
            ->orderBy('id')
            ->get()
            ->map(function (VulnerabilitySector $sector) use ($barangayId) {
                $count = $sector->residents()
                    ->where('residents.is_active', true)
                    ->when($barangayId, fn ($q) => $q->where('residents.barangay_id', $barangayId))
                    ->count();

                return [
                    'code' => $sector->code,
                    'name' => $sector->sector_name,
                    'count' => $count,
                ];
            })
            ->all();
    }

    /**
     * Per-barangay headline counts for the city-wide (super admin / partner agency)
     * overview, including a sector breakdown for the heatmap's density coloring.
     *
     * @return array<int, array{id: int, name: string, residents: int, households: int, pending_duplicates: int, sector_counts: array<int, array{code: string, name: string, count: int}>}>
     */
    public function barangaySummaries(): array
    {
        return Barangay::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Barangay $barangay) => [
                'id' => $barangay->id,
                'name' => $barangay->name,
                'residents' => Resident::query()->where('is_active', true)->where('barangay_id', $barangay->id)->count(),
                'households' => Household::query()->where('barangay_id', $barangay->id)->count(),
                'pending_duplicates' => $this->pendingDuplicates($barangay->id),
                'sector_counts' => $this->sectorCounts($barangay->id),
            ])
            ->all();
    }

    public function pendingDuplicates(?int $barangayId = null): int
    {
        return $this->pendingDuplicateQuery($barangayId)->count();
    }

    /** When the longest-waiting pending alert was raised, or null if none is waiting. */
    public function oldestPendingDuplicate(?int $barangayId = null): ?string
    {
        $oldest = $this->pendingDuplicateQuery($barangayId)->min('created_at');

        return is_string($oldest) ? $oldest : null;
    }

    /**
     * @return Builder<DuplicateAlert>
     */
    private function pendingDuplicateQuery(?int $barangayId): Builder
    {
        return DuplicateAlert::query()
            ->where('status', 'pending')
            ->when($barangayId, function ($query) use ($barangayId) {
                // Either matched resident may belong to the barangay (a transfer's
                // origin record lives in the other barangay).
                $query->where(function ($outer) use ($barangayId) {
                    $outer->whereHas('residentOne', fn ($q) => $q->where('barangay_id', $barangayId))
                        ->orWhereHas('residentTwo', fn ($q) => $q->where('barangay_id', $barangayId));
                });
            });
    }
}
