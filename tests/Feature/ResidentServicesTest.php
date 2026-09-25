<?php

use App\Models\AppNotification;
use App\Models\Barangay;
use App\Models\Beneficiary;
use App\Models\Concern;
use App\Models\DocumentRequest;
use App\Models\Hotline;
use App\Models\Household;
use App\Models\PartnerAgency;
use App\Models\Program;
use App\Models\ProgramApplication;
use App\Models\ProgramSchedule;
use App\Models\Resident;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->own = Barangay::where('name', 'Barangay 22')->first();
    $this->other = Barangay::where('name', 'Barangay 23')->first();

    $this->resident = Resident::factory()->create(['barangay_id' => $this->own->id]);
    $this->resident->assignOfficialId();
    $this->account = User::factory()->create([
        'role' => User::ROLE_RESIDENT,
        'barangay_id' => $this->own->id,
        'resident_id' => $this->resident->id,
    ]);

    $this->admin = User::factory()->create(['role' => User::ROLE_BARANGAY_ADMIN, 'barangay_id' => $this->own->id]);
    $this->bhw = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->own->id]);
    $this->otherAdmin = User::factory()->create(['role' => User::ROLE_BARANGAY_ADMIN, 'barangay_id' => $this->other->id]);
    $this->superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN, 'barangay_id' => null]);
});

function servicesProgram(array $overrides = []): Program
{
    $agency = PartnerAgency::where('agency_type', 'DSWD')->first();

    return Program::create(array_merge([
        'agency_id' => $agency->id,
        'title' => 'Social Pension',
        'slots_available' => 10,
        'status' => 'active',
    ], $overrides));
}

function agencyUser(?int $agencyId = null): User
{
    return User::factory()->create([
        'role' => User::ROLE_PARTNER_AGENCY,
        'agency_id' => $agencyId ?? PartnerAgency::where('agency_type', 'DSWD')->first()->id,
        'barangay_id' => null,
    ]);
}

// --- Digital ID ------------------------------------------------------------

it('shows a resident their ID card with a QR code that signs their resident id', function () {
    $this->actingAs($this->account)->get('/my-id')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('my-id')
            ->where('card.resident_id', $this->resident->fresh()->resident_id)
            ->where('card.qr_svg', fn ($svg) => str_starts_with($svg, '<svg')));
});

it('gives an unlinked resident account no card', function () {
    $unlinked = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->own->id, 'resident_id' => null]);

    $this->actingAs($unlinked)->get('/my-id')->assertInertia(fn ($page) => $page->where('card', null));
});

it('verifies a genuine code and rejects a forged one', function () {
    $id = $this->resident->fresh()->resident_id;

    $this->actingAs($this->bhw)->get("/verify/{$id}?s=".Resident::idSignature($id))
        ->assertInertia(fn ($page) => $page
            ->component('residents/verify')
            ->where('result.resident_id', $id)
            ->where('result.can_open_record', true));

    $this->actingAs($this->bhw)->get("/verify/{$id}?s=0000000000000000")
        ->assertInertia(fn ($page) => $page->where('result', null));

    $this->actingAs($this->bhw)->get("/verify/{$id}")
        ->assertInertia(fn ($page) => $page->where('result', null));
});

it('lets staff from another barangay verify but not open the record', function () {
    $id = $this->resident->fresh()->resident_id;

    $this->actingAs($this->otherAdmin)->get("/verify/{$id}?s=".Resident::idSignature($id))
        ->assertInertia(fn ($page) => $page
            ->where('result.resident_id', $id)
            ->where('result.can_open_record', false));
});

it('keeps residents and guests away from the verify page', function () {
    $id = $this->resident->fresh()->resident_id;
    $url = "/verify/{$id}?s=".Resident::idSignature($id);

    $this->get($url)->assertRedirect('/login');
    $this->actingAs($this->account)->get($url)->assertForbidden();
});

it('shows an agency which of its own programs the person is a beneficiary of', function () {
    $mine = servicesProgram(['title' => 'Mine']);
    $theirs = servicesProgram(['title' => 'Theirs', 'agency_id' => PartnerAgency::where('agency_type', 'PESO')->value('id')]);
    foreach ([$mine, $theirs] as $program) {
        Beneficiary::create(['program_id' => $program->id, 'resident_id' => $this->resident->id, 'status' => 'active']);
    }
    $id = $this->resident->fresh()->resident_id;

    $this->actingAs(agencyUser())->get("/verify/{$id}?s=".Resident::idSignature($id))
        ->assertInertia(fn ($page) => $page
            ->where('result.can_open_record', false)
            ->where('result.agency_programs', [['id' => $mine->id, 'title' => 'Mine']]));
});

