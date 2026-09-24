<?php

use App\Models\AppNotification;
use App\Models\Barangay;
use App\Models\Beneficiary;
use App\Models\PartnerAgency;
use App\Models\Program;
use App\Models\ProgramApplication;
use App\Models\Resident;
use App\Models\User;
use App\Models\VulnerabilitySector;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->barangay = Barangay::where('name', 'Barangay 22')->first();
    $this->agency = PartnerAgency::where('agency_type', 'DSWD')->first();
    $this->seniorSector = VulnerabilitySector::where('code', 'SENIOR')->first();

    $this->agencyUser = User::factory()->create([
        'role' => User::ROLE_PARTNER_AGENCY,
        'agency_id' => $this->agency->id,
    ]);
    $this->staff = User::factory()->create([
        'role' => User::ROLE_BHW,
        'barangay_id' => $this->barangay->id,
    ]);

    // A senior resident who qualifies for a SENIOR-targeted program.
    $this->senior = Resident::factory()->create([
        'barangay_id' => $this->barangay->id,
        'is_senior_citizen' => true,
    ]);
    $this->senior->sectors()->attach($this->seniorSector->id);
});

function seniorProgram(User $owner, PartnerAgency $agency, VulnerabilitySector $sector): Program
{
    $program = Program::create([
        'agency_id' => $agency->id,
        'posted_by' => $owner->id,
        'title' => 'Social Pension',
        'slots_available' => 2,
        'slots_filled' => 0,
        'status' => 'active',
    ]);
    $program->sectors()->attach($sector->id);

    return $program;
}

it('allows guests to browse active public programs and view details', function () {
    $program = seniorProgram($this->agencyUser, $this->agency, $this->seniorSector);

    $this->get('/programs')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('programs/index')
            ->where('programs.data.0.id', $program->id)
            ->where('viewerRole', null));

    $this->get("/programs/{$program->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('programs/show')
            ->where('program.id', $program->id)
            ->where('viewerRole', null));
});

it('requires authentication before a visitor can apply to a program', function () {
    $program = seniorProgram($this->agencyUser, $this->agency, $this->seniorSector);

    $this->post("/programs/{$program->id}/apply")
        ->assertRedirect('/login');
});

it('lets an agency publish a program targeting sectors', function () {
    $this->actingAs($this->agencyUser)->post('/programs', [
        'title' => 'AICS Assistance',
        'slots_available' => 10,
        'status' => 'active',
        'sector_ids' => [$this->seniorSector->id],
    ])->assertRedirect();

    $program = Program::where('title', 'AICS Assistance')->first();
    expect($program)->not->toBeNull()
        ->and($program->agency_id)->toBe($this->agency->id)
        ->and($program->sectors->pluck('code'))->toContain('SENIOR');
});

it('forbids barangay staff from creating programs', function () {
    $this->actingAs($this->staff)->get('/programs/create')->assertForbidden();
});

it('shows sector-eligible residents to barangay staff', function () {
    $program = seniorProgram($this->agencyUser, $this->agency, $this->seniorSector);

    $this->actingAs($this->staff)
        ->get("/programs/{$program->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('programs/show')
            ->where('eligibleResidents.0.id', $this->senior->id));
});

it('notifies the owning agency when a resident applies', function () {
    $program = seniorProgram($this->agencyUser, $this->agency, $this->seniorSector);
    $residentUser = User::factory()->create([
        'role' => User::ROLE_RESIDENT,
        'barangay_id' => $this->barangay->id,
        'resident_id' => $this->senior->id,
    ]);

    $this->actingAs($residentUser)
        ->post("/programs/{$program->id}/apply")
        ->assertSessionHas('success');

    expect(AppNotification::where('user_id', $this->agencyUser->id)->where('type', 'program_match')->count())->toBe(1);
});

it('lets barangay staff endorse an eligible resident', function () {
    $program = seniorProgram($this->agencyUser, $this->agency, $this->seniorSector);

    $this->actingAs($this->staff)
        ->post("/programs/{$program->id}/apply", ['resident_id' => $this->senior->id])
        ->assertRedirect();

    expect(ProgramApplication::where('program_id', $program->id)
        ->where('resident_id', $this->senior->id)
        ->where('status', 'pending')
        ->exists())->toBeTrue();
});

