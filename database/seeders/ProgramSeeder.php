<?php

namespace Database\Seeders;

use App\Models\PartnerAgency;
use App\Models\Program;
use App\Models\User;
use App\Models\VulnerabilitySector;
use Illuminate\Database\Seeder;

class ProgramSeeder extends Seeder
{
    public function run(): void
    {
        $dswd = PartnerAgency::where('agency_type', 'DSWD')->first();
        $peso = PartnerAgency::where('agency_type', 'PESO')->first();
        $cedo = PartnerAgency::where('agency_type', 'CEDO')->first();
        $agencyUser = User::where('email', 'agency@resitrack.test')->first();

        $sectors = VulnerabilitySector::pluck('id', 'code');

        $programs = [
            [
                'agency' => $dswd,
                'title' => 'AICS – Assistance to Individuals in Crisis Situations',
                'description' => 'Financial assistance for medical, burial, and other crisis situations.',
                'eligibility_criteria' => 'Indigent residents, priority to seniors, PWDs, and solo parents.',
                'slots_available' => 25,
                'sectors' => ['SENIOR', 'PWD', 'SOLO_PARENT'],
            ],
            [
                'agency' => $peso,
                'title' => 'TUPAD – Emergency Employment Program',
                'description' => 'Short-term wage employment for displaced and disadvantaged workers.',
                'eligibility_criteria' => 'Out-of-school youth and unemployed residents of working age.',
                'slots_available' => 30,
                'sectors' => ['OSY'],
            ],
            [
                'agency' => $cedo,
                'title' => 'Livelihood Skills Training & Starter Kits',
                'description' => 'Free skills training with starter kits for micro-livelihood.',
                'eligibility_criteria' => 'Solo parents and out-of-school youth interested in livelihood.',
                'slots_available' => 20,
                'sectors' => ['SOLO_PARENT', 'OSY'],
            ],
            [
                'agency' => $dswd,
                'title' => 'Social Pension for Indigent Senior Citizens',
                'description' => 'Monthly stipend for qualified indigent senior citizens.',
                'eligibility_criteria' => 'Senior citizens (60+) without regular income or pension.',
                'slots_available' => 40,
                'sectors' => ['SENIOR'],
            ],
        ];

        foreach ($programs as $data) {
            $program = Program::create([
                'agency_id' => $data['agency']?->id,
                'posted_by' => $agencyUser?->id,
                'title' => $data['title'],
                'description' => $data['description'],
                'eligibility_criteria' => $data['eligibility_criteria'],
                'slots_available' => $data['slots_available'],
                'slots_filled' => 0,
                'start_date' => now()->startOfMonth(),
                'end_date' => now()->addMonths(3),
                'status' => 'active',
            ]);

            $sectorIds = collect($data['sectors'])->map(fn ($code) => $sectors[$code] ?? null)->filter()->all();
            $program->sectors()->sync($sectorIds);
        }
    }
}
