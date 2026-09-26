<?php

use App\Models\AppNotification;
use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\Beneficiary;
use App\Models\PartnerAgency;
use App\Models\Program;
use App\Models\ProgramApplication;
use App\Models\ProgramClaim;
use App\Models\ProgramSchedule;
use App\Models\Resident;
use App\Models\User;
use App\Models\VulnerabilitySector;
use App\Services\ActivityLogPresenter;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->b22 = Barangay::where('name', 'Barangay 22')->first();
    $this->b23 = Barangay::where('name', 'Barangay 23')->first();

    $this->agency = PartnerAgency::create(['agency_name' => 'DSWD', 'agency_type' => 'national', 'is_active' => true]);
    $this->otherAgency = PartnerAgency::create(['agency_name' => 'PESO', 'agency_type' => 'local', 'is_active' => true]);
    $this->officer = User::factory()->create(['role' => User::ROLE_PARTNER_AGENCY, 'agency_id' => $this->agency->id, 'barangay_id' => null]);
    $this->bhw = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->b22->id]);

    $this->program = Program::create(['agency_id' => $this->agency->id, 'posted_by' => $this->officer->id, 'title' => 'Rice aid', 'description' => 'x', 'slots_available' => 50, 'slots_filled' => 0, 'status' => 'active']);
    $this->resident = Resident::factory()->create(['barangay_id' => $this->b22->id, 'is_active' => true]);
    $application = ProgramApplication::create(['program_id' => $this->program->id, 'resident_id' => $this->resident->id, 'status' => 'approved', 'applied_at' => now()]);
    Beneficiary::create(['program_id' => $this->program->id, 'resident_id' => $this->resident->id, 'application_id' => $application->id, 'status' => 'active', 'date_added' => now()]);
});

function claim($test, ?User $user = null, array $extra = [], ?Program $program = null, ?Resident $resident = null)
{
    return $test->actingAs($user ?? $test->officer)
        ->post('/programs/'.($program ?? $test->program)->id.'/claims', ['resident_id' => ($resident ?? $test->resident)->id, ...$extra]);
}

it('lets the owning agency record that a beneficiary claimed', function () {
    claim($this)->assertRedirect()->assertSessionHasNoErrors();

    $claim = ProgramClaim::first();

    expect($claim->program_id)->toBe($this->program->id)
        ->and($claim->resident_id)->toBe($this->resident->id)
        ->and($claim->recorded_by)->toBe($this->officer->id)
        ->and($claim->claim_date->toDateString())->toBe(today()->toDateString());
});

it('records who did it, tells the resident, and shows in the activity log', function () {
    $account = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id, 'resident_id' => $this->resident->id]);

    claim($this)->assertSessionHasNoErrors();

    $entry = AuditLog::where('table_affected', 'program_claims')->first();

    expect($entry->user_id)->toBe($this->officer->id)
        ->and(app(ActivityLogPresenter::class)->describe($entry)['summary'])->toBe('Recorded a program claim')
        ->and(AppNotification::where('user_id', $account->id)->where('title', 'Your claim was recorded')->exists())->toBeTrue();
});

it('will not record a claim twice on the same day, but allows a different claim day', function () {
    $first = ProgramSchedule::create(['program_id' => $this->program->id, 'title' => 'Day 1', 'starts_at' => now()->addDay(), 'location' => 'Hall']);
    $second = ProgramSchedule::create(['program_id' => $this->program->id, 'title' => 'Day 2', 'starts_at' => now()->addDays(2), 'location' => 'Hall']);

    claim($this, extra: ['schedule_id' => $first->id])->assertSessionHasNoErrors();
    claim($this, extra: ['schedule_id' => $first->id])->assertSessionHasErrors('resident_id');
    claim($this, extra: ['schedule_id' => $second->id])->assertSessionHasNoErrors();

    expect(ProgramClaim::count())->toBe(2);

    // With no claim day set, once per calendar day.
    $other = Program::create(['agency_id' => $this->agency->id, 'posted_by' => $this->officer->id, 'title' => 'Other', 'description' => 'x', 'slots_available' => 5, 'slots_filled' => 0, 'status' => 'active']);
    Beneficiary::create(['program_id' => $other->id, 'resident_id' => $this->resident->id, 'application_id' => ProgramApplication::create(['program_id' => $other->id, 'resident_id' => $this->resident->id, 'status' => 'approved', 'applied_at' => now()])->id, 'status' => 'active', 'date_added' => now()]);

    claim($this, program: $other)->assertSessionHasNoErrors();
    claim($this, program: $other)->assertSessionHasErrors('resident_id');
});

