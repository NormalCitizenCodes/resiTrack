<?php

use App\Models\Announcement;
use App\Models\AppNotification;
use App\Models\Barangay;
use App\Models\Household;
use App\Models\HouseholdWellbeingAssessment;
use App\Models\PartnerAgency;
use App\Models\Program;
use App\Models\ProgramApplication;
use App\Models\Resident;
use App\Models\User;
use App\Models\VulnerabilitySector;
use App\Models\WellbeingLevel;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->barangay = Barangay::where('name', 'Barangay 22')->first();
    $this->otherBarangay = Barangay::where('name', 'Barangay 23')->first();
    $this->seniorSector = VulnerabilitySector::where('code', 'SENIOR')->first();

    $this->staff = User::factory()->create([
        'role' => User::ROLE_BHW,
        'barangay_id' => $this->barangay->id,
    ]);

    // A senior resident with a linked login (eligible for senior programs/announcements).
    $this->senior = Resident::factory()->create([
        'barangay_id' => $this->barangay->id,
        'is_senior_citizen' => true,
    ]);
    $this->senior->sectors()->attach($this->seniorSector->id);

    $this->residentUser = User::factory()->create([
        'role' => User::ROLE_RESIDENT,
        'barangay_id' => $this->barangay->id,
        'resident_id' => $this->senior->id,
    ]);
});

// --- Wellbeing assessments ---

it('lets barangay staff record a household wellbeing assessment', function () {
    $household = Household::factory()->create(['barangay_id' => $this->barangay->id]);
    $level = WellbeingLevel::first();

    $this->actingAs($this->staff)
        ->post("/households/{$household->id}/wellbeing-assessments", [
            'level_id' => $level->id,
            'remarks' => 'Baseline',
        ])->assertRedirect();

    expect(HouseholdWellbeingAssessment::where('household_id', $household->id)->count())->toBe(1);
});

it('forbids assessing a household in another barangay', function () {
    $household = Household::factory()->create(['barangay_id' => $this->otherBarangay->id]);
    $level = WellbeingLevel::first();

    $this->actingAs($this->staff)
        ->post("/households/{$household->id}/wellbeing-assessments", ['level_id' => $level->id])
        ->assertForbidden();
});

// --- Announcements ---

it('lets a barangay admin post an announcement targeting multiple sectors and notifies matching residents', function () {
    $pwd = VulnerabilitySector::where('code', 'PWD')->first();
    $admin = User::factory()->create([
        'role' => User::ROLE_BARANGAY_ADMIN,
        'barangay_id' => $this->barangay->id,
    ]);

    $this->actingAs($admin)->post('/announcements', [
        'title' => 'Senior payout',
        'content' => 'Claim your pension.',
        'sector_ids' => [$this->seniorSector->id, $pwd->id],
    ])->assertRedirect();

    $announcement = Announcement::where('title', 'Senior payout')->first();

    expect($announcement)->not->toBeNull()
        ->and($announcement->sectors->pluck('code'))->toContain('SENIOR')->toContain('PWD')
        ->and(AppNotification::where('user_id', $this->residentUser->id)->where('type', 'announcement')->count())->toBe(1);
});

it('forbids BHWs from viewing or posting announcements', function () {
    $this->actingAs($this->staff)->get('/announcements')->assertForbidden();
    $this->actingAs($this->staff)->get('/announcements/create')->assertForbidden();
    $this->actingAs($this->staff)->post('/announcements', [
        'title' => 'x',
        'content' => 'y',
    ])->assertForbidden();
});

it('filters households by purok, current wellbeing level and 4Ps status', function () {
    $level = WellbeingLevel::first();
    $other = WellbeingLevel::where('id', '!=', $level->id)->first();

    $assessed = Household::factory()->create(['barangay_id' => $this->barangay->id, 'is_4ps_beneficiary' => true]);
    $unassessed = Household::factory()->create(['barangay_id' => $this->barangay->id, 'is_4ps_beneficiary' => false]);

    HouseholdWellbeingAssessment::create([
        'household_id' => $assessed->id,
        'level_id' => $other->id,
        'assessed_by' => $this->staff->id,
        'assessment_date' => now()->subDay(),
    ]);
    HouseholdWellbeingAssessment::create([
        'household_id' => $assessed->id,
        'level_id' => $level->id,
        'assessed_by' => $this->staff->id,
        'assessment_date' => now(),
    ]);

    $ids = fn (array $query) => collect(
        $this->actingAs($this->staff)->get('/households?'.http_build_query($query))
            ->viewData('page')['props']['households']['data']
    )->pluck('id')->all();

    expect($ids(['wellbeing' => $level->id]))->toBe([$assessed->id])
        ->and($ids(['wellbeing' => $other->id]))->toBe([])
        ->and($ids(['wellbeing' => 'none']))->toBe([$unassessed->id])
        ->and($ids(['is_4ps' => 'yes']))->toBe([$assessed->id])
        ->and($ids(['is_4ps' => 'no']))->toBe([$unassessed->id]);
});

