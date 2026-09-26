<?php

use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\Household;
use App\Models\Resident;
use App\Models\User;
use App\Models\VulnerabilitySector;
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

    $this->household = Household::factory()->create([
        'barangay_id' => $this->b22->id,
        'household_number' => 'HH-1050',
        'address' => '40 Osmena Street, Purok 2',
        'water_source' => 'pipe',
        'monthly_income' => 6000,
        'is_4ps_beneficiary' => false,
    ]);
});

function householdChanges(array $overrides = []): array
{
    return [
        'household_number' => 'HH-1050',
        'address' => '40 Osmena Street, Purok 2',
        'house_ownership' => 'owned',
        'water_source' => 'well',
        'monthly_income' => 8500,
        'is_4ps_beneficiary' => true,
        ...$overrides,
    ];
}

it('opens the edit form for staff of the same barangay, with the current values', function () {
    foreach ([$this->bhw, $this->admin] as $staff) {
        $this->actingAs($staff)->get("/households/{$this->household->id}/edit")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('households/edit')
                ->where('household.household_number', 'HH-1050')
                ->where('household.water_source', 'pipe'));
    }
});

it('saves the changes, keeps the barangay, and records what changed', function () {
    $this->actingAs($this->bhw)->put("/households/{$this->household->id}", householdChanges())
        ->assertRedirect("/households/{$this->household->id}");

    $fresh = $this->household->fresh();

    expect($fresh->water_source)->toBe('well')
        ->and((float) $fresh->monthly_income)->toBe(8500.0)
        ->and($fresh->is_4ps_beneficiary)->toBeTrue()
        ->and($fresh->barangay_id)->toBe($this->b22->id);

    $entry = AuditLog::where('action', 'update')->where('table_affected', 'households')->latest('id')->first();
    $payload = json_decode((string) $entry->new_value, true);

    expect($entry->user_id)->toBe($this->bhw->id)
        ->and($entry->record_id)->toBe($this->household->id)
        ->and($payload['household_number'])->toBe('HH-1050')
        ->and($payload['changed'])->toContain('water source');
});

it('refuses to edit a household of another barangay', function () {
    $foreign = Household::factory()->create(['barangay_id' => $this->b23->id]);

    $this->actingAs($this->bhw)->get("/households/{$foreign->id}/edit")->assertForbidden();
    $this->actingAs($this->bhw)->put("/households/{$foreign->id}", householdChanges())->assertForbidden();

    expect($foreign->fresh()->water_source)->toBe($foreign->water_source);
});

it('keeps the super admin and residents from editing households', function () {
    $resident = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id]);

    $this->actingAs($this->superAdmin)->get("/households/{$this->household->id}/edit")->assertForbidden();
    $this->actingAs($this->superAdmin)->put("/households/{$this->household->id}", householdChanges())->assertForbidden();
    $this->actingAs($resident)->put("/households/{$this->household->id}", householdChanges())->assertForbidden();

    expect($this->household->fresh()->water_source)->toBe('pipe');
});

it('rejects a value the form does not offer', function () {
    $this->actingAs($this->bhw)->put("/households/{$this->household->id}", householdChanges(['water_source' => 'river']))
        ->assertSessionHasErrors('water_source');
});

it('summarises who lives in the household and which sectors they bring', function () {
    $senior = VulnerabilitySector::where('code', 'SENIOR')->first();

    $grandmother = Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $this->household->id, 'date_of_birth' => now()->subYears(70)->toDateString()]);
    $grandmother->sectors()->attach($senior->id);
    Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $this->household->id, 'date_of_birth' => now()->subYears(9)->toDateString()]);
    Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $this->household->id, 'date_of_birth' => now()->subYears(35)->toDateString()]);

    $this->actingAs($this->bhw)->get("/households/{$this->household->id}")
        ->assertInertia(fn ($page) => $page
            ->where('summary.members', 3)
            ->where('summary.children', 1)
            ->where('summary.seniors', 1)
            ->where('summary.sectors.0.code', 'SENIOR')
            ->where('summary.sectors.0.count', 1)
            ->where('summary.average_age', 38));
});

it('opens the resident form with the household chosen, but only one from the same barangay', function () {
    $foreign = Household::factory()->create(['barangay_id' => $this->b23->id]);

    $this->actingAs($this->bhw)->get("/residents/create?household_id={$this->household->id}")
        ->assertInertia(fn ($page) => $page->where('prefillHouseholdId', $this->household->id));

    $this->actingAs($this->bhw)->get("/residents/create?household_id={$foreign->id}")
        ->assertInertia(fn ($page) => $page->where('prefillHouseholdId', null));

    $this->actingAs($this->bhw)->get('/residents/create')
        ->assertInertia(fn ($page) => $page->where('prefillHouseholdId', null));
});
