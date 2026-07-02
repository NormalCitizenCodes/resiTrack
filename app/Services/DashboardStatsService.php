<?php

namespace App\Services;

use App\Models\DuplicateAlert;
use App\Models\Household;
use App\Models\Resident;
use App\Models\VulnerabilitySector;
use Illuminate\Support\Carbon;

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

        return [
            'total_residents' => (clone $residents)->count(),
            'total_households' => $households->count(),
            'pending_duplicates' => $this->pendingDuplicates($barangayId),
            'age_distribution' => $this->ageDistribution($barangayId),
            'sector_counts' => $this->sectorCounts($barangayId),
        ];
    }

    /**
     * Population split into the five age brackets used on the dashboard.
     *
     * @return array<int, array{label: string, count: int}>
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

            return ['label' => $bracket['label'], 'count' => $query->count()];
        }, $brackets);
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

    public function pendingDuplicates(?int $barangayId = null): int
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
            })
            ->count();
    }
}
