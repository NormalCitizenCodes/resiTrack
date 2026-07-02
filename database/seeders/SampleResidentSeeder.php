<?php

namespace Database\Seeders;

use App\Models\Barangay;
use App\Models\BarangayZone;
use App\Models\Household;
use App\Models\Resident;
use App\Services\DuplicateDetectionService;
use App\Services\SectorClassificationService;
use Illuminate\Database\Seeder;

class SampleResidentSeeder extends Seeder
{
    public function __construct(
        private readonly SectorClassificationService $classifier,
        private readonly DuplicateDetectionService $duplicates,
    ) {}

    public function run(): void
    {
        $b22 = Barangay::where('name', 'Barangay 22')->first();
        $b23 = Barangay::where('name', 'Barangay 23')->first();
        $zones = BarangayZone::where('barangay_id', $b22->id)->pluck('id')->all();

        // A pool of households for the pilot barangay.
        $households = Household::factory(12)
            ->create(['barangay_id' => $b22->id])
            ->each(fn (Household $h) => $h->update(['zone_id' => fake()->randomElement($zones)]));

        $pick = fn () => $households->random()->id;

        // Baseline residents (no special vulnerability).
        Resident::factory(20)->create([
            'barangay_id' => $b22->id,
            'household_id' => $pick(),
        ]);

        // Single-sector residents.
        Resident::factory(8)->senior()->create(['barangay_id' => $b22->id, 'household_id' => $pick()]);
        Resident::factory(5)->pwd()->create(['barangay_id' => $b22->id, 'household_id' => $pick()]);
        Resident::factory(5)->osy()->create(['barangay_id' => $b22->id, 'household_id' => $pick()]);
        Resident::factory(4)->soloParent()->create(['barangay_id' => $b22->id, 'household_id' => $pick()]);
        Resident::factory(3)->pregnant()->create(['barangay_id' => $b22->id, 'household_id' => $pick()]);

        // Compound-vulnerability residents (the analytical highlight).
        Resident::factory(2)->senior()->pwd()->create(['barangay_id' => $b22->id, 'household_id' => $pick()]);
        Resident::factory(2)->soloParent()->pwd()->create(['barangay_id' => $b22->id, 'household_id' => $pick()]);
        Resident::factory(1)->pregnant()->soloParent()->create(['barangay_id' => $b22->id, 'household_id' => $pick()]);

        // A deliberate in-barangay duplicate (same identity registered twice).
        $original = Resident::factory()->create([
            'barangay_id' => $b22->id,
            'household_id' => $pick(),
            'first_name' => 'Ricardo',
            'last_name' => 'Villanueva',
            'date_of_birth' => '1958-04-12',
            'philsys_card_no' => '1234-5678-9012',
        ]);
        Resident::factory()->create([
            'barangay_id' => $b22->id,
            'household_id' => $pick(),
            'first_name' => 'Ricardo',
            'last_name' => 'Villanueva',
            'date_of_birth' => '1958-04-12',
            'philsys_card_no' => '1234-5678-9012',
        ]);

        // A deliberate cross-barangay transfer case (same person now in Barangay 23).
        Resident::factory()->create([
            'barangay_id' => $b23->id,
            'first_name' => 'Lorna',
            'last_name' => 'Mabini',
            'date_of_birth' => '1990-09-30',
            'philsys_card_no' => '9876-5432-1098',
        ]);
        Resident::factory()->create([
            'barangay_id' => $b22->id,
            'household_id' => $pick(),
            'first_name' => 'Lorna',
            'last_name' => 'Mabini',
            'date_of_birth' => '1990-09-30',
            'philsys_card_no' => '9876-5432-1098',
        ]);

        // Link the demo resident login to a real resident record so the resident
        // portal (view/apply for programs) is functional out of the box.
        $residentUser = \App\Models\User::where('email', 'resident@resitrack.test')->first();
        if ($residentUser) {
            $juan = Resident::factory()->senior()->soloParent()->create([
                'barangay_id' => $b22->id,
                'household_id' => $pick(),
                'first_name' => 'Juan',
                'last_name' => 'Dela Cruz',
                'email' => $residentUser->email,
            ]);
            $residentUser->update(['resident_id' => $juan->id]);
        }

        // Run classification + duplicate detection over every resident.
        Resident::query()->orderBy('id')->get()->each(function (Resident $resident) {
            $this->classifier->classify($resident);
            $this->duplicates->scan($resident);
        });
    }
}
