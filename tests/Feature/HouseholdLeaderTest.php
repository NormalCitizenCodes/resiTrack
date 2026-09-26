<?php

use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\BarangayZone;
use App\Models\Household;
use App\Models\Resident;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->b22 = Barangay::where('name', 'Barangay 22')->first();
    $this->b23 = Barangay::where('name', 'Barangay 23')->first();

    $this->bhw = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->b22->id]);
    $this->admin = User::factory()->create(['role' => User::ROLE_BARANGAY_ADMIN, 'barangay_id' => $this->b22->id]);
    $this->superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);

    $this->household = Household::factory()->create(['barangay_id' => $this->b22->id, 'household_number' => 'HH-7']);
    $this->mother = Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $this->household->id, 'last_name' => 'Pollich', 'date_of_birth' => now()->subYears(38)->toDateString()]);
    $this->uncle = Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $this->household->id, 'last_name' => 'Pollich', 'date_of_birth' => now()->subYears(60)->toDateString()]);
    $this->child = Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $this->household->id, 'last_name' => 'Pollich', 'date_of_birth' => now()->subYears(9)->toDateString()]);
});

function chooseLeader($test, User $staff, ?int $residentId)
{
    return $test->actingAs($staff)->put("/households/{$test->household->id}/leader", ['resident_id' => $residentId]);
}

it('lets staff record whoever the family chose, as long as they are an adult member', function () {
    chooseLeader($this, $this->bhw, $this->uncle->id)->assertRedirect();

    expect($this->household->fresh()->leader_resident_id)->toBe($this->uncle->id);

    $entry = AuditLog::where('table_affected', 'households')->where('record_id', $this->household->id)->latest('id')->first();
    expect($entry->user_id)->toBe($this->bhw->id)
        ->and($entry->new_value)->toContain('household leader set to');

    chooseLeader($this, $this->admin, $this->mother->id)->assertRedirect();
    expect($this->household->fresh()->leader_resident_id)->toBe($this->mother->id);
});

it('refuses a child, someone outside the household, or a deactivated resident', function () {
    $outsider = Resident::factory()->create(['barangay_id' => $this->b22->id, 'date_of_birth' => now()->subYears(40)->toDateString()]);
    $inactive = Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $this->household->id, 'is_active' => false, 'date_of_birth' => now()->subYears(40)->toDateString()]);

    chooseLeader($this, $this->bhw, $this->child->id)->assertSessionHasErrors('resident_id');
    chooseLeader($this, $this->bhw, $outsider->id)->assertSessionHasErrors('resident_id');
    chooseLeader($this, $this->bhw, $inactive->id)->assertSessionHasErrors('resident_id');

    expect($this->household->fresh()->leader_resident_id)->toBeNull();
});

it('clears the leader when asked', function () {
    $this->household->update(['leader_resident_id' => $this->mother->id]);

    chooseLeader($this, $this->bhw, null)->assertRedirect();

    expect($this->household->fresh()->leader_resident_id)->toBeNull();
});

it('keeps other barangays, the super admin and residents from changing a leader', function () {
    $foreignStaff = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->b23->id]);
    $residentUser = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id]);

    chooseLeader($this, $foreignStaff, $this->mother->id)->assertForbidden();
    chooseLeader($this, $this->superAdmin, $this->mother->id)->assertForbidden();
    chooseLeader($this, $residentUser, $this->mother->id)->assertForbidden();

    expect($this->household->fresh()->leader_resident_id)->toBeNull();
});

it('drops the leader when they move out, are deactivated, or turn out to be under 18', function () {
    $other = Household::factory()->create(['barangay_id' => $this->b22->id]);

    $this->household->update(['leader_resident_id' => $this->mother->id]);
    $this->mother->update(['household_id' => $other->id]);
    expect($this->household->fresh()->leader_resident_id)->toBeNull();

    $this->household->update(['leader_resident_id' => $this->uncle->id]);
    $this->uncle->update(['is_active' => false]);
    expect($this->household->fresh()->leader_resident_id)->toBeNull();

    $adult = Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $this->household->id, 'date_of_birth' => now()->subYears(30)->toDateString()]);
    $this->household->update(['leader_resident_id' => $adult->id]);
    $adult->update(['date_of_birth' => now()->subYears(12)->toDateString()]);
    expect($this->household->fresh()->leader_resident_id)->toBeNull();

    expect(AuditLog::where('table_affected', 'households')->where('new_value', 'like', '%no longer qualifies%')->count())->toBe(3);
});