// --- Claim schedules -------------------------------------------------------

it('lets the owning agency post a schedule and notifies only active beneficiaries', function () {
    $program = servicesProgram();
    Beneficiary::create(['program_id' => $program->id, 'resident_id' => $this->resident->id, 'status' => 'active']);

    $lapsed = Resident::factory()->create(['barangay_id' => $this->own->id]);
    Beneficiary::create(['program_id' => $program->id, 'resident_id' => $lapsed->id, 'status' => 'inactive']);
    $lapsedAccount = User::factory()->create(['role' => User::ROLE_RESIDENT, 'resident_id' => $lapsed->id, 'barangay_id' => $this->own->id]);

    $this->actingAs(agencyUser())->post("/programs/{$program->id}/schedules", [
        'title' => 'Payout',
        'starts_at' => now()->addDays(3)->setTime(8, 0)->format('Y-m-d\TH:i'),
        'location' => 'Covered court',
        'what_to_bring' => 'Valid ID',
    ])->assertRedirect();

    expect(ProgramSchedule::count())->toBe(1)
        ->and(AppNotification::where('user_id', $this->account->id)->where('type', 'program_schedule')->count())->toBe(1)
        ->and(AppNotification::where('user_id', $lapsedAccount->id)->count())->toBe(0);
});

it('stops another agency and residents from posting schedules', function () {
    $program = servicesProgram();
    $payload = ['title' => 'Payout', 'starts_at' => now()->addDay()->format('Y-m-d\TH:i'), 'location' => 'Hall'];

    $this->actingAs(agencyUser(PartnerAgency::where('agency_type', 'PESO')->value('id')))->post("/programs/{$program->id}/schedules", $payload)->assertForbidden();
    $this->actingAs($this->account)->post("/programs/{$program->id}/schedules", $payload)->assertForbidden();
    expect(ProgramSchedule::count())->toBe(0);
});

it('shows upcoming schedules to beneficiaries only, and never past ones', function () {
    $program = servicesProgram();
    ProgramApplication::create(['program_id' => $program->id, 'resident_id' => $this->resident->id, 'status' => 'approved']);
    Beneficiary::create(['program_id' => $program->id, 'resident_id' => $this->resident->id, 'status' => 'active']);
    $program->schedules()->create(['title' => 'Next', 'starts_at' => now()->addDays(2), 'location' => 'Hall']);
    $program->schedules()->create(['title' => 'Old', 'starts_at' => now()->subDays(2), 'location' => 'Hall']);

    $this->actingAs($this->account)->get('/dashboard')
        ->assertInertia(fn ($page) => $page->where('upcomingSchedules', fn ($items) => collect($items)->pluck('title')->all() === ['Next']));
    $this->actingAs($this->account)->get("/programs/{$program->id}")
        ->assertInertia(fn ($page) => $page->where('schedules', fn ($items) => collect($items)->pluck('title')->all() === ['Next']));

    $outsider = Resident::factory()->create(['barangay_id' => $this->own->id]);
    $outsiderAccount = User::factory()->create(['role' => User::ROLE_RESIDENT, 'resident_id' => $outsider->id, 'barangay_id' => $this->own->id]);
    $this->actingAs($outsiderAccount)->get("/programs/{$program->id}")->assertInertia(fn ($page) => $page->where('schedules', []));
    $this->actingAs($outsiderAccount)->get('/dashboard')->assertInertia(fn ($page) => $page->where('upcomingSchedules', []));
});

it('tells beneficiaries when a future schedule is cancelled', function () {
    $program = servicesProgram();
    Beneficiary::create(['program_id' => $program->id, 'resident_id' => $this->resident->id, 'status' => 'active']);
    $schedule = $program->schedules()->create(['title' => 'Payout', 'starts_at' => now()->addDays(2), 'location' => 'Hall']);

    $this->actingAs(agencyUser())->delete("/program-schedules/{$schedule->id}")->assertRedirect();

    expect(ProgramSchedule::count())->toBe(0)
        ->and(AppNotification::where('user_id', $this->account->id)->where('title', 'like', 'Cancelled:%')->exists())->toBeTrue();
});

// --- Certificate requests --------------------------------------------------

