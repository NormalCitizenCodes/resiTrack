<?php

namespace App\Services;

use App\Models\Program;
use App\Models\Resident;
use Illuminate\Database\Eloquent\Collection;

/**
 * Connects residents to government services by matching them to the vulnerability
 * sectors a program targets. This is the bridge between Module 1's compound
 * vulnerability classification and Module 2's program delivery.
 */
class ProgramEligibilityService
{
    /**
     * Residents who qualify for a program: active, in the given barangay, and
     * belonging to at least one targeted sector (a program with no target sectors
     * is open to all residents). Residents who already applied are excluded.
     *
     * Returns empty if the program targets a different barangay than the one
     * asked for - a Barangay-22-only relief program has no eligible residents
     * from Barangay 24's point of view, full stop.
     *
     * @return Collection<int, Resident>
     */
    public function eligibleResidents(Program $program, int $barangayId): Collection
    {
        if ($program->barangay_id !== null && $program->barangay_id !== $barangayId) {
            return new Collection;
        }

        $sectorIds = $program->sectors->pluck('id');

        return Resident::query()
            ->where('barangay_id', $barangayId)
            ->where('is_active', true)
            ->when($sectorIds->isNotEmpty(), function ($query) use ($sectorIds) {
                $query->whereHas('sectors', fn ($s) => $s->whereIn('vulnerability_sectors.id', $sectorIds));
            })
            ->whereDoesntHave('programApplications', fn ($a) => $a->where('program_id', $program->id))
            ->with('sectors:id,code,sector_name')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();
    }

    /**
     * How many active residents a program aimed at these sectors (any one of them; none means
     * everyone) and this barangay (null means the whole city) would reach. Used to size a program
     * before it is published.
     *
     * @param  array<int, int>  $sectorIds
     * @return array{eligible: int, total: int}
     */
    public function preview(array $sectorIds, ?int $barangayId): array
    {
        $residents = fn () => Resident::query()
            ->where('is_active', true)
            ->when($barangayId !== null, fn ($q) => $q->where('barangay_id', $barangayId));

        return [
            'eligible' => $residents()
                ->when($sectorIds !== [], fn ($q) => $q->whereHas('sectors', fn ($s) => $s->whereIn('vulnerability_sectors.id', $sectorIds)))
                ->count(),
            'total' => $residents()->count(),
        ];
    }

    /**
     * Whether a single resident qualifies for a program based on barangay match
     * (if the program is barangay-targeted) and sector overlap.
     */
    public function residentQualifies(Program $program, Resident $resident): bool
    {
        if ($program->barangay_id !== null && $program->barangay_id !== $resident->barangay_id) {
            return false;
        }

        $targetSectorIds = $program->sectors->pluck('id');

        if ($targetSectorIds->isEmpty()) {
            return true; // open to all
        }

        return $resident->sectors->pluck('id')->intersect($targetSectorIds)->isNotEmpty();
    }
}
