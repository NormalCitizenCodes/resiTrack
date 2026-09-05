<?php

use App\Models\Barangay;
use App\Models\DuplicateAlert;
use App\Models\Resident;
use App\Models\User;
use App\Services\DuplicateDetectionService;
use App\Services\SectorClassificationService;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;

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

it('allows a BHW to update a resident contact number', function () {
    $resident = Resident::factory()->create([
        'barangay_id' => $this->barangay->id,
        'contact_number' => '09170000000',
    ]);

    $this->actingAs($this->staff)
        ->put("/residents/{$resident->id}", [
            'last_name' => $resident->last_name,
            'first_name' => $resident->first_name,
            'date_of_birth' => $resident->date_of_birth->format('Y-m-d'),
            'sex' => $resident->sex,
            'civil_status' => $resident->civil_status,
            'contact_number' => '09268890200',
        ])
        ->assertRedirect("/residents/{$resident->id}");

    expect($resident->fresh()->contact_number)->toBe('09268890200');
});

it('lets a BHW search pending accounts and complete official profiling without creating a second login', function () {
    $registration = User::factory()->create([
        'name' => 'Maria Santos',
        'email' => 'maria@example.com',
        'role' => User::ROLE_RESIDENT,
        'barangay_id' => $this->barangay->id,
        'registration_id' => 'REG-000321',
        'resident_id' => null,
        'password' => 'resident-secret',
    ]);

    $this->actingAs($this->staff)
        ->get('/resident-registrations?search=maria@example.com')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('resident-registrations/index')
            ->has('registrations', 1)
            ->where('registrations.0.email', 'maria@example.com'));

    $this->actingAs($this->staff)
        ->get("/resident-registrations/{$registration->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('resident-registrations/show'));

    $this->actingAs($this->staff)
        ->get("/residents/create?linked_user={$registration->id}")
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('residents/create')
            ->where('linkedAccount.id', $registration->id));

    $this->actingAs($this->staff)
        ->post('/residents', [
            'linked_user_id' => $registration->id,
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'date_of_birth' => now()->subYears(28)->format('Y-m-d'),
            'sex' => 'female',
            'civil_status' => 'single',
            'email' => 'maria@example.com',
        ])
        ->assertRedirect();

    $resident = Resident::where('email', 'maria@example.com')->firstOrFail();
    $year = now()->year;

    expect($resident->resident_id)->toBe(sprintf('RES-%d-%06d', $year, $resident->id))
        ->and($resident->profiled_by_user_id)->toBe($this->staff->id)
        ->and($resident->profiled_at)->not->toBeNull()
        ->and($registration->fresh()->resident_id)->toBe($resident->id)
        ->and(User::where('email', 'maria@example.com')->count())->toBe(1);

    $this->actingAs($this->staff)
        ->get('/resident-registrations')
        ->assertInertia(fn ($page) => $page->has('registrations', 0));

    Auth::logout();
    $this->flushSession();

    $this->post('/login', [
        'email' => $resident->resident_id,
        'password' => 'resident-secret',
    ])->assertRedirect();
    $this->assertAuthenticatedAs($registration);

    Auth::logout();
    $this->flushSession();

    $this->post('/login', [
        'email' => 'maria@example.com',
        'password' => 'resident-secret',
    ])->assertRedirect();
    $this->assertAuthenticatedAs($registration);
});