it('lets a resident request a certificate once per open request', function () {
    $this->actingAs($this->account)->post('/documents', ['type' => 'indigency', 'purpose' => 'Hospital bill'])->assertRedirect('/documents');
    $request = DocumentRequest::first();

    expect($request->reference_no)->toStartWith('DOC-')
        ->and($request->barangay_id)->toBe($this->own->id);

    $this->actingAs($this->account)->post('/documents', ['type' => 'indigency', 'purpose' => 'Again'])->assertSessionHasErrors('type');
    $this->actingAs($this->account)->post('/documents', ['type' => 'clearance', 'purpose' => 'Job'])->assertSessionHasNoErrors();
});

it('keeps certificate requests inside their barangay', function () {
    $request = DocumentRequest::create(['resident_id' => $this->resident->id, 'barangay_id' => $this->own->id, 'type' => 'residency', 'purpose' => 'School', 'status' => 'pending']);

    $this->actingAs($this->otherAdmin)->get('/document-requests')
        ->assertInertia(fn ($page) => $page->has('requests.data', 0));
    $this->actingAs($this->otherAdmin)->patch("/document-requests/{$request->id}", ['action' => 'ready'])->assertForbidden();

    $this->actingAs($this->bhw)->get('/document-requests')
        ->assertInertia(fn ($page) => $page->has('requests.data', 1));
    $this->actingAs($this->superAdmin)->get('/document-requests')->assertForbidden();
});

it('notifies the resident when a certificate is ready, and needs a reason to decline', function () {
    $request = DocumentRequest::create(['resident_id' => $this->resident->id, 'barangay_id' => $this->own->id, 'requested_by' => $this->account->id, 'type' => 'residency', 'purpose' => 'School', 'status' => 'pending']);

    $this->actingAs($this->admin)->patch("/document-requests/{$request->id}", ['action' => 'rejected'])->assertSessionHasErrors('remarks');
    $this->actingAs($this->admin)->patch("/document-requests/{$request->id}", ['action' => 'ready'])->assertRedirect();

    expect($request->fresh()->status)->toBe('ready')
        ->and(AppNotification::where('user_id', $this->account->id)->where('type', 'document_request')->count())->toBe(1);

    // A released request cannot be marked ready again.
    $this->actingAs($this->admin)->patch("/document-requests/{$request->id}", ['action' => 'released'])->assertRedirect();
    $this->actingAs($this->admin)->patch("/document-requests/{$request->id}", ['action' => 'ready'])->assertStatus(422);
});

it('lets residents cancel only their own pending requests', function () {
    $mine = DocumentRequest::create(['resident_id' => $this->resident->id, 'barangay_id' => $this->own->id, 'type' => 'residency', 'purpose' => 'x', 'status' => 'pending']);
    $someoneElse = Resident::factory()->create(['barangay_id' => $this->own->id]);
    $theirs = DocumentRequest::create(['resident_id' => $someoneElse->id, 'barangay_id' => $this->own->id, 'type' => 'residency', 'purpose' => 'x', 'status' => 'pending']);

    $this->actingAs($this->account)->delete("/documents/{$theirs->id}")->assertNotFound();
    $this->actingAs($this->account)->delete("/documents/{$mine->id}")->assertRedirect();

    expect(DocumentRequest::pluck('id')->all())->toBe([$theirs->id]);
});

// --- Concerns --------------------------------------------------------------

it('files a concern to the resident\'s own barangay, with a daily cap', function () {
    foreach (range(1, 5) as $i) {
        $this->actingAs($this->account)->post('/concerns', ['category' => 'streetlight', 'description' => "Streetlight {$i} is out at night."])->assertSessionHasNoErrors();
    }

    $this->actingAs($this->account)->post('/concerns', ['category' => 'garbage', 'description' => 'Garbage was not collected.'])->assertSessionHasErrors('description');
    expect(Concern::count())->toBe(5)->and(Concern::first()->barangay_id)->toBe($this->own->id);
});

