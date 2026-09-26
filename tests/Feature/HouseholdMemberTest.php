<?php

use App\Models\AuditLog;
use App\Models\Barangay;
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
    $this->household = Household::factory()->create(['barangay_id' => $this->b22->id, 'household_number' => 'HH-1002']);
    $this->other = Household::factory()->create(['barangay_id' => $this->b22->id, 'household_number' => 'HH-1003']);

    $this->loose = Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => null, 'first_name' => 'Lena', 'last_name' => 'Cruz']);
    $this->housed = Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $this->other->id, 'first_name' => 'Ramon', 'last_name' => 'Cruz']);
});

it('lists only residents with no household by default, and those in another household when asked', function () {
    $this->actingAs($this->bhw);

    $default = collect($this->getJson("/households/{$this->household->id}/member-search?q=Cruz")->assertOk()->json())->pluck('id');
    expect($default->all())->toBe([$this->loose->id]);

    $all = collect($this->getJson("/households/{$this->household->id}/member-search?q=Cruz&include_assigned=1")->assertOk()->json())->pluck('id');
    expect($all->sort()->values()->all())->toBe(collect([$this->loose->id, $this->housed->id])->sort()->values()->all());
});

it('finds a resident by Resident ID, and names the household they are in now', function () {
    $this->actingAs($this->bhw)
        ->getJson("/households/{$this->household->id}/member-search?include_assigned=1&q=".urlencode($this->housed->resident_id))
        ->assertOk()
        ->assertJsonPath('0.id', $this->housed->id)
        ->assertJsonPath('0.household.household_number', 'HH-1003');
});

it('leaves out members already there, deactivated residents and other barangays', function () {
    $member = Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $this->household->id, 'last_name' => 'Cruz']);
    $inactive = Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => null, 'is_active' => false, 'last_name' => 'Cruz']);
    $elsewhere = Resident::factory()->create(['barangay_id' => $this->b23->id, 'household_id' => null, 'last_name' => 'Cruz']);

    $ids = collect($this->actingAs($this->bhw)->getJson("/households/{$this->household->id}/member-search?q=Cruz&include_assigned=1")->json())->pluck('id');

    expect($ids)->not->toContain($member->id)->not->toContain($inactive->id)->not->toContain($elsewhere->id);
});

it('adds a resident who has no household, and records it', function () {
    $this->actingAs($this->bhw)->post("/households/{$this->household->id}/members", ['resident_id' => $this->loose->id])
        ->assertRedirect()
        ->assertSessionHas('success');

    expect($this->loose->fresh()->household_id)->toBe($this->household->id);
    expect(AuditLog::where('table_affected', 'households')->where('record_id', $this->household->id)->latest('id')->first()->new_value)
        ->toContain('Lena')->toContain('added as a member');
});

it('asks for confirmation before moving someone out of another household', function () {
    $this->actingAs($this->bhw)->post("/households/{$this->household->id}/members", ['resident_id' => $this->housed->id])
        ->assertSessionHasErrors('resident_id');

    expect($this->housed->fresh()->household_id)->toBe($this->other->id);

    $this->post("/households/{$this->household->id}/members", ['resident_id' => $this->housed->id, 'move' => true])
        ->assertSessionHasNoErrors();

    expect($this->housed->fresh()->household_id)->toBe($this->household->id);
    // Both households keep a note of the move.
    expect(AuditLog::where('table_affected', 'households')->where('record_id', $this->other->id)->exists())->toBeTrue();
});

it('takes leadership away from a leader who is moved out', function () {
    $leader = Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $this->other->id, 'date_of_birth' => now()->subYears(40)]);
    $this->other->update(['leader_resident_id' => $leader->id]);

    $this->actingAs($this->bhw)->post("/households/{$this->household->id}/members", ['resident_id' => $leader->id, 'move' => true]);

    expect($this->other->fresh()->leader_resident_id)->toBeNull();
});

it('refuses a deactivated resident, someone already in the household, and another barangay', function () {
    $this->actingAs($this->bhw);

    $inactive = Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => null, 'is_active' => false]);
    $this->post("/households/{$this->household->id}/members", ['resident_id' => $inactive->id])->assertSessionHasErrors('resident_id');

    $member = Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $this->household->id]);
    $this->post("/households/{$this->household->id}/members", ['resident_id' => $member->id])->assertSessionHasErrors('resident_id');

    $elsewhere = Resident::factory()->create(['barangay_id' => $this->b23->id, 'household_id' => null]);
    $this->post("/households/{$this->household->id}/members", ['resident_id' => $elsewhere->id])->assertSessionHasErrors('resident_id');
    expect($elsewhere->fresh()->household_id)->toBeNull();
});

it('takes a member out of the household, clearing leadership if they led it', function () {
    $leader = Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $this->household->id, 'date_of_birth' => now()->subYears(40)]);
    $this->household->update(['leader_resident_id' => $leader->id]);

    $this->actingAs($this->bhw)->delete("/households/{$this->household->id}/members/{$leader->id}")
        ->assertRedirect()->assertSessionHas('success');

    expect($leader->fresh()->household_id)->toBeNull();
    expect($this->household->fresh()->leader_resident_id)->toBeNull();
});

it('will not remove someone who is not in that household', function () {
    $this->actingAs($this->bhw)->delete("/households/{$this->household->id}/members/{$this->housed->id}")->assertNotFound();

    expect($this->housed->fresh()->household_id)->toBe($this->other->id);
});

it('keeps staff of another barangay, the super admin and residents out', function () {
    $stranger = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->b23->id]);
    $this->actingAs($stranger)->getJson("/households/{$this->household->id}/member-search")->assertForbidden();
    $this->actingAs($stranger)->post("/households/{$this->household->id}/members", ['resident_id' => $this->loose->id])->assertForbidden();
    $this->actingAs($stranger)->delete("/households/{$this->household->id}/members/{$this->housed->id}")->assertForbidden();

    $this->actingAs(User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]))
        ->post("/households/{$this->household->id}/members", ['resident_id' => $this->loose->id])->assertForbidden();
    $this->actingAs(User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id]))
        ->post("/households/{$this->household->id}/members", ['resident_id' => $this->loose->id])->assertForbidden();

    expect($this->loose->fresh()->household_id)->toBeNull();
});

it('filters the residents list to people with no household yet', function () {
    $this->actingAs($this->bhw)->get('/residents?household=none')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('filters.household', 'none')
            ->where('residents.data', fn ($rows) => collect($rows)->every(fn ($row) => $row['household_id'] === null) && collect($rows)->pluck('id')->contains($this->loose->id)));
});