it('forbids residents from posting announcements', function () {
    $this->actingAs($this->residentUser)->post('/announcements', [
        'title' => 'x',
        'content' => 'y',
    ])->assertForbidden();
});

it('only shows residents announcements for their barangay and a sector they belong to', function () {
    // Broadcast in this barangay (no sectors attached) — visible.
    Announcement::create(['posted_by' => $this->staff->id, 'barangay_id' => $this->barangay->id, 'title' => 'Broadcast', 'content' => 'a', 'posted_at' => now()]);
    // Another barangay — hidden.
    Announcement::create(['posted_by' => $this->staff->id, 'barangay_id' => $this->otherBarangay->id, 'title' => 'Other brgy', 'content' => 'b', 'posted_at' => now()]);
    // Targeted at a sector the resident is NOT in — hidden.
    $pwd = VulnerabilitySector::where('code', 'PWD')->first();
    $pwdOnly = Announcement::create(['posted_by' => $this->staff->id, 'barangay_id' => $this->barangay->id, 'title' => 'PWD only', 'content' => 'c', 'posted_at' => now()]);
    $pwdOnly->sectors()->attach($pwd->id);
    // Targeted at multiple sectors, one of which the resident IS in — visible.
    $multi = Announcement::create(['posted_by' => $this->staff->id, 'barangay_id' => $this->barangay->id, 'title' => 'Senior + PWD', 'content' => 'd', 'posted_at' => now()]);
    $multi->sectors()->attach([$pwd->id, $this->seniorSector->id]);

    $this->actingAs($this->residentUser)
        ->get('/announcements')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('announcements/index')->has('announcements.data', 2));
});

// --- Notifications ---

it('notifies sector-matching residents when a program is published', function () {
    $agency = PartnerAgency::where('agency_type', 'DSWD')->first();
    $agencyUser = User::factory()->create(['role' => User::ROLE_PARTNER_AGENCY, 'agency_id' => $agency->id]);

    // A resident NOT in the senior sector — should not be notified.
    $nonSenior = Resident::factory()->create(['barangay_id' => $this->barangay->id]);
    User::factory()->create(['role' => User::ROLE_RESIDENT, 'resident_id' => $nonSenior->id]);

    $this->actingAs($agencyUser)->post('/programs', [
        'title' => 'Senior Pension',
        'slots_available' => 10,
        'status' => 'active',
        'sector_ids' => [$this->seniorSector->id],
    ])->assertRedirect();

    expect(AppNotification::where('user_id', $this->residentUser->id)->where('type', 'program_match')->count())->toBe(1)
        ->and(AppNotification::where('type', 'program_match')->count())->toBe(1); // only the senior, not the non-senior
});

it('notifies the applicant when their application is approved', function () {
    $agency = PartnerAgency::where('agency_type', 'DSWD')->first();
    $agencyUser = User::factory()->create(['role' => User::ROLE_PARTNER_AGENCY, 'agency_id' => $agency->id]);
    $program = Program::create(['agency_id' => $agency->id, 'title' => 'Aid', 'slots_available' => 5, 'slots_filled' => 0, 'status' => 'active']);
    $application = ProgramApplication::create(['program_id' => $program->id, 'resident_id' => $this->senior->id, 'status' => 'pending']);

    $this->actingAs($agencyUser)
        ->patch("/applications/{$application->id}", ['status' => 'approved'])
        ->assertRedirect();

    expect(AppNotification::where('user_id', $this->residentUser->id)->where('type', 'program_match')->count())->toBe(1);
});

it('lets a resident mark their own notification read but not another user\'s', function () {
    $mine = AppNotification::create(['user_id' => $this->residentUser->id, 'title' => 'Mine', 'type' => 'system', 'is_read' => false]);
    $other = AppNotification::create(['user_id' => $this->staff->id, 'title' => 'Theirs', 'type' => 'system', 'is_read' => false]);

    $this->actingAs($this->residentUser)->post("/notifications/{$mine->id}/read")->assertRedirect();
    expect($mine->fresh()->is_read)->toBeTrue();

    $this->actingAs($this->residentUser)->post("/notifications/{$other->id}/read")->assertForbidden();
    expect($other->fresh()->is_read)->toBeFalse();
});
