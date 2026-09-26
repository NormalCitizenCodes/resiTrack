<?php

use App\Models\Barangay;
use App\Models\Beneficiary;
use App\Models\Concern;
use App\Models\DocumentRequest;
use App\Models\DuplicateAlert;
use App\Models\Household;
use App\Models\PartnerAgency;
use App\Models\Program;
use App\Models\ProgramApplication;
use App\Models\Resident;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\SectorClassificationService;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->b22 = Barangay::where('name', 'Barangay 22')->first();
    $this->b23 = Barangay::where('name', 'Barangay 23')->first();

    $this->bhw = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->b22->id, 'name' => 'Ana Cruz']);
    $this->admin = User::factory()->create(['role' => User::ROLE_BARANGAY_ADMIN, 'barangay_id' => $this->b22->id]);
    $this->superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);

    $this->resident = Resident::factory()->senior()->create([
        'barangay_id' => $this->b22->id,
        'profiled_by_user_id' => $this->bhw->id,
        'profiled_at' => '2026-03-04 09:30:00',
    ]);
    app(SectorClassificationService::class)->classify($this->resident);
});

it('names who profiled the resident, with their role and the date', function () {
    $this->actingAs($this->admin)->get("/residents/{$this->resident->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('profiler.name', 'Ana Cruz')
            ->where('profiler.role', 'Barangay Health Worker')
            ->where('profiler.at', 'March 4, 2026'));
});

it('says so when the profiler was never recorded', function () {
    $older = Resident::factory()->create(['barangay_id' => $this->b22->id, 'profiled_by_user_id' => null, 'profiled_at' => null]);

    $this->actingAs($this->bhw)->get("/residents/{$older->id}")
        ->assertInertia(fn ($page) => $page->where('profiler.name', null)->where('profiler.role', null)->where('profiler.at', null));
});

it('explains why the resident is in each sector', function () {
    $this->actingAs($this->bhw)->get("/residents/{$this->resident->id}")
        ->assertInertia(fn ($page) => $page
            ->where('sector_reasons.SENIOR.0', fn ($reason) => str_contains($reason, 'Age')));
});

it('lists the other people in the same household, never people from anywhere else', function () {
    $home = Household::factory()->create(['barangay_id' => $this->b22->id]);
    $this->resident->update(['household_id' => $home->id]);
    $sibling = Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $home->id, 'last_name' => 'Zamora']);
    Resident::factory()->create(['barangay_id' => $this->b22->id]);
    Resident::factory()->create(['barangay_id' => $this->b23->id, 'household_id' => $home->id]);

    $this->actingAs($this->bhw)->get("/residents/{$this->resident->id}")
        ->assertInertia(fn ($page) => $page
            ->has('household_members', 1)
            ->where('household_members.0.id', $sibling->id));
});

it('shows program applications and whether the resident is an active beneficiary', function () {
    $agency = PartnerAgency::create(['agency_name' => 'DSWD', 'agency_type' => 'national', 'is_active' => true]);
    $program = Program::create(['agency_id' => $agency->id, 'posted_by' => $this->admin->id, 'title' => 'Senior pension', 'description' => 'x', 'slots_available' => 5, 'slots_filled' => 0, 'status' => 'active']);
    $application = ProgramApplication::create(['program_id' => $program->id, 'resident_id' => $this->resident->id, 'status' => 'approved', 'applied_at' => now()]);
    Beneficiary::create(['program_id' => $program->id, 'resident_id' => $this->resident->id, 'application_id' => $application->id, 'status' => 'active', 'date_added' => now()]);

    $this->actingAs($this->bhw)->get("/residents/{$this->resident->id}")
        ->assertInertia(fn ($page) => $page
            ->where('programs.0.title', 'Senior pension')
            ->where('programs.0.agency', 'DSWD')
            ->where('programs.0.beneficiary', 'active'));
});

it('shows certificate requests and reports to barangay staff but not to the super admin', function () {
    DocumentRequest::create(['resident_id' => $this->resident->id, 'barangay_id' => $this->b22->id, 'type' => 'residency', 'purpose' => 'Job', 'status' => 'pending']);
    Concern::create(['resident_id' => $this->resident->id, 'barangay_id' => $this->b22->id, 'category' => 'garbage', 'description' => 'Not collected', 'status' => 'open']);

    $this->actingAs($this->bhw)->get("/residents/{$this->resident->id}")
        ->assertInertia(fn ($page) => $page->has('requests.certificates', 1)->has('requests.concerns', 1));

    $this->actingAs($this->superAdmin)->get("/residents/{$this->resident->id}")
        ->assertInertia(fn ($page) => $page->where('requests', null));
});

it('shows the change history to admins only', function () {
    AuditLogger::record('update', 'residents', $this->resident->id, null, ['name' => $this->resident->full_name], $this->bhw->id);

    $this->actingAs($this->admin)->get("/residents/{$this->resident->id}")
        ->assertInertia(fn ($page) => $page->has('history', 1)->where('history.0.by', 'Ana Cruz'));

    $this->actingAs($this->bhw)->get("/residents/{$this->resident->id}")
        ->assertInertia(fn ($page) => $page->where('history', null));
});

it('shows whether the resident has a portal login and when they last signed in', function () {
    $this->actingAs($this->bhw)->get("/residents/{$this->resident->id}")
        ->assertInertia(fn ($page) => $page->where('portal.has_account', false));

    User::factory()->create(['role' => User::ROLE_RESIDENT, 'resident_id' => $this->resident->id, 'barangay_id' => $this->b22->id, 'last_login_at' => '2026-09-01 10:00:00']);

    foreach ([$this->bhw, $this->admin, $this->superAdmin] as $staff) {
        $this->actingAs($staff)->get("/residents/{$this->resident->id}")
            ->assertInertia(fn ($page) => $page->where('portal.has_account', true)->where('portal.last_login', 'September 1, 2026'));
    }
});

it('names the other record in a duplicate alert but only offers a link inside the same barangay', function () {
    $near = Resident::factory()->create(['barangay_id' => $this->b22->id, 'last_name' => 'Ampil']);
    $far = Resident::factory()->create(['barangay_id' => $this->b23->id, 'last_name' => 'Zulueta']);
    foreach ([$near, $far] as $other) {
        DuplicateAlert::create([
            'resident_id_1' => min($this->resident->id, $other->id),
            'resident_id_2' => max($this->resident->id, $other->id),
            'similarity_score' => 0.9,
            'match_basis' => 'name_dob',
            'status' => 'pending',
            'detected_at' => now(),
        ]);
    }

    $this->actingAs($this->bhw)->get("/residents/{$this->resident->id}")
        ->assertInertia(fn ($page) => $page
            ->has('alerts', 2)
            ->where('alerts', fn ($alerts) => collect($alerts)->firstWhere('other.id', $near->id)['other']['can_open'] === true
                && collect($alerts)->firstWhere('other.id', $far->id)['other']['can_open'] === false
                && collect($alerts)->firstWhere('other.id', $far->id)['other']['barangay'] === 'Barangay 23'));
});

it('still refuses to show a resident from another barangay', function () {
    $foreign = Resident::factory()->create(['barangay_id' => $this->b23->id]);

    $this->actingAs($this->bhw)->get("/residents/{$foreign->id}")->assertForbidden();
});
