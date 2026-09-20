<?php

use App\Models\Barangay;
use App\Models\Household;
use App\Models\Resident;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    Cache::forget('landing.stats');
});

it('shows the public home page to guests with aggregate totals only', function () {
    $barangay = Barangay::where('name', 'Barangay 22')->first();
    Resident::factory()->count(3)->create(['barangay_id' => $barangay->id, 'is_active' => true]);
    Resident::factory()->create(['barangay_id' => $barangay->id, 'is_active' => false]);
    Household::factory()->count(2)->create(['barangay_id' => $barangay->id]);

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('welcome')
            ->where('stats.residents', 3)
            ->where('stats.households', 2)
            ->has('stats.programs')
            ->has('stats.agencies')
            ->missing('stats.names')
            ->where('stats', fn ($stats) => collect($stats)->every(fn ($value) => is_int($value))));
});

it('does not leak any resident name into the public page payload', function () {
    $barangay = Barangay::where('name', 'Barangay 22')->first();
    $resident = Resident::factory()->create(['barangay_id' => $barangay->id, 'last_name' => 'Zzyzxsurname']);

    $this->get('/')->assertOk()->assertDontSee($resident->last_name);
});

it('serves the privacy notice, terms and FAQ to guests', function (string $path, string $component) {
    $this->get($path)
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component($component));
})->with([
    ['/privacy', 'legal/privacy'],
    ['/terms', 'legal/terms'],
    ['/faq', 'legal/faq'],
]);
