<?php

use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\Resident;
use App\Models\User;
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

    $this->resident = Resident::factory()->create([
        'barangay_id' => $this->barangay->id,
        'date_of_birth' => now()->subYears(20)->format('Y-m-d'),
        'education_status' => 'enrolled',
    ]);

    $this->residentUser = User::factory()->create([
        'role' => User::ROLE_RESIDENT,
        'barangay_id' => $this->barangay->id,
        'resident_id' => $this->resident->id,
    ]);
});

it('gives residents a feed-style dashboard instead of the staff stats dashboard', function () {
    $this->actingAs($this->residentUser)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard-resident')
            ->has('completeness')
            ->has('sectors')
            ->has('feed')
            ->has('recentApplications'));
});

it('still gives barangay staff the aggregate stats dashboard', function () {
    $this->actingAs($this->staff)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('dashboard'));
});

it('handles a resident-role user with no linked resident record without crashing', function () {
    $unlinked = User::factory()->create([
        'role' => User::ROLE_RESIDENT,
        'barangay_id' => $this->barangay->id,
        'resident_id' => null,
    ]);

    $this->actingAs($unlinked)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('dashboard-resident')->where('resident', null));
});

it('shows a verified resident their official resident ID after profiling', function () {
    $this->actingAs($this->residentUser)
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('dashboard-resident')
            ->where('resident.resident_id', $this->resident->resident_id));
});

it('computes profile completeness from filled contact/socio-economic fields', function () {
    $this->resident->update([
        'contact_number' => '09171234567',
        'email' => 'a@example.com',
        'address' => null,
        'civil_status' => 'single',
        'occupation' => null,
        'employment_status' => null,
        'education_level' => null,
        'education_status' => null,
        'monthly_income' => null,
    ]);

    $this->actingAs($this->residentUser)
        ->get('/dashboard')
        ->assertInertia(fn ($page) => $page->where('completeness.percent', 33));
});

it('lets a resident update their own profile and re-runs sector classification', function () {
    expect($this->resident->sectors->pluck('code'))->not->toContain('OSY');

    $this->actingAs($this->residentUser)
        ->put('/my-profile', ['education_status' => 'not_enrolled'])
        ->assertRedirect();

    expect($this->resident->fresh()->sectors->pluck('code'))->toContain('OSY')
        ->and(AuditLog::where('table_affected', 'residents')->latest()->first()->new_value)
        ->toContain('self_service');
});

it('does not let self-service edits touch certified flags or identity fields', function () {
    $this->actingAs($this->residentUser)->put('/my-profile', [
        'is_pwd' => true,
        'first_name' => 'Hacked',
    ])->assertRedirect();

    $fresh = $this->resident->fresh();
    expect($fresh->is_pwd)->toBeFalse()
        ->and($fresh->first_name)->not->toBe('Hacked');
});

it('404s a my-profile update for a user with no linked resident', function () {
    $unlinked = User::factory()->create([
        'role' => User::ROLE_RESIDENT,
        'barangay_id' => $this->barangay->id,
        'resident_id' => null,
    ]);

    $this->actingAs($unlinked)
        ->put('/my-profile', ['address' => 'Somewhere'])
        ->assertNotFound();
});
