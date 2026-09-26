<?php

use App\Models\Barangay;
use App\Models\Resident;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->b22 = Barangay::where('name', 'Barangay 22')->first();
    $this->b22->update(['psgc_code' => '104305018']);
    $this->b21 = Barangay::where('name', 'Barangay 21')->first();
    $this->b21->update(['psgc_code' => '104305017']);
});

it('builds the ID from the barangay code, the year and a running number', function () {
    $first = Resident::factory()->create(['barangay_id' => $this->b22->id, 'registered_at' => Carbon::create(2026, 3, 1)]);
    $second = Resident::factory()->create(['barangay_id' => $this->b22->id, 'registered_at' => Carbon::create(2026, 3, 2)]);

    expect($first->resident_id)->toBe('RES0182600001')
        ->and($second->resident_id)->toBe('RES0182600002');
});

it('counts each barangay on its own', function () {
    Resident::factory()->count(3)->create(['barangay_id' => $this->b22->id, 'registered_at' => Carbon::create(2026, 3, 1)]);
    $other = Resident::factory()->create(['barangay_id' => $this->b21->id, 'registered_at' => Carbon::create(2026, 3, 1)]);

    expect($other->resident_id)->toBe('RES0172600001');
});

it('keeps counting when the year changes', function () {
    Resident::factory()->count(2)->create(['barangay_id' => $this->b22->id, 'registered_at' => Carbon::create(2026, 12, 30)]);
    $next = Resident::factory()->create(['barangay_id' => $this->b22->id, 'registered_at' => Carbon::create(2027, 1, 2)]);

    expect($next->resident_id)->toBe('RES0182700003');
});

it('never gives two residents the same ID', function () {
    Resident::factory()->count(12)->create(['barangay_id' => $this->b22->id]);

    $ids = Resident::pluck('resident_id');

    expect($ids->unique())->toHaveCount($ids->count())
        ->and($ids->every(fn ($id) => strlen($id) === 13))->toBeTrue();
});

it('shows the ID spaced for reading and reads any spelling of it back', function () {
    expect(Resident::formatOfficialId('RES0182600045'))->toBe('RES 018 26 00045')
        ->and(Resident::formatOfficialId('RES-2026-000123'))->toBe('RES-2026-000123')
        ->and(Resident::formatOfficialId(null))->toBeNull()
        ->and(Resident::normalizeOfficialId('res 018 26 00045'))->toBe('RES0182600045')
        ->and(Resident::normalizeOfficialId('RES-018-26-00045'))->toBe('RES0182600045');
});

it('lets a resident log in with the ID typed compact, spaced, hyphenated or lowercase', function (string $typed) {
    $resident = Resident::factory()->create(['barangay_id' => $this->b22->id, 'registered_at' => Carbon::create(2026, 3, 1)]);
    $user = User::factory()->create(['role' => User::ROLE_RESIDENT, 'resident_id' => $resident->id, 'barangay_id' => $this->b22->id]);

    $this->post(route('login.store'), ['email' => $typed, 'password' => 'password']);

    $this->assertAuthenticatedAs($user);
})->with(['RES0182600001', 'RES 018 26 00001', 'RES-018-26-00001', 'res0182600001']);

it('finds a resident in the staff list by a spaced ID', function () {
    $resident = Resident::factory()->create(['barangay_id' => $this->b22->id, 'registered_at' => Carbon::create(2026, 3, 1)]);
    Resident::factory()->create(['barangay_id' => $this->b22->id, 'registered_at' => Carbon::create(2026, 3, 1)]);
    $staff = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->b22->id]);

    $this->actingAs($staff)
        ->get('/residents?search='.urlencode('RES 018 26 00001'))
        ->assertInertia(fn ($page) => $page->has('residents.data', 1)->where('residents.data.0.id', $resident->id));
});

it('opens the QR check for a signed ID, even when the link spells it with spaces', function () {
    $resident = Resident::factory()->create(['barangay_id' => $this->b22->id, 'registered_at' => Carbon::create(2026, 3, 1)]);
    $staff = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->b22->id]);
    $signature = Resident::idSignature($resident->resident_id);

    $this->actingAs($staff)
        ->get('/verify/'.rawurlencode('RES 018 26 00001').'?s='.$signature)
        ->assertInertia(fn ($page) => $page->where('result.id', $resident->id));

    $this->actingAs($staff)
        ->get('/verify/RES0182600001?s=0000000000000000')
        ->assertInertia(fn ($page) => $page->where('result', null));
});

it('converts old-style IDs to the new format in registration order, per barangay', function () {
    $a = Resident::factory()->create(['barangay_id' => $this->b22->id, 'registered_at' => Carbon::create(2026, 3, 1)]);
    $b = Resident::factory()->create(['barangay_id' => $this->b21->id, 'registered_at' => Carbon::create(2026, 4, 1)]);
    $c = Resident::factory()->create(['barangay_id' => $this->b22->id, 'registered_at' => Carbon::create(2025, 12, 5)]);

    Resident::whereKey($a->id)->update(['resident_id' => 'RES-2026-000101']);
    Resident::whereKey($b->id)->update(['resident_id' => 'RES-2026-000102']);
    Resident::whereKey($c->id)->update(['resident_id' => 'RES-2025-000103']);

    (require database_path('migrations/2026_09_28_000001_convert_resident_ids_to_barangay_format.php'))->up();

    expect($a->fresh()->resident_id)->toBe('RES0182600001')
        ->and($b->fresh()->resident_id)->toBe('RES0172600001')
        ->and($c->fresh()->resident_id)->toBe('RES0182500002');
});
