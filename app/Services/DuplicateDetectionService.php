<?php

namespace App\Services;

use App\Models\DuplicateAlert;
use App\Models\Resident;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Detects duplicate resident records and cross-barangay transfers.
 *
 * Matching runs across ALL barangays so a resident already registered elsewhere
 * (or who has transferred) is surfaced rather than silently duplicated. Matches
 * are ranked by a similarity score and recorded as duplicate_alerts for staff
 * to review and resolve.
 */
class DuplicateDetectionService
{
    /**
     * Scan for potential duplicates/transfers of the given resident and record alerts.
     *
     * @return int number of new alerts created
     */
    public function scan(Resident $resident): int
    {
        $candidates = $this->findCandidates($resident);
        $created = 0;

        foreach ($candidates as $match) {
            /** @var Resident $other */
            $other = $match['resident'];
            $basis = $match['basis'];
            $score = $match['score'];

            // Cross-barangay match is treated as a potential transfer, not a duplicate.
            if ($other->barangay_id !== $resident->barangay_id) {
                $basis = 'cross_barangay_transfer';
            }

            if ($this->recordAlert($resident, $other, $basis, $score)) {
                $created++;
            }
        }

        if ($created > 0) {
            $resident->is_duplicate_flagged = true;
            $resident->saveQuietly();
        }

        return $created;
    }

    /**
     * @return array<int, array{resident: Resident, basis: string, score: float}>
     */
    private function findCandidates(Resident $resident): array
    {
        $matches = [];

        $base = Resident::query()->where('id', '!=', $resident->id);

        // 1. Strongest signal: identical PhilSys card number.
        if ($resident->philsys_card_no) {
            (clone $base)
                ->where('philsys_card_no', $resident->philsys_card_no)
                ->get()
                ->each(function (Resident $other) use (&$matches) {
                    $matches[$other->id] = ['resident' => $other, 'basis' => 'philsys', 'score' => 1.0];
                });
        }

        // 2. Same first + last name and date of birth.
        if ($resident->date_of_birth) {
            (clone $base)
                ->whereRaw('LOWER(first_name) = ?', [strtolower($resident->first_name)])
                ->whereRaw('LOWER(last_name) = ?', [strtolower($resident->last_name)])
                ->whereDate('date_of_birth', $resident->date_of_birth)
                ->get()
                ->each(function (Resident $other) use (&$matches) {
                    if (! isset($matches[$other->id])) {
                        $matches[$other->id] = ['resident' => $other, 'basis' => 'name_dob', 'score' => 0.9];
                    }
                });
        }

        // 3. Same first + last name and same address / household.
        if ($resident->address || $resident->household_id) {
            (clone $base)
                ->whereRaw('LOWER(first_name) = ?', [strtolower($resident->first_name)])
                ->whereRaw('LOWER(last_name) = ?', [strtolower($resident->last_name)])
                ->where(function ($q) use ($resident) {
                    if ($resident->household_id) {
                        $q->where('household_id', $resident->household_id);
                    }
                    if ($resident->address) {
                        $q->orWhereRaw('LOWER(address) = ?', [strtolower($resident->address)]);
                    }
                })
                ->get()
                ->each(function (Resident $other) use (&$matches) {
                    if (! isset($matches[$other->id])) {
                        $matches[$other->id] = ['resident' => $other, 'basis' => 'name_address', 'score' => 0.7];
                    }
                });
        }

        return array_values($matches);
    }

    /**
     * Record an alert (idempotent on the unordered resident pair).
     */
    private function recordAlert(Resident $a, Resident $b, string $basis, float $score): bool
    {
        // Order the pair so the unique (id_1,id_2) constraint dedupes symmetric matches.
        $low = min($a->id, $b->id);
        $high = max($a->id, $b->id);

        $exists = DuplicateAlert::query()
            ->where('resident_id_1', $low)
            ->where('resident_id_2', $high)
            ->exists();

        if ($exists) {
            return false;
        }

        DuplicateAlert::create([
            'resident_id_1' => $low,
            'resident_id_2' => $high,
            'similarity_score' => $score,
            'match_basis' => $basis,
            'status' => 'pending',
            'detected_at' => Carbon::now(),
        ]);

        return true;
    }
}
