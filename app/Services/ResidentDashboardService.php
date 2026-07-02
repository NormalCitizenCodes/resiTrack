<?php

namespace App\Services;

use App\Models\Resident;

/**
 * Aggregates the data shown on a resident's own dashboard: how complete their
 * profile is (the mechanism behind "update your info to unlock benefits") and
 * which sectors they're classified under and why. Feed items and application
 * history are plain single-table queries left in the controller.
 */
class ResidentDashboardService
{
    public function __construct(private readonly SectorClassificationService $classifier) {}

    /**
     * Fields a resident can self-service (see MyProfileController) that also
     * feed eligibility — filling these in is what the completeness nudge is
     * pushing toward, not just cosmetic profile fill-out.
     */
    private const COMPLETENESS_FIELDS = [
        'contact_number' => 'Contact number',
        'email' => 'Email address',
        'address' => 'Address',
        'civil_status' => 'Civil status',
        'occupation' => 'Occupation',
        'employment_status' => 'Employment status',
        'education_level' => 'Highest education level',
        'education_status' => 'School enrollment status',
        'monthly_income' => 'Monthly income',
    ];

    /**
     * @return array<string, mixed>
     */
    public function forResident(Resident $resident): array
    {
        return [
            'completeness' => $this->completeness($resident),
            'sectors' => $this->sectorsWithReasons($resident),
        ];
    }

    /**
     * @return array{percent: int, missing: array<int, array{field: string, label: string}>}
     */
    private function completeness(Resident $resident): array
    {
        $missing = [];

        foreach (self::COMPLETENESS_FIELDS as $field => $label) {
            if (blank($resident->{$field})) {
                $missing[] = ['field' => $field, 'label' => $label];
            }
        }

        $total = count(self::COMPLETENESS_FIELDS);
        $filled = $total - count($missing);

        return [
            'percent' => $total > 0 ? (int) round(($filled / $total) * 100) : 100,
            'missing' => $missing,
        ];
    }

    /**
     * @return array<int, array{code: string, sector_name: string, reasons: array<int, string>}>
     */
    private function sectorsWithReasons(Resident $resident): array
    {
        $reasons = $this->classifier->explain($resident);

        return $resident->sectors
            ->map(fn ($sector) => [
                'code' => $sector->code,
                'sector_name' => $sector->sector_name,
                'reasons' => $reasons[$sector->code] ?? [],
            ])
            ->all();
    }
}