it('only accepts a claim day that belongs to the program', function () {
    $foreignDay = ProgramSchedule::create(['program_id' => Program::create(['agency_id' => $this->agency->id, 'posted_by' => $this->officer->id, 'title' => 'Elsewhere', 'description' => 'x', 'slots_available' => 5, 'slots_filled' => 0, 'status' => 'active'])->id, 'title' => 'Not ours', 'starts_at' => now(), 'location' => 'Hall']);

    claim($this, extra: ['schedule_id' => $foreignDay->id])->assertSessionHasErrors('schedule_id');

    expect(ProgramClaim::count())->toBe(0);
});

it('refuses someone who is not an active beneficiary of this program', function () {
    $stranger = Resident::factory()->create(['barangay_id' => $this->b22->id]);
    $inactive = Resident::factory()->create(['barangay_id' => $this->b22->id]);
    Beneficiary::create(['program_id' => $this->program->id, 'resident_id' => $inactive->id, 'application_id' => ProgramApplication::create(['program_id' => $this->program->id, 'resident_id' => $inactive->id, 'status' => 'approved', 'applied_at' => now()])->id, 'status' => 'inactive', 'date_added' => now()]);

    claim($this, resident: $stranger)->assertSessionHasErrors('resident_id');
    claim($this, resident: $inactive)->assertSessionHasErrors('resident_id');

    expect(ProgramClaim::count())->toBe(0);
});

it('keeps everyone but the owning agency from recording claims', function () {
    $otherOfficer = User::factory()->create(['role' => User::ROLE_PARTNER_AGENCY, 'agency_id' => $this->otherAgency->id, 'barangay_id' => null]);
    $superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
    $residentUser = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id, 'resident_id' => $this->resident->id]);

    foreach ([$otherOfficer, $superAdmin, $this->bhw, $residentUser] as $user) {
        claim($this, $user)->assertForbidden();
    }

    expect(ProgramClaim::count())->toBe(0);
});

it('keeps an agency tied to one barangay to that barangay', function () {
    $local = User::factory()->create(['role' => User::ROLE_PARTNER_AGENCY, 'agency_id' => $this->agency->id, 'barangay_id' => $this->b23->id]);
    $localProgram = Program::create(['agency_id' => $this->agency->id, 'barangay_id' => $this->b23->id, 'posted_by' => $local->id, 'title' => 'Local', 'description' => 'x', 'slots_available' => 5, 'slots_filled' => 0, 'status' => 'active']);

    claim($this, $local, program: $localProgram)->assertForbidden();
});

it('lets the agency undo a claim, and only its own', function () {
    claim($this)->assertSessionHasNoErrors();
    $claim = ProgramClaim::first();

    $otherOfficer = User::factory()->create(['role' => User::ROLE_PARTNER_AGENCY, 'agency_id' => $this->otherAgency->id, 'barangay_id' => null]);
    $this->actingAs($otherOfficer)->delete("/programs/{$this->program->id}/claims/{$claim->id}")->assertForbidden();
    expect(ProgramClaim::count())->toBe(1);

    $this->actingAs($this->officer)->delete("/programs/{$this->program->id}/claims/{$claim->id}")->assertRedirect();
    expect(ProgramClaim::count())->toBe(0)
        ->and(AuditLog::where('action', 'delete')->where('table_affected', 'program_claims')->exists())->toBeTrue();
});

it('shows the owning agency who claimed, and a resident only their own claims', function () {
    claim($this)->assertSessionHasNoErrors();

    $this->actingAs($this->officer)->get("/programs/{$this->program->id}")
        ->assertInertia(fn ($page) => $page->where('canRecordClaims', true)->has('claims', 1)->where('claims.0.resident_id', $this->resident->id));

    $residentUser = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id, 'resident_id' => $this->resident->id]);
    $this->actingAs($residentUser)->get("/programs/{$this->program->id}")
        ->assertInertia(fn ($page) => $page->has('myClaims', 1)->missing('claims'));
});