it('rejects endorsement of a resident outside the target sectors', function () {
    $program = seniorProgram($this->agencyUser, $this->agency, $this->seniorSector);
    $nonSenior = Resident::factory()->create(['barangay_id' => $this->barangay->id]);

    $this->actingAs($this->staff)
        ->post("/programs/{$program->id}/apply", ['resident_id' => $nonSenior->id])
        ->assertSessionHas('error');

    expect(ProgramApplication::count())->toBe(0);
});

it('approves an application into a beneficiary and fills a slot', function () {
    $program = seniorProgram($this->agencyUser, $this->agency, $this->seniorSector);
    $application = ProgramApplication::create([
        'program_id' => $program->id,
        'resident_id' => $this->senior->id,
        'status' => 'pending',
    ]);

    $this->actingAs($this->agencyUser)
        ->patch("/applications/{$application->id}", ['status' => 'approved'])
        ->assertRedirect();

    expect($application->fresh()->status)->toBe('approved')
        ->and(Beneficiary::where('program_id', $program->id)->count())->toBe(1)
        ->and($program->fresh()->slots_filled)->toBe(1);
});

it('prevents another agency from reviewing applications', function () {
    $program = seniorProgram($this->agencyUser, $this->agency, $this->seniorSector);
    $application = ProgramApplication::create([
        'program_id' => $program->id,
        'resident_id' => $this->senior->id,
        'status' => 'pending',
    ]);

    $otherAgencyUser = User::factory()->create([
        'role' => User::ROLE_PARTNER_AGENCY,
        'agency_id' => PartnerAgency::where('agency_type', 'PESO')->first()->id,
    ]);

    $this->actingAs($otherAgencyUser)
        ->patch("/applications/{$application->id}", ['status' => 'approved'])
        ->assertForbidden();
});

it('lets a resident apply for themselves and view their applications', function () {
    $program = seniorProgram($this->agencyUser, $this->agency, $this->seniorSector);

    $residentUser = User::factory()->create([
        'role' => User::ROLE_RESIDENT,
        'barangay_id' => $this->barangay->id,
        'resident_id' => $this->senior->id,
    ]);

    $this->actingAs($residentUser)
        ->post("/programs/{$program->id}/apply")
        ->assertRedirect();

    expect(ProgramApplication::where('resident_id', $this->senior->id)->count())->toBe(1);

    $this->actingAs($residentUser)
        ->get('/my-applications')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('programs/my-applications')->has('applications', 1));
});

// --- Barangay targeting ---

it('lets an agency publish a program restricted to one barangay', function () {
    $this->actingAs($this->agencyUser)->post('/programs', [
        'title' => 'Barangay 22 Flood Relief',
        'slots_available' => 5,
        'status' => 'active',
        'barangay_id' => $this->barangay->id,
    ])->assertRedirect();

    $program = Program::where('title', 'Barangay 22 Flood Relief')->first();
    expect($program->barangay_id)->toBe($this->barangay->id);
});

it('does not notify residents in another barangay about a barangay-targeted program', function () {
    $otherBarangay = Barangay::where('name', 'Barangay 23')->first();
    $outsider = Resident::factory()->create(['barangay_id' => $otherBarangay->id, 'is_senior_citizen' => true]);
    $outsider->sectors()->attach($this->seniorSector->id);
    User::factory()->create(['role' => User::ROLE_RESIDENT, 'resident_id' => $outsider->id]);

    $insiderUser = User::factory()->create(['role' => User::ROLE_RESIDENT, 'resident_id' => $this->senior->id]);

    $this->actingAs($this->agencyUser)->post('/programs', [
        'title' => 'Barangay 22 Senior Aid',
        'slots_available' => 5,
        'status' => 'active',
        'barangay_id' => $this->barangay->id,
        'sector_ids' => [$this->seniorSector->id],
    ])->assertRedirect();

    expect(AppNotification::where('user_id', $insiderUser->id)->where('type', 'program_match')->count())->toBe(1)
        ->and(AppNotification::where('type', 'program_match')->count())->toBe(1); // not the Barangay 23 senior
});

