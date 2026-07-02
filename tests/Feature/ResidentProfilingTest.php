<?php

use App\Models\Barangay;
use App\Models\DuplicateAlert;
use App\Models\Resident;
use App\Models\User;
use App\Services\DuplicateDetectionService;
use App\Services\SectorClassificationService;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->barangay = Barangay::where('name', 'Barangay 22')->first();

    $this->staff = User::factory()->create([
        'role' => User::ROLE_BHW,
        'barangay_id' => $this->barangay->id,
    ]);

    $this->resident = User::factory()->create([
        'role' => User::ROLE_RESIDENT,
        'barangay_id' => $this->barangay->id,
    ]);
});

it('lets barangay staff view the resident records list', function () {
    $this->actingAs($this->staff)
        ->get('/residents')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('residents/index'));
});

it('forbids resident-role users from the barangay module', function () {
    $this->actingAs($this->resident)
        ->get('/residents')
        ->assertForbidden();
});

it('classifies a senior citizen automatically on registration', function () {
    $this->actingAs($this->staff)->post('/residents', [
        'first_name' => 'Pedro',
        'last_name' => 'Bautista',
        'date_of_birth' => now()->subYears(65)->format('Y-m-d'),
        'sex' => 'male',
        'civil_status' => 'married',
    ])->assertRedirect();

    $resident = Resident::where('last_name', 'Bautista')->first();

    expect($resident)->not->toBeNull()
        ->and($resident->is_senior_citizen)->toBeTrue()
        ->and($resident->sectors->pluck('code'))->toContain('SENIOR');
});

it('detects a compound-vulnerability resident (senior + PWD)', function () {
    $service = app(SectorClassificationService::class);

    $resident = Resident::factory()->create([
        'barangay_id' => $this->barangay->id,
        'date_of_birth' => now()->subYears(70)->format('Y-m-d'),
        'is_pwd' => true,
    ]);

    $codes = $service->classify($resident);

    expect($codes)->toContain('SENIOR')->toContain('PWD')
        ->and($resident->fresh()->sectors)->toHaveCount(2);
});

it('flags an in-barangay duplicate via matching PhilSys number', function () {
    $duplicates = app(DuplicateDetectionService::class);

    $first = Resident::factory()->create([
        'barangay_id' => $this->barangay->id,
        'philsys_card_no' => '1111-2222-3333',
    ]);
    $duplicates->scan($first);

    $second = Resident::factory()->create([
        'barangay_id' => $this->barangay->id,
        'philsys_card_no' => '1111-2222-3333',
    ]);
    $created = $duplicates->scan($second);

    expect($created)->toBe(1)
        ->and($second->fresh()->is_duplicate_flagged)->toBeTrue()
        ->and(DuplicateAlert::where('match_basis', 'philsys')->count())->toBe(1);
});

it('detects a cross-barangay transfer as a distinct alert type', function () {
    $duplicates = app(DuplicateDetectionService::class);
    $otherBarangay = Barangay::where('name', 'Barangay 23')->first();

    $origin = Resident::factory()->create([
        'barangay_id' => $otherBarangay->id,
        'first_name' => 'Lorna',
        'last_name' => 'Mabini',
        'date_of_birth' => '1990-09-30',
    ]);
    $duplicates->scan($origin);

    $moved = Resident::factory()->create([
        'barangay_id' => $this->barangay->id,
        'first_name' => 'Lorna',
        'last_name' => 'Mabini',
        'date_of_birth' => '1990-09-30',
    ]);
    $duplicates->scan($moved);

    expect(DuplicateAlert::where('match_basis', 'cross_barangay_transfer')->count())->toBe(1);
});

it('shows an incoming transfer to the receiving barangay staff', function () {
    $duplicates = app(DuplicateDetectionService::class);
    $otherBarangay = Barangay::where('name', 'Barangay 23')->first();

    // Origin record lives in the OTHER barangay (becomes resident_id_1).
    $origin = Resident::factory()->create([
        'barangay_id' => $otherBarangay->id,
        'first_name' => 'Lorna',
        'last_name' => 'Mabini',
        'date_of_birth' => '1990-09-30',
    ]);
    $duplicates->scan($origin);

    $moved = Resident::factory()->create([
        'barangay_id' => $this->barangay->id,
        'first_name' => 'Lorna',
        'last_name' => 'Mabini',
        'date_of_birth' => '1990-09-30',
    ]);
    $duplicates->scan($moved);

    // Barangay 22 staff must see the incoming transfer even though the origin
    // record belongs to Barangay 23.
    $this->actingAs($this->staff)
        ->get('/duplicate-alerts')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('duplicate-alerts/index')
            ->where('counts.pending', 1));
});

it('rejects a resident record with invalid data', function () {
    $this->actingAs($this->staff)->post('/residents', [
        'first_name' => '',
        'last_name' => 'NoFirstName',
        'date_of_birth' => now()->addYear()->format('Y-m-d'), // future DOB
        'sex' => 'invalid',
        'civil_status' => 'married',
    ])->assertSessionHasErrors(['first_name', 'date_of_birth', 'sex']);
});