it('tells the agency at the counter whether someone already claimed today', function () {
    $staff = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->b22->id]);
    $url = fn () => '/verify/'.$this->resident->resident_id.'?s='.Resident::idSignature($this->resident->resident_id);

    $this->actingAs($this->officer)->get($url())
        ->assertInertia(fn ($page) => $page->where('result.agency_programs.0.claimed_today', false)->where('result.agency_programs.0.can_claim', true));

    claim($this)->assertSessionHasNoErrors();

    $this->actingAs($this->officer)->get($url())
        ->assertInertia(fn ($page) => $page->where('result.agency_programs.0.claimed_today', true));

    // Staff see no agency programs at all, so no claim button.
    $this->actingAs($staff)->get($url())->assertInertia(fn ($page) => $page->where('result.agency_programs', null));
});

it('counts claimed beneficiaries in the program reach report', function () {
    $other = Resident::factory()->create(['barangay_id' => $this->b22->id]);
    Beneficiary::create(['program_id' => $this->program->id, 'resident_id' => $other->id, 'application_id' => ProgramApplication::create(['program_id' => $this->program->id, 'resident_id' => $other->id, 'status' => 'approved', 'applied_at' => now()])->id, 'status' => 'active', 'date_added' => now()]);

    $day = ProgramSchedule::create(['program_id' => $this->program->id, 'title' => 'Day 1', 'starts_at' => now()->addDay(), 'location' => 'Hall']);
    claim($this)->assertSessionHasNoErrors();
    claim($this, extra: ['schedule_id' => $day->id])->assertSessionHasNoErrors();

    $admin = User::factory()->create(['role' => User::ROLE_BARANGAY_ADMIN, 'barangay_id' => $this->b22->id]);

    $this->actingAs($admin)->get('/reports/print?type=programs')
        ->assertInertia(fn ($page) => $page->where('report.rows.0.claimed', 1)->where('report.rows.0.beneficiaries', 2));
});

it('sizes a program before it is published', function () {
    $senior = VulnerabilitySector::where('code', 'SENIOR')->first();
    $pwd = VulnerabilitySector::where('code', 'PWD')->first();

    foreach ([[$this->b22, $senior], [$this->b22, $senior], [$this->b22, $pwd], [$this->b23, $senior]] as [$barangay, $sector]) {
        Resident::factory()->create(['barangay_id' => $barangay->id, 'is_active' => true])->sectors()->attach($sector->id);
    }
    Resident::factory()->create(['barangay_id' => $this->b22->id, 'is_active' => false])->sectors()->attach($senior->id);

    $preview = fn (array $query) => $this->actingAs($this->officer)->getJson('/programs/eligibility-preview?'.http_build_query($query))->assertOk()->json();

    $everyone = Resident::where('is_active', true)->count();

    expect($preview(['sector_ids' => [$senior->id]]))->toBe(['eligible' => 3, 'total' => $everyone])
        ->and($preview(['sector_ids' => [$senior->id, $pwd->id]])['eligible'])->toBe(4)
        ->and($preview(['sector_ids' => [$senior->id], 'barangay_id' => $this->b22->id]))->toBe(['eligible' => 2, 'total' => Resident::where('is_active', true)->where('barangay_id', $this->b22->id)->count()])
        ->and($preview([])['eligible'])->toBe($everyone);
});

it('sizes an agency tied to one barangay against that barangay only', function () {
    $senior = VulnerabilitySector::where('code', 'SENIOR')->first();
    Resident::factory()->create(['barangay_id' => $this->b22->id])->sectors()->attach($senior->id);
    Resident::factory()->create(['barangay_id' => $this->b23->id])->sectors()->attach($senior->id);

    $local = User::factory()->create(['role' => User::ROLE_PARTNER_AGENCY, 'agency_id' => $this->agency->id, 'barangay_id' => $this->b23->id]);

    $this->actingAs($local)->getJson('/programs/eligibility-preview?'.http_build_query(['sector_ids' => [$senior->id], 'barangay_id' => $this->b22->id]))
        ->assertOk()->assertJson(['eligible' => 1]);
});

it('keeps the size estimate for agencies and the super admin', function () {
    $resident = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id]);

    $this->actingAs($this->bhw)->getJson('/programs/eligibility-preview')->assertForbidden();
    $this->actingAs($resident)->getJson('/programs/eligibility-preview')->assertForbidden();
    $this->actingAs($this->officer)->getJson('/programs/eligibility-preview')->assertOk();
});
