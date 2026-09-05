<?php

use App\Models\AccountReactivationRequest;
use App\Models\AppNotification;
use App\Models\Barangay;
use App\Models\Resident;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(Database\Seeders\ReferenceDataSeeder::class);
    $this->barangay22 = Barangay::where('name', 'Barangay 22')->firstOrFail();
    $this->barangay23 = Barangay::where('name', 'Barangay 23')->firstOrFail();
    $this->residentRecord = Resident::factory()->create([
        'barangay_id' => $this->barangay22->id,
        'resident_id' => 'RES-2026-000901',
        'first_name' => 'Juan',
        'last_name' => 'Dela Cruz',
    ]);
    $this->resident = User::factory()->create([
        'name' => 'Juan Dela Cruz',
        'email' => 'juan@example.com',
        'password' => Hash::make('password'),
        'role' => User::ROLE_RESIDENT,
        'barangay_id' => $this->barangay22->id,
        'resident_id' => $this->residentRecord->id,
        'is_active' => false,
    ]);
    $this->admin = User::factory()->create(['role' => User::ROLE_BARANGAY_ADMIN, 'barangay_id' => $this->barangay22->id]);
    $this->otherAdmin = User::factory()->create(['role' => User::ROLE_BARANGAY_ADMIN, 'barangay_id' => $this->barangay23->id]);
    $this->bhw = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->barangay22->id]);
});

it('allows an inactive resident to submit one reactivation request', function () {
    $this->get('/account-reactivation/request?identifier=juan@example.com')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('account.name', 'Juan Dela Cruz')->where('account.barangay', 'Barangay 22'));

    $this->post('/account-reactivation/request', [
        'identifier' => 'juan@example.com',
        'reason' => 'I believe my account was deactivated by mistake.',
    ])->assertRedirect();

    expect(AccountReactivationRequest::count())->toBe(1)
        ->and(AppNotification::where('type', 'account_reactivation')->where('user_id', $this->admin->id)->exists())->toBeTrue();

    $this->post('/account-reactivation/request', [
        'identifier' => 'juan@example.com',
        'reason' => 'Please review again.',
    ])->assertSessionHas('error');

    expect(AccountReactivationRequest::count())->toBe(1);
});

it('scopes reactivation requests and approval to the assigned barangay', function () {
    $request = AccountReactivationRequest::create([
        'user_id' => $this->resident->id,
        'resident_id' => $this->residentRecord->id,
        'barangay_id' => $this->barangay22->id,
        'reason' => 'Please restore access.',
    ]);

    $this->actingAs($this->otherAdmin)->get('/account-reactivation-requests')->assertInertia(fn ($page) => $page->has('requests', 0));
    $this->actingAs($this->otherAdmin)->post("/account-reactivation-requests/{$request->id}/approve", ['admin_remarks' => 'Wrong barangay'])->assertForbidden();
    $this->actingAs($this->bhw)->post("/account-reactivation-requests/{$request->id}/approve", ['admin_remarks' => 'Not authorized'])->assertForbidden();
});

it('does not let residents reactivate themselves or BHWs approve requests', function () {
    $request = AccountReactivationRequest::create([
        'user_id' => $this->resident->id,
        'resident_id' => $this->residentRecord->id,
        'barangay_id' => $this->barangay22->id,
        'reason' => 'Please restore access.',
    ]);

    $this->actingAs($this->resident)->post("/account-reactivation-requests/{$request->id}/approve")->assertRedirect();
    $this->actingAs($this->bhw)->get('/account-reactivation-requests')->assertForbidden();
});

it('allows a super admin to review requests across barangays', function () {
    $superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN, 'barangay_id' => null]);
    $request = AccountReactivationRequest::create([
        'user_id' => $this->resident->id,
        'resident_id' => $this->residentRecord->id,
        'barangay_id' => $this->barangay22->id,
        'reason' => 'Please restore access.',
    ]);

    $this->actingAs($superAdmin)->get('/account-reactivation-requests')->assertInertia(fn ($page) => $page->has('requests', 1));
    $this->actingAs($superAdmin)->post("/account-reactivation-requests/{$request->id}/approve", ['admin_remarks' => 'Verified.'])->assertRedirect();
    expect($this->resident->fresh()->is_active)->toBeTrue();
});

it('lets the assigned admin approve and notify reactivation without recreating the account', function () {
    $request = AccountReactivationRequest::create([
        'user_id' => $this->resident->id,
        'resident_id' => $this->residentRecord->id,
        'barangay_id' => $this->barangay22->id,
        'reason' => 'Please restore access.',
    ]);
    $originalUserId = $this->resident->id;
    $originalResidentId = $this->residentRecord->id;

    $this->actingAs($this->admin)->post("/account-reactivation-requests/{$request->id}/approve", ['admin_remarks' => 'Identity verified at Barangay Hall.'])->assertRedirect();

    expect($this->resident->fresh()->is_active)->toBeTrue()
        ->and($this->resident->fresh()->id)->toBe($originalUserId)
        ->and($this->residentRecord->fresh()->id)->toBe($originalResidentId)
        ->and($request->fresh()->status)->toBe(AccountReactivationRequest::STATUS_APPROVED)
        ->and(AppNotification::where('user_id', $this->resident->id)->where('type', 'account_reactivation')->exists())->toBeTrue();

    auth()->logout();
    $this->post('/login', ['email' => 'juan@example.com', 'password' => 'password'])->assertRedirect();
    $this->assertAuthenticatedAs($this->resident->fresh());
});

it('keeps the account deactivated when an admin rejects the request', function () {
    $request = AccountReactivationRequest::create([
        'user_id' => $this->resident->id,
        'resident_id' => $this->residentRecord->id,
        'barangay_id' => $this->barangay22->id,
        'reason' => 'Please restore access.',
    ]);

    $this->actingAs($this->admin)->post("/account-reactivation-requests/{$request->id}/reject", ['admin_remarks' => 'Identity could not be verified.'])->assertRedirect();

    expect($this->resident->fresh()->is_active)->toBeFalse()
        ->and($request->fresh()->status)->toBe(AccountReactivationRequest::STATUS_REJECTED);
});
