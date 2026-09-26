<?php

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

    $this->pollich = Household::factory()->create(['barangay_id' => $this->b22->id, 'household_number' => 'HH-1050', 'address' => '40 Osmena Street']);
    Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $this->pollich->id, 'last_name' => 'Pollich']);

    $this->smitham = Household::factory()->create(['barangay_id' => $this->b22->id, 'household_number' => 'HH-1142', 'address' => '81060 Labadie Drive']);
    Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $this->smitham->id, 'last_name' => 'Smitham']);

    $this->elsewhere = Household::factory()->create(['barangay_id' => $this->b23->id, 'household_number' => 'HH-9001', 'address' => '1 Other Street']);
    Resident::factory()->create(['barangay_id' => $this->b23->id, 'household_id' => $this->elsewhere->id, 'last_name' => 'Pollich']);
});

it('finds a household by family name, number or address', function () {
    $this->actingAs($this->bhw);

    $this->getJson('/households/search?q=smitham')->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $this->smitham->id);
    $this->getJson('/households/search?q=1050')->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $this->pollich->id);
    $this->getJson('/households/search?q=Labadie')->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $this->smitham->id);
});

it('returns the family name and address a picker shows', function () {
    $this->actingAs($this->bhw)->getJson('/households/search?q=Pollich')
        ->assertOk()
        ->assertJsonPath('0.family_name', 'Pollich')
        ->assertJsonPath('0.household_number', 'HH-1050')
        ->assertJsonPath('0.address', '40 Osmena Street');
});

it('never returns a household of another barangay', function () {
    $this->actingAs($this->bhw);

    // "Pollich" also lives in barangay 23, and its number is searchable too.
    $ids = collect($this->getJson('/households/search?q=Pollich')->assertOk()->json())->pluck('id');
    expect($ids->all())->toBe([$this->pollich->id]);

    $this->getJson('/households/search?q=HH-9001')->assertOk()->assertJsonCount(0);
    $this->getJson('/households/search')->assertOk()->assertJsonMissing(['id' => $this->elsewhere->id]);
});

it('returns at most fifteen matches', function () {
    Household::factory()->count(20)->create(['barangay_id' => $this->b22->id]);

    $this->actingAs($this->bhw)->getJson('/households/search')->assertOk()->assertJsonCount(15);
});

it('is closed to the super admin, residents and guests', function () {
    $this->getJson('/households/search')->assertUnauthorized();

    $this->actingAs(User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]))->getJson('/households/search')->assertForbidden();
    $this->actingAs(User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id]))->getJson('/households/search')->assertForbidden();
});

it('sends the resident form only the household already chosen, not the whole barangay', function () {
    $this->actingAs($this->bhw)->get('/residents/create')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('residents/create')->has('households', 0));

    $this->actingAs($this->bhw)->get("/residents/create?household_id={$this->pollich->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('households', 1)->where('households.0.id', $this->pollich->id)->where('households.0.family_name', 'Pollich'));

    // A household of another barangay is ignored, as before.
    $this->actingAs($this->bhw)->get("/residents/create?household_id={$this->elsewhere->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('households', 0));
});

it('names the saved household when editing a resident', function () {
    $resident = Resident::factory()->create(['barangay_id' => $this->b22->id, 'household_id' => $this->smitham->id]);

    $this->actingAs($this->bhw)->get("/residents/{$resident->id}/edit")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('households', 1)->where('households.0.id', $this->smitham->id));
});
