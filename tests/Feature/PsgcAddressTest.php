<?php

use App\Models\Barangay;
use App\Models\Household;
use App\Models\PsgcLocation;
use App\Models\Resident;
use App\Models\User;
use App\Services\PsgcAddress;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->barangay = Barangay::where('name', 'Barangay 22')->first();
    $this->staff = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->barangay->id]);

    // A tiny stand-in for the real PSGC tree (the full 43,000 rows would slow every test).
    foreach ([
        ['100000000', 'Region X (Northern Mindanao)', 'r', null],
        ['104300000', 'Misamis Oriental', 'p', '100000000'],
        ['104305000', 'City of Cagayan De Oro', 'c', '104300000'],
        ['104305022', 'Barangay 22 (Pob.)', 'b', '104305000'],
        ['104306000', 'City of El Salvador', 'c', '104300000'],
        ['104306001', 'Amoros', 'b', '104306000'],
        ['130000000', 'National Capital Region (NCR)', 'r', null],
        ['133900000', 'City of Manila', 'c', '130000000'],
    ] as [$code, $name, $level, $parent]) {
        PsgcLocation::create(['code' => $code, 'name' => $name, 'level' => $level, 'parent_code' => $parent]);
    }

    $this->cdo = ['region' => '100000000', 'province' => '104300000', 'city' => '104305000', 'barangay' => '104305022'];
});

function residentPayload(array $overrides = []): array
{
    return array_merge([
        'last_name' => 'Dela Cruz',
        'first_name' => 'Juan',
        'date_of_birth' => '1990-05-05',
        'sex' => 'male',
        'civil_status' => 'single',
    ], $overrides);
}

it('serves the address lists only to signed-in users', function () {
    $this->get('/psgc/regions')->assertRedirect('/login');

    $this->actingAs($this->staff)->get('/psgc/regions')
        ->assertOk()
        ->assertJsonCount(2)
        ->assertJsonPath('0.name', 'Region X (Northern Mindanao)');

    $this->actingAs($this->staff)->get('/psgc/104300000/children')
        ->assertOk()
        ->assertJsonCount(2)
        ->assertJsonPath('0.level', 'c');

    // Cities with no province hang straight off their region.
    $this->actingAs($this->staff)->get('/psgc/130000000/children')
        ->assertOk()
        ->assertJsonPath('0.name', 'City of Manila');

    $this->actingAs($this->staff)->get('/psgc/not-a-code/children')->assertNotFound();
});

it('stores a picked address as codes and builds the readable line on the server', function () {
    $this->actingAs($this->staff)->post('/residents', residentPayload([
        'address_region_code' => '100000000',
        'address_province_code' => '104300000',
        'address_city_code' => '104305000',
        'address_barangay_code' => '104305022',
        'address_street' => 'Purok 3, Rizal St',
        'address_zip' => '9000',
        // A hand-typed line must not win over the picked places.
        'address' => 'something the browser made up',
        'birth_region_code' => '130000000',
        'birth_city_code' => '133900000',
    ]))->assertSessionHasNoErrors();

    $resident = Resident::where('last_name', 'Dela Cruz')->firstOrFail();

    expect($resident->address)->toBe('Purok 3, Rizal St, Barangay 22 (Pob.), City of Cagayan De Oro, Misamis Oriental, 9000')
        ->and($resident->address_barangay_code)->toBe('104305022')
        ->and($resident->address_zip)->toBe('9000')
        ->and($resident->place_of_birth)->toBe('City of Manila, National Capital Region (NCR)')
        ->and($resident->birth_city_code)->toBe('133900000');
});

it('rejects an address whose places do not belong together', function () {
    $this->actingAs($this->staff)->post('/residents', residentPayload([
        'address_region_code' => '100000000',
        'address_province_code' => '104300000',
        'address_city_code' => '104305000',
        // Amoros is a barangay of El Salvador, not of Cagayan de Oro.
        'address_barangay_code' => '104306001',
    ]))->assertSessionHasErrors('address_city_code');

    expect(Resident::where('last_name', 'Dela Cruz')->exists())->toBeFalse();
});

it('rejects an incomplete pick and unknown codes', function () {
    $this->actingAs($this->staff)->post('/residents', residentPayload([
        'address_region_code' => '100000000',
        'address_city_code' => '104305000',
    ]))->assertSessionHasErrors('address_city_code');

    $this->actingAs($this->staff)->post('/residents', residentPayload([
        'birth_region_code' => '100000000',
        'birth_city_code' => '999999999',
    ]))->assertSessionHasErrors('birth_city_code');
});

it('still accepts a plain typed address when nothing was picked', function () {
    $this->actingAs($this->staff)->post('/residents', residentPayload(['address' => 'Purok 1, old style']))
        ->assertSessionHasNoErrors();

    expect(Resident::where('last_name', 'Dela Cruz')->value('address'))->toBe('Purok 1, old style');
});

it('takes a household address from the picker or from typed text, but needs one of them', function () {
    $this->actingAs($this->staff)->post('/households', [])->assertSessionHasErrors('address');

    $this->actingAs($this->staff)->post('/households', [
        'address_region_code' => '100000000',
        'address_province_code' => '104300000',
        'address_city_code' => '104305000',
        'address_barangay_code' => '104305022',
        'address_street' => 'Block 4',
    ])->assertSessionHasNoErrors();

    expect(Household::latest('id')->first()->address)->toBe('Block 4, Barangay 22 (Pob.), City of Cagayan De Oro, Misamis Oriental');
});

it('starts the picker on the staff member\'s own barangay when it is linked', function () {
    $this->barangay->update(['psgc_code' => '104305022']);

    expect(app(PsgcAddress::class)->defaultsFor($this->barangay->fresh()))->toBe($this->cdo);

    $this->actingAs($this->staff)->get('/residents/create')
        ->assertInertia(fn ($page) => $page->where('addressDefaults', $this->cdo));

    expect(app(PsgcAddress::class)->defaultsFor(Barangay::where('name', 'Barangay 23')->first()))->toBeNull();
});

it('imports the full PSGC file and links the pilot barangays', function () {
    PsgcLocation::query()->delete();

    $this->artisan('psgc:import')->assertSuccessful();

    expect(PsgcLocation::count())->toBeGreaterThan(43000)
        ->and(PsgcLocation::where('level', 'r')->count())->toBe(17)
        ->and($this->barangay->fresh()->psgc_code)->not->toBeNull()
        ->and(PsgcLocation::find($this->barangay->fresh()->psgc_code)->name)->toStartWith('Barangay 22');

    // Running it again on a full table is a no-op when asked to be.
    $this->artisan('psgc:import --if-empty')->assertSuccessful();
});