it('keeps the leader when an unrelated detail changes', function () {
    $this->household->update(['leader_resident_id' => $this->mother->id]);
    $this->mother->update(['occupation' => 'Teacher']);

    expect($this->household->fresh()->leader_resident_id)->toBe($this->mother->id);
});

it('shows the leader, the family name and only adults to choose from', function () {
    $this->household->update(['leader_resident_id' => $this->uncle->id]);

    $this->actingAs($this->bhw)->get("/households/{$this->household->id}")
        ->assertInertia(fn ($page) => $page
            ->where('family_name', 'Pollich')
            ->where('leader.id', $this->uncle->id)
            ->has('eligible_leaders', 2));
});

it('names the household by its most common surname when there is no leader yet', function () {
    $this->actingAs($this->bhw)->get("/households/{$this->household->id}")
        ->assertInertia(fn ($page) => $page->where('family_name', 'Pollich')->where('leader', null));
});

it('finds a household by a member surname and can list only those without a leader', function () {
    Household::factory()->create(['barangay_id' => $this->b22->id, 'household_number' => 'HH-8']);
    $this->household->update(['leader_resident_id' => $this->mother->id]);

    $this->actingAs($this->bhw)->get('/households?search=Pollich')
        ->assertInertia(fn ($page) => $page->has('households.data', 1)->where('households.data.0.family_name', 'Pollich')->where('households.data.0.leader.id', $this->mother->id));

    $this->actingAs($this->bhw)->get('/households?leader=none')
        ->assertInertia(fn ($page) => $page->has('households.data', 1)->where('households.data.0.household_number', 'HH-8'));
});

it('records the leader from the resident form, or says why it could not', function () {
    $payload = fn (array $extra = []) => [
        'first_name' => 'Ana', 'last_name' => 'Pollich', 'sex' => 'female', 'civil_status' => 'single',
        'date_of_birth' => now()->subYears(30)->toDateString(), 'household_id' => $this->household->id,
        'is_household_leader' => true, ...$extra,
    ];

    $this->actingAs($this->bhw)->post('/residents', $payload())->assertSessionHasNoErrors()->assertRedirect();
    $ana = Resident::where('first_name', 'Ana')->first();
    expect($this->household->fresh()->leader_resident_id)->toBe($ana->id);

    $this->household->update(['leader_resident_id' => null]);
    $this->actingAs($this->bhw)->post('/residents', $payload(['first_name' => 'Kid', 'date_of_birth' => now()->subYears(10)->toDateString()]))
        ->assertSessionHas('success', fn ($message) => str_contains($message, 'Not set as household leader'));
    expect($this->household->fresh()->leader_resident_id)->toBeNull();
});

it('clears the leader when the leader is unticked on the edit form', function () {
    $this->household->update(['leader_resident_id' => $this->mother->id]);

    $this->actingAs($this->bhw)->put("/residents/{$this->mother->id}", [
        'last_name' => $this->mother->last_name, 'first_name' => $this->mother->first_name,
        'date_of_birth' => $this->mother->date_of_birth->format('Y-m-d'), 'sex' => $this->mother->sex, 'civil_status' => $this->mother->civil_status,
        'household_id' => $this->household->id, 'is_household_leader' => false,
    ])->assertRedirect();

    expect($this->household->fresh()->leader_resident_id)->toBeNull();
});

