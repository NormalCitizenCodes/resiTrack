<?php

use App\Models\Barangay;
use App\Models\PartnerAgency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(Database\Seeders\ReferenceDataSeeder::class);
    $this->barangay22 = Barangay::where('name', 'Barangay 22')->firstOrFail();
    $this->barangay23 = Barangay::where('name', 'Barangay 23')->firstOrFail();
    $this->agency = PartnerAgency::create(['agency_name' => 'DSWD', 'agency_type' => 'National Government Agency', 'is_active' => true]);
    $this->admin22 = User::factory()->create(['role' => User::ROLE_BARANGAY_ADMIN, 'barangay_id' => $this->barangay22->id]);
    $this->admin23 = User::factory()->create(['role' => User::ROLE_BARANGAY_ADMIN, 'barangay_id' => $this->barangay23->id]);
    $this->bhw = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->barangay22->id]);
    $this->superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN, 'barangay_id' => null]);
});

it('allows a barangay admin to create an agency account only for their barangay', function () {
    $this->actingAs($this->admin22)->get('/partner-agencies')->assertOk()->assertInertia(fn ($page) => $page->where('assignedBarangay.name', 'Barangay 22'));

    $this->actingAs($this->admin22)->post('/partner-agency-accounts', [
        'name' => 'Juan Dela Cruz',
        'email' => 'dswd.b22@example.com',
        'password' => 'password123',
        'agency_id' => $this->agency->id,
    ])->assertRedirect();

    $account = User::where('email', 'dswd.b22@example.com')->firstOrFail();
    expect($account->role)->toBe(User::ROLE_PARTNER_AGENCY)->and($account->barangay_id)->toBe($this->barangay22->id)->and($account->agency_id)->toBe($this->agency->id);

    $this->actingAs($this->admin22)->post('/partner-agency-accounts', [
        'name' => 'Cross Barangay',
        'email' => 'cross@example.com',
        'password' => 'password123',
        'agency_id' => $this->agency->id,
        'barangay_id' => $this->barangay23->id,
    ])->assertSessionHasErrors('barangay_id');
});

it('keeps agency accounts isolated by barangay and denies BHW management', function () {
    $account23 = User::factory()->create(['role' => User::ROLE_PARTNER_AGENCY, 'agency_id' => $this->agency->id, 'barangay_id' => $this->barangay23->id]);

    $this->actingAs($this->admin22)->get('/partner-agencies')->assertInertia(fn ($page) => $page->has('accounts', 0));
    $this->actingAs($this->admin22)->post("/partner-agency-accounts/{$account23->id}/toggle")->assertForbidden();
    $this->actingAs($this->bhw)->get('/partner-agencies')->assertForbidden();
});

it('allows super admin to create agencies, assign accounts anywhere, and manage them', function () {
    $this->actingAs($this->superAdmin)->post('/partner-agencies', [
        'agency_name' => 'PhilHealth',
        'agency_type' => 'Government',
    ])->assertRedirect();
    $philhealth = PartnerAgency::where('agency_name', 'PhilHealth')->firstOrFail();

    $this->actingAs($this->superAdmin)->post('/partner-agency-accounts', [
        'name' => 'Agency Staff',
        'email' => 'agency.staff@example.com',
        'password' => 'password123',
        'agency_id' => $philhealth->id,
        'barangay_id' => $this->barangay23->id,
    ])->assertRedirect();
    $account = User::where('email', 'agency.staff@example.com')->firstOrFail();

    $this->actingAs($this->superAdmin)->post("/partner-agency-accounts/{$account->id}/toggle")->assertRedirect();
    expect($account->fresh()->is_active)->toBeFalse();
});

it('prevents duplicate agency account emails', function () {
    $existing = User::factory()->create(['email' => 'existing@example.com', 'role' => User::ROLE_PARTNER_AGENCY, 'agency_id' => $this->agency->id, 'barangay_id' => $this->barangay22->id]);

    $this->actingAs($this->admin22)->post('/partner-agency-accounts', [
        'name' => 'Duplicate',
        'email' => $existing->email,
        'password' => 'password123',
        'agency_id' => $this->agency->id,
    ])->assertSessionHasErrors('email');
});

it('prevents an agency account from managing another barangays program', function () {
    $account = User::factory()->create([
        'role' => User::ROLE_PARTNER_AGENCY,
        'agency_id' => $this->agency->id,
        'barangay_id' => $this->barangay22->id,
    ]);
    $program = App\Models\Program::create([
        'agency_id' => $this->agency->id,
        'barangay_id' => $this->barangay23->id,
        'posted_by' => $account->id,
        'title' => 'Barangay 23 Program',
        'slots_available' => 10,
        'slots_filled' => 0,
        'status' => 'active',
    ]);

    $this->actingAs($account)->get("/programs/{$program->id}/edit")->assertForbidden();
});
