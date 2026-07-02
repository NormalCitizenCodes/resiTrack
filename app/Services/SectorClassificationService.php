<?php

namespace App\Services;

use App\Models\Resident;
use App\Models\SectorCriteria;
use App\Models\VulnerabilitySector;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Rule-based compound-vulnerability classification.
 *
 * Each vulnerability sector owns a set of criteria (sector_criteria). A resident
 * belongs to a sector when ALL of that sector's criteria evaluate to true against
 * the resident's attributes. A resident may belong to several sectors at once
 * (compound vulnerability), which is the core analytical contribution of resiTrack.
 */
class SectorClassificationService
{
    /**
     * Map of sector code => resident boolean flag kept in sync with membership.
     */
    private const FLAG_MAP = [
        'SENIOR' => 'is_senior_citizen',
        'PWD' => 'is_pwd',
        'OSY' => 'is_osy',
        'SOLO_PARENT' => 'is_solo_parent',
        'PREGNANT' => 'is_pregnant',
    ];

    /**
     * Human-readable labels for criteria fields, used by explain().
     */
    private const FIELD_LABELS = [
        'is_pwd' => 'PWD status',
        'is_solo_parent' => 'Solo parent status',
        'is_pregnant' => 'Pregnancy status',
        'education_status' => 'School enrollment status',
        'employment_status' => 'Employment status',
    ];

    /**
     * Classify a resident, sync the resident_sectors pivot and boolean flags.
     *
     * @return array<int, string> the sector codes the resident now belongs to
     */
    public function classify(Resident $resident): array
    {
        $sectors = VulnerabilitySector::with('criteria')->get();

        $matchedSectorIds = [];
        $matchedCodes = [];

        foreach ($sectors as $sector) {
            if ($this->residentMatchesSector($resident, $sector->criteria)) {
                $matchedSectorIds[] = $sector->id;
                $matchedCodes[] = $sector->code;
            }
        }

        // Sync the pivot table with assignment timestamps.
        $now = Carbon::now();
        $resident->sectors()->sync(
            collect($matchedSectorIds)
                ->mapWithKeys(fn (int $id) => [$id => ['assigned_at' => $now]])
                ->all()
        );

        // Keep the denormalised boolean flags aligned with sector membership.
        foreach (self::FLAG_MAP as $code => $flag) {
            $resident->{$flag} = in_array($code, $matchedCodes, true);
        }
        $resident->saveQuietly();

        return $matchedCodes;
    }

    /**
     * Plain-English reasons for each sector a resident currently belongs to —
     * surfaced on the resident's own dashboard so classification isn't an
     * invisible backend rule. Only covers sectors the resident is already in
     * (mirrors the pivot populated by classify()), not a re-evaluation.
     *
     * @return array<string, array<int, string>> sector code => reason strings
     */
    public function explain(Resident $resident): array
    {
        $sectors = VulnerabilitySector::with('criteria')->get()->keyBy('code');
        $reasons = [];

        foreach ($resident->sectors as $membership) {
            $criteria = $sectors->get($membership->code)?->criteria ?? collect();
            $reasons[$membership->code] = $criteria
                ->map(fn (SectorCriteria $criterion) => $this->describe($resident, $criterion))
                ->filter()
                ->values()
                ->all();
        }

        return $reasons;
    }

    private function describe(Resident $resident, SectorCriteria $criterion): ?string
    {
        $field = $criterion->criteria_field;
        $value = $criterion->criteria_value;
        $label = self::FIELD_LABELS[$field] ?? str_replace('_', ' ', $field);

        return match ($criterion->criteria_operator) {
            'age_gte' => "Age {$this->age($resident)} (must be {$value} or older)",
            'age_lte' => "Age {$this->age($resident)} (must be {$value} or younger)",
            'is_true' => ucfirst($label).' is marked yes',
            'is_false' => ucfirst($label).' is marked no',
            'equals', 'in' => ucfirst($label)." is \"{$resident->{$field}}\"",
            'not_equals' => ucfirst($label)." is not \"{$value}\"",
            default => null,
        };
    }

    /**
     * A resident matches a sector when every criterion for that sector passes.
     *
     * @param  Collection<int, SectorCriteria>  $criteria
     */
    private function residentMatchesSector(Resident $resident, Collection $criteria): bool
    {
        if ($criteria->isEmpty()) {
            return false;
        }

        foreach ($criteria as $criterion) {
            if (! $this->evaluate($resident, $criterion)) {
                return false;
            }
        }

        return true;
    }

    private function evaluate(Resident $resident, SectorCriteria $criterion): bool
    {
        $field = $criterion->criteria_field;
        $operator = $criterion->criteria_operator;
        $value = $criterion->criteria_value;

        return match ($operator) {
            'age_gte' => $this->age($resident) !== null && $this->age($resident) >= (int) $value,
            'age_lte' => $this->age($resident) !== null && $this->age($resident) <= (int) $value,
            'is_true' => (bool) $resident->{$field} === true,
            'is_false' => (bool) $resident->{$field} === false,
            'equals' => $this->normalise($resident->{$field}) === $this->normalise($value),
            'not_equals' => $this->normalise($resident->{$field}) !== $this->normalise($value),
            'in' => in_array($this->normalise($resident->{$field}), array_map(
                fn ($v) => $this->normalise($v),
                explode('|', $value)
            ), true),
            default => false,
        };
    }

    private function age(Resident $resident): ?int
    {
        return $resident->date_of_birth?->age;
    }

    private function normalise(mixed $value): string
    {
        return strtolower(trim((string) $value));
    }
}