it('links a pending account when profiling uses the same email even if create account is checked', function () {
    $registration = User::factory()->create([
        'name' => 'Juan Dela Cruz',
        'email' => 'juan@email.com',
        'role' => User::ROLE_RESIDENT,
        'barangay_id' => $this->barangay->id,
        'registration_id' => 'REG-000400',
        'resident_id' => null,
        'password' => 'resident-secret',
    ]);

    $this->actingAs($this->staff)
        ->post('/residents', [
            'create_account' => true,
            'password' => 'unused-password',
            'password_confirmation' => 'unused-password',
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'date_of_birth' => now()->subYears(30)->format('Y-m-d'),
            'sex' => 'male',
            'civil_status' => 'single',
            'email' => 'juan@email.com',
        ])
        ->assertRedirect();

    expect(User::where('email', 'juan@email.com')->count())->toBe(1)
        ->and($registration->fresh()->resident_id)->not->toBeNull();
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

it('creates an optional resident portal account with a generated resident ID', function () {
    $this->actingAs($this->staff)->post('/residents', [
        'first_name' => 'Ana',
        'last_name' => 'Reyes',
        'date_of_birth' => now()->subYears(30)->format('Y-m-d'),
        'sex' => 'female',
        'civil_status' => 'single',
        'create_account' => true,
        'password' => 'resident-secret',
        'password_confirmation' => 'resident-secret',
    ])->assertRedirect();

    $resident = Resident::where('last_name', 'Reyes')->firstOrFail();
    $account = User::where('resident_id', $resident->id)->firstOrFail();

    expect($resident->resident_id)->toBe('RES-'.now()->year.'-'.str_pad((string) $resident->id, 6, '0', STR_PAD_LEFT))
        ->and($account->email)->toBeNull()
        ->and(password_verify('resident-secret', $account->password))->toBeTrue()
        ->and(User::whereHas('resident', fn ($query) => $query->where('resident_id', $resident->resident_id))->whereKey($account->id)->exists())->toBeTrue();

    Auth::logout();
    $this->flushSession();
    $this->post('/login', [
        'email' => $resident->resident_id,
        'password' => 'resident-secret',
    ])->assertRedirect();

    $this->assertAuthenticatedAs($account);
});

it('allows staff to deactivate and restore a resident record', function () {
    $resident = Resident::factory()->create(['barangay_id' => $this->barangay->id, 'is_active' => true]);
    $admin = User::factory()->create([
        'role' => User::ROLE_BARANGAY_ADMIN,
        'barangay_id' => $this->barangay->id,
    ]);

    $this->actingAs($admin)
        ->post("/residents/{$resident->id}/toggle")
        ->assertRedirect();
    expect($resident->fresh()->is_active)->toBeFalse();

    $this->actingAs($admin)
        ->post("/residents/{$resident->id}/toggle")
        ->assertRedirect();
    expect($resident->fresh()->is_active)->toBeTrue();
});

it('prevents BHWs from changing resident status', function () {
    $resident = Resident::factory()->create(['barangay_id' => $this->barangay->id, 'is_active' => true]);

    $this->actingAs($this->staff)
        ->post("/residents/{$resident->id}/toggle")
        ->assertForbidden();

    expect($resident->fresh()->is_active)->toBeTrue();
});

it('restricts permanent resident deletion to Super Admins', function () {
    $resident = Resident::factory()->create(['barangay_id' => $this->barangay->id]);
    $inactiveResident = Resident::factory()->create([
        'barangay_id' => $this->barangay->id,
        'is_active' => false,
    ]);
    $admin = User::factory()->create([
        'role' => User::ROLE_BARANGAY_ADMIN,
        'barangay_id' => $this->barangay->id,
    ]);

    $this->actingAs($admin)
        ->delete("/residents/{$resident->id}/permanent")
        ->assertForbidden();

    $superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
    $this->actingAs($superAdmin)
        ->delete("/residents/{$resident->id}/permanent")
        ->assertRedirect();

    expect(Resident::find($resident->id))->toBeNull();

    $this->actingAs($superAdmin)
        ->delete("/residents/{$inactiveResident->id}/permanent")
        ->assertRedirect();

    expect(Resident::find($inactiveResident->id))->toBeNull();
});

it('filters resident records by active status', function () {
    $active = Resident::factory()->create(['barangay_id' => $this->barangay->id, 'is_active' => true]);
    $inactive = Resident::factory()->create(['barangay_id' => $this->barangay->id, 'is_active' => false]);

    $this->actingAs($this->staff)
        ->get('/residents?status=active')
        ->assertInertia(fn ($page) => $page->where('residents.data.0.id', $active->id));

    $this->actingAs($this->staff)
        ->get('/residents?status=inactive')
        ->assertInertia(fn ($page) => $page->where('residents.data.0.id', $inactive->id));
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