it('shows no eligible residents to staff outside a barangay-targeted program\'s barangay', function () {
    $otherBarangay = Barangay::where('name', 'Barangay 23')->first();
    $otherStaff = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $otherBarangay->id]);

    $program = seniorProgram($this->agencyUser, $this->agency, $this->seniorSector);
    $program->update(['barangay_id' => $this->barangay->id]);

    $this->actingAs($otherStaff)
        ->get("/programs/{$program->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('programs/show')->has('eligibleResidents', 0));
});

// --- Applications review queue ---

it('lets an agency review its applications from one consolidated queue', function () {
    $program = seniorProgram($this->agencyUser, $this->agency, $this->seniorSector);
    $application = ProgramApplication::create([
        'program_id' => $program->id,
        'resident_id' => $this->senior->id,
        'status' => 'pending',
    ]);

    $this->actingAs($this->agencyUser)
        ->get('/applications/review')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('programs/applications-review')
            ->has('applications.data', 1)
            ->where('applications.data.0.id', $application->id));
});

it('keeps a barangay-scoped agency accounts review queue to its own barangay', function () {
    $otherBarangay = Barangay::where('name', 'Barangay 23')->first();
    $scopedAgencyUser = User::factory()->create([
        'role' => User::ROLE_PARTNER_AGENCY,
        'agency_id' => $this->agency->id,
        'barangay_id' => $this->barangay->id,
    ]);

    $ownProgram = seniorProgram($this->agencyUser, $this->agency, $this->seniorSector);
    $ownProgram->update(['barangay_id' => $this->barangay->id]);
    $ownApplication = ProgramApplication::create([
        'program_id' => $ownProgram->id,
        'resident_id' => $this->senior->id,
        'status' => 'pending',
    ]);

    $otherResident = Resident::factory()->create(['barangay_id' => $otherBarangay->id]);
    $otherProgram = Program::create([
        'agency_id' => $this->agency->id,
        'barangay_id' => $otherBarangay->id,
        'posted_by' => $this->agencyUser->id,
        'title' => 'Barangay 23 Only Program',
        'slots_available' => 5,
        'slots_filled' => 0,
        'status' => 'active',
    ]);
    ProgramApplication::create([
        'program_id' => $otherProgram->id,
        'resident_id' => $otherResident->id,
        'status' => 'pending',
    ]);

    $this->actingAs($scopedAgencyUser)
        ->get('/applications/review')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('applications.data', 1)
            ->where('applications.data.0.id', $ownApplication->id));
});

it('stops a barangay-scoped agency account from reviewing another barangays application under the same agency', function () {
    $otherBarangay = Barangay::where('name', 'Barangay 23')->first();
    $scopedAgencyUser = User::factory()->create([
        'role' => User::ROLE_PARTNER_AGENCY,
        'agency_id' => $this->agency->id,
        'barangay_id' => $this->barangay->id,
    ]);

    $otherResident = Resident::factory()->create(['barangay_id' => $otherBarangay->id]);
    $otherProgram = Program::create([
        'agency_id' => $this->agency->id,
        'barangay_id' => $otherBarangay->id,
        'posted_by' => $this->agencyUser->id,
        'title' => 'Barangay 23 Only Program',
        'slots_available' => 5,
        'slots_filled' => 0,
        'status' => 'active',
    ]);
    $otherApplication = ProgramApplication::create([
        'program_id' => $otherProgram->id,
        'resident_id' => $otherResident->id,
        'status' => 'pending',
    ]);

    $this->actingAs($scopedAgencyUser)
        ->patch("/applications/{$otherApplication->id}", ['status' => 'approved'])
        ->assertForbidden();

    expect($otherApplication->fresh()->status)->toBe('pending');
});

it('does not let a resident apply to a program targeted at a different barangay', function () {
    $otherBarangay = Barangay::where('name', 'Barangay 23')->first();
    $program = seniorProgram($this->agencyUser, $this->agency, $this->seniorSector);
    $program->update(['barangay_id' => $otherBarangay->id]);

    $residentUser = User::factory()->create([
        'role' => User::ROLE_RESIDENT,
        'barangay_id' => $this->barangay->id,
        'resident_id' => $this->senior->id,
    ]);

    $this->actingAs($residentUser)
        ->post("/programs/{$program->id}/apply")
        ->assertSessionHas('error');

    expect(ProgramApplication::count())->toBe(0);
});