it('tells a resident their household has no leader yet, but only when an adult could be one', function () {
    $account = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id, 'resident_id' => $this->child->id]);

    $this->actingAs($account)->get('/my-household')
        ->assertInertia(fn ($page) => $page->where('household.needs_leader', true)->where('household.leader', null));

    $this->household->update(['leader_resident_id' => $this->uncle->id]);
    $this->actingAs($account)->get('/my-household')
        ->assertInertia(fn ($page) => $page->where('household.needs_leader', false)->where('household.leader.full_name', $this->uncle->full_name));

    $kidsOnly = Household::factory()->create(['barangay_id' => $this->b22->id]);
    $orphan = Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $kidsOnly->id, 'date_of_birth' => now()->subYears(8)->toDateString()]);
    $kidAccount = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id, 'resident_id' => $orphan->id]);

    $this->actingAs($kidAccount)->get('/my-household')
        ->assertInertia(fn ($page) => $page->where('household.needs_leader', false));
});

it('prints the household leaders by purok and counts the households still without one', function () {
    $purok = BarangayZone::create(['barangay_id' => $this->b22->id, 'zone_name' => 'Purok 2']);
    $this->household->update(['zone_id' => $purok->id, 'leader_resident_id' => $this->mother->id]);
    Household::factory()->create(['barangay_id' => $this->b22->id]);
    $foreign = Household::factory()->create(['barangay_id' => $this->b23->id]);
    $foreign->update(['leader_resident_id' => Resident::factory()->create(['barangay_id' => $this->b23->id, 'household_id' => $foreign->id])->id]);

    $this->actingAs($this->bhw)->get('/reports/print?type=leaders')
        ->assertInertia(fn ($page) => $page
            ->where('report.total', 1)
            ->where('report.without_leader', 1)
            ->where('report.groups.0.purok', 'Purok 2')
            ->where('report.groups.0.rows.0.family', 'Pollich')
            ->where('report.groups.0.rows.0.leader', $this->mother->full_name));

    $this->actingAs($this->superAdmin)->get('/reports/print?type=leaders')
        ->assertInertia(fn ($page) => $page->where('report.total', 2));
});

it('lets any adult in the household choose or change the leader from their own dashboard', function () {
    $account = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id, 'resident_id' => $this->uncle->id]);

    $this->actingAs($account)->get('/my-household')
        ->assertInertia(fn ($page) => $page->where('household.can_choose_leader', true));

    $this->actingAs($account)->put('/my-household/leader', ['resident_id' => $this->mother->id])->assertRedirect();
    expect($this->household->fresh()->leader_resident_id)->toBe($this->mother->id);

    // Any adult may change it again, themselves included.
    $this->actingAs($account)->put('/my-household/leader', ['resident_id' => $this->uncle->id])->assertRedirect();
    expect($this->household->fresh()->leader_resident_id)->toBe($this->uncle->id);

    $entry = AuditLog::where('table_affected', 'households')->where('record_id', $this->household->id)->latest('id')->first();
    expect($entry->user_id)->toBe($account->id)
        ->and($entry->new_value)->toContain('chosen by');
});

it('does not let someone under 18 choose the leader', function () {
    $kid = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id, 'resident_id' => $this->child->id]);

    $this->actingAs($kid)->get('/my-household')
        ->assertInertia(fn ($page) => $page->where('household.can_choose_leader', false));

    $this->actingAs($kid)->put('/my-household/leader', ['resident_id' => $this->mother->id])->assertForbidden();

    expect($this->household->fresh()->leader_resident_id)->toBeNull();
});

it('only lets a family pick an adult from its own household', function () {
    $account = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id, 'resident_id' => $this->mother->id]);
    $neighbour = Resident::factory()->create(['barangay_id' => $this->b22->id, 'date_of_birth' => now()->subYears(45)->toDateString()]);

    $this->actingAs($account)->put('/my-household/leader', ['resident_id' => $this->child->id])->assertSessionHasErrors('resident_id');
    $this->actingAs($account)->put('/my-household/leader', ['resident_id' => $neighbour->id])->assertSessionHasErrors('resident_id');

    expect($this->household->fresh()->leader_resident_id)->toBeNull();
});

it('keeps staff and people without a household from using the resident endpoint', function () {
    $this->actingAs($this->bhw)->put('/my-household/leader', ['resident_id' => $this->mother->id])->assertForbidden();

    $loner = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id, 'resident_id' => null]);
    $this->actingAs($loner)->put('/my-household/leader', ['resident_id' => $this->mother->id])->assertForbidden();
});