it('keeps concerns inside their barangay and needs a reply to resolve', function () {
    $concern = Concern::create(['resident_id' => $this->resident->id, 'barangay_id' => $this->own->id, 'reported_by' => $this->account->id, 'category' => 'road', 'description' => 'Pothole by the school.', 'status' => 'open']);

    $this->actingAs($this->otherAdmin)->get('/resident-concerns')->assertInertia(fn ($page) => $page->has('concerns.data', 0));
    $this->actingAs($this->otherAdmin)->patch("/resident-concerns/{$concern->id}", ['status' => 'in_progress'])->assertForbidden();

    $this->actingAs($this->bhw)->patch("/resident-concerns/{$concern->id}", ['status' => 'resolved'])->assertSessionHasErrors('response');
    $this->actingAs($this->bhw)->patch("/resident-concerns/{$concern->id}", ['status' => 'resolved', 'response' => 'Filled on Monday.'])->assertRedirect();

    expect($concern->fresh()->status)->toBe('resolved')
        ->and($concern->fresh()->resolved_at)->not->toBeNull()
        ->and(AppNotification::where('user_id', $this->account->id)->where('type', 'concern')->count())->toBe(1);
});

it('does not show one resident another resident\'s concerns', function () {
    $someoneElse = Resident::factory()->create(['barangay_id' => $this->own->id]);
    Concern::create(['resident_id' => $someoneElse->id, 'barangay_id' => $this->own->id, 'category' => 'noise', 'description' => 'Loud karaoke past midnight.', 'status' => 'open']);

    $this->actingAs($this->account)->get('/concerns')->assertInertia(fn ($page) => $page->has('concerns', 0));
});

// --- Household -------------------------------------------------------------

it('shows a resident only their own household members', function () {
    $household = Household::factory()->create(['barangay_id' => $this->own->id]);
    $this->resident->update(['household_id' => $household->id]);
    Resident::factory()->create(['barangay_id' => $this->own->id, 'household_id' => $household->id, 'first_name' => 'Maria']);
    Resident::factory()->create(['barangay_id' => $this->own->id, 'household_id' => Household::factory()->create(['barangay_id' => $this->own->id])->id, 'first_name' => 'Stranger']);

    $this->actingAs($this->account)->get('/my-household')
        ->assertInertia(fn ($page) => $page
            ->has('members', 2)
            ->where('members', fn ($members) => collect($members)->contains('is_you', true)
                && ! collect($members)->pluck('full_name')->contains(fn ($name) => str_contains($name, 'Stranger'))));
});

// --- Hotlines --------------------------------------------------------------

it('shows national, city-wide and own-barangay numbers, not another barangay\'s', function () {
    Hotline::create(['barangay_id' => null, 'name' => 'City DRRMO', 'number' => '000', 'category' => 'disaster']);
    Hotline::create(['barangay_id' => $this->own->id, 'name' => 'Our Hall', 'number' => '111', 'category' => 'barangay']);
    Hotline::create(['barangay_id' => $this->other->id, 'name' => 'Their Hall', 'number' => '222', 'category' => 'barangay']);

    $this->actingAs($this->account)->get('/hotlines')
        ->assertInertia(fn ($page) => $page
            ->where('national.0.number', '911')
            ->where('cityHotlines', fn ($rows) => collect($rows)->pluck('name')->all() === ['City DRRMO'])
            ->where('barangayHotlines', fn ($rows) => collect($rows)->pluck('name')->all() === ['Our Hall'])
            ->where('canManage', false));
});

it('lets each admin maintain only their own list', function () {
    $this->actingAs($this->admin)->post('/hotlines', ['name' => 'Barangay Hall', 'number' => '(088) 123-4567', 'category' => 'barangay'])->assertRedirect();
    $this->actingAs($this->superAdmin)->post('/hotlines', ['name' => 'City DRRMO', 'number' => '088 000', 'category' => 'disaster'])->assertRedirect();
    $this->actingAs($this->bhw)->post('/hotlines', ['name' => 'X', 'number' => '1', 'category' => 'other'])->assertForbidden();

    $ours = Hotline::where('name', 'Barangay Hall')->first();
    $city = Hotline::where('name', 'City DRRMO')->first();

    expect($ours->barangay_id)->toBe($this->own->id)->and($city->barangay_id)->toBeNull();

    $this->actingAs($this->otherAdmin)->delete("/hotlines/{$ours->id}")->assertForbidden();
    $this->actingAs($this->admin)->delete("/hotlines/{$city->id}")->assertForbidden();
    $this->actingAs($this->admin)->delete("/hotlines/{$ours->id}")->assertRedirect();

    expect(Hotline::count())->toBe(1);
});

it('rejects a hotline number with letters in it', function () {
    $this->actingAs($this->admin)->post('/hotlines', ['name' => 'Hall', 'number' => 'call me', 'category' => 'barangay'])->assertSessionHasErrors('number');
});
