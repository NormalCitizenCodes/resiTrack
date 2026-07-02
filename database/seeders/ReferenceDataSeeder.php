<?php

namespace Database\Seeders;

use App\Models\Barangay;
use App\Models\PartnerAgency;
use App\Models\VulnerabilitySector;
use App\Models\WellbeingLevel;
use Illuminate\Database\Seeder;

class ReferenceDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedBarangays();
        $this->seedSectors();
        $this->seedWellbeingLevels();
        $this->seedAgencies();
    }

    private function seedBarangays(): void
    {
        // Barangay 22 is the pilot site; neighbours make cross-barangay
        // transfer/duplicate detection meaningful.
        foreach (['Barangay 22', 'Barangay 21', 'Barangay 23', 'Barangay 24'] as $name) {
            Barangay::firstOrCreate(
                ['name' => $name],
                [
                    'city_municipality' => 'Cagayan de Oro City',
                    'province' => 'Misamis Oriental',
                    'region' => 'Region X (Northern Mindanao)',
                ]
            );
        }

        // A few illustrative zones/puroks for the pilot barangay.
        $b22 = Barangay::where('name', 'Barangay 22')->first();
        foreach (['Purok 1', 'Purok 2', 'Purok 3', 'Purok 4'] as $zone) {
            $b22->zones()->firstOrCreate(['zone_name' => $zone]);
        }
    }

    private function seedSectors(): void
    {
        $sectors = [
            [
                'code' => 'SENIOR',
                'sector_name' => 'Senior Citizen',
                'description' => 'Residents aged 60 years and above (RA 9994).',
                'criteria' => [
                    ['criteria_field' => 'date_of_birth', 'criteria_operator' => 'age_gte', 'criteria_value' => '60'],
                ],
            ],
            [
                'code' => 'PWD',
                'sector_name' => 'Person with Disability',
                'description' => 'Residents with a certified disability (RA 7277).',
                'criteria' => [
                    ['criteria_field' => 'is_pwd', 'criteria_operator' => 'is_true', 'criteria_value' => '1'],
                ],
            ],
            [
                'code' => 'OSY',
                'sector_name' => 'Out-of-School Youth',
                'description' => 'Youth aged 15-24 who are not currently enrolled in school.',
                'criteria' => [
                    ['criteria_field' => 'date_of_birth', 'criteria_operator' => 'age_gte', 'criteria_value' => '15'],
                    ['criteria_field' => 'date_of_birth', 'criteria_operator' => 'age_lte', 'criteria_value' => '24'],
                    ['criteria_field' => 'education_status', 'criteria_operator' => 'equals', 'criteria_value' => 'not_enrolled'],
                ],
            ],
            [
                'code' => 'SOLO_PARENT',
                'sector_name' => 'Solo Parent',
                'description' => 'Certified solo parents (RA 8972 / RA 11861).',
                'criteria' => [
                    ['criteria_field' => 'is_solo_parent', 'criteria_operator' => 'is_true', 'criteria_value' => '1'],
                ],
            ],
            [
                'code' => 'PREGNANT',
                'sector_name' => 'Pregnant',
                'description' => 'Residents who are currently pregnant.',
                'criteria' => [
                    ['criteria_field' => 'is_pregnant', 'criteria_operator' => 'is_true', 'criteria_value' => '1'],
                ],
            ],
        ];

        foreach ($sectors as $data) {
            $sector = VulnerabilitySector::updateOrCreate(
                ['code' => $data['code']],
                ['sector_name' => $data['sector_name'], 'description' => $data['description']]
            );

            // Reset & recreate criteria so seeding is idempotent.
            $sector->criteria()->delete();
            foreach ($data['criteria'] as $criterion) {
                $sector->criteria()->create($criterion);
            }
        }
    }

    private function seedWellbeingLevels(): void
    {
        $levels = [
            ['level_code' => 'level_1_survival', 'label' => 'Level 1 – Survival', 'description' => 'Household is struggling to meet basic daily needs.'],
            ['level_code' => 'level_2_subsistence', 'label' => 'Level 2 – Subsistence', 'description' => 'Household meets basic needs but has little to no surplus.'],
            ['level_code' => 'level_3_self_sufficient', 'label' => 'Level 3 – Self-Sufficient', 'description' => 'Household is financially stable and self-sufficient.'],
        ];

        foreach ($levels as $level) {
            WellbeingLevel::updateOrCreate(['level_code' => $level['level_code']], $level);
        }
    }

    private function seedAgencies(): void
    {
        $agencies = [
            ['agency_name' => 'Department of Social Welfare and Development', 'agency_type' => 'DSWD', 'email' => 'dswd@example.gov.ph'],
            ['agency_name' => 'Public Employment Service Office', 'agency_type' => 'PESO', 'email' => 'peso@example.gov.ph'],
            ['agency_name' => 'City Economic Development Office', 'agency_type' => 'CEDO', 'email' => 'cedo@example.gov.ph'],
        ];

        foreach ($agencies as $agency) {
            PartnerAgency::updateOrCreate(
                ['agency_type' => $agency['agency_type']],
                [...$agency, 'is_active' => true, 'registered_at' => now()]
            );
        }
    }
}
