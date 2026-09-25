<?php

namespace Database\Seeders;

use App\Models\Beneficiary;
use App\Models\Concern;
use App\Models\DocumentRequest;
use App\Models\Program;
use App\Models\ProgramApplication;
use App\Models\Resident;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Sample data for the resident services (claim schedules, certificate
 * requests, reports), so the demo resident's dashboard and the Barangay 22
 * service desks are not empty on first login. Runs after SampleResidentSeeder,
 * which creates the demo resident.
 *
 * Hotlines are deliberately not seeded: a made-up number in an emergency list
 * is worse than none. Only the national 911 and 143 are built in.
 */
class ResidentServicesSeeder extends Seeder
{
    public function run(): void
    {
        $account = User::where('email', 'resident@resitrack.test')->first();
        $juan = $account?->resident_id ? Resident::find($account->resident_id) : null;
        $agencyUser = User::where('email', 'agency@resitrack.test')->first();
        $aics = Program::where('title', 'like', 'AICS%')->first();

        if ($juan === null || $account === null) {
            return;
        }

        if ($aics !== null) {
            $application = ProgramApplication::firstOrCreate(
                ['program_id' => $aics->id, 'resident_id' => $juan->id],
                ['status' => 'approved', 'applied_at' => now()->subDays(12)],
            );
            $application->update(['status' => 'approved']);

            if (! Beneficiary::where('program_id', $aics->id)->where('resident_id', $juan->id)->exists()) {
                Beneficiary::create([
                    'program_id' => $aics->id,
                    'resident_id' => $juan->id,
                    'application_id' => $application->id,
                    'status' => 'active',
                    'added_by' => $agencyUser?->id,
                    'date_added' => now()->subDays(10),
                ]);
                $aics->increment('slots_filled');
            }

            $aics->schedules()->create([
                'title' => 'Payout',
                'starts_at' => now()->addDays(3)->setTime(8, 0),
                'location' => 'Barangay 22 Covered Court',
                'what_to_bring' => 'Valid ID and your resiTrack ID card',
                'notes' => 'Seniors and PWDs are served first. Please come on time.',
                'created_by' => $agencyUser?->id,
            ]);
            $aics->schedules()->create([
                'title' => 'Second payout',
                'starts_at' => now()->addDays(33)->setTime(8, 0),
                'location' => 'Barangay 22 Covered Court',
                'what_to_bring' => 'Valid ID',
                'created_by' => $agencyUser?->id,
            ]);
        }

        $this->document($juan, $account, 'indigency', 'Hospital bill', DocumentRequest::STATUS_READY, daysAgo: 2);
        $this->document($juan, $account, 'residency', 'Scholarship application for my daughter', DocumentRequest::STATUS_PENDING, daysAgo: 0);

        $neighbours = Resident::where('barangay_id', $juan->barangay_id)->whereKeyNot($juan->id)->orderBy('id')->limit(3)->get();

        foreach ($neighbours as $i => $neighbour) {
            $this->document($neighbour, null, ['clearance', 'residency', 'indigency'][$i], ['Job application', 'Bank account opening', 'Burial assistance'][$i], DocumentRequest::STATUS_PENDING, daysAgo: $i + 1);
        }

        $this->concern($juan, $account, 'streetlight', 'The streetlight at the corner of Purok 3 has been out for a week. It is very dark at night.', 'Purok 3, corner by the chapel', 'in_progress', 'Reported to the power company. A lineman is scheduled to come this week.');

        if ($neighbours->isNotEmpty()) {
            $this->concern($neighbours[0], null, 'garbage', 'Garbage has not been collected on our street since last Monday.', 'Purok 1', 'open', null);
        }

        if ($neighbours->count() > 1) {
            $this->concern($neighbours[1], null, 'drainage', 'The canal beside the basketball court overflows whenever it rains.', 'Near the basketball court', 'open', null);
        }
    }

    private function document(Resident $resident, ?User $account, string $type, string $purpose, string $status, int $daysAgo): void
    {
        $request = DocumentRequest::create([
            'resident_id' => $resident->id,
            'barangay_id' => $resident->barangay_id,
            'requested_by' => $account?->id,
            'type' => $type,
            'purpose' => $purpose,
            'status' => $status,
            'ready_at' => $status === DocumentRequest::STATUS_READY ? now()->subDay() : null,
        ]);
        $request->forceFill(['created_at' => now()->subDays($daysAgo)])->save();
        $request->assignReferenceNo();
    }

    private function concern(Resident $resident, ?User $account, string $category, string $description, ?string $location, string $status, ?string $response): void
    {
        $concern = Concern::create([
            'resident_id' => $resident->id,
            'barangay_id' => $resident->barangay_id,
            'reported_by' => $account?->id,
            'category' => $category,
            'description' => $description,
            'location' => $location,
            'status' => $status,
            'response' => $response,
        ]);
        $concern->assignReferenceNo();
    }
}
