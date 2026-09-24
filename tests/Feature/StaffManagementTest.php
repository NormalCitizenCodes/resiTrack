<?php

use App\Models\Barangay;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->barangay = Barangay::where('name', 'Barangay 22')->first();
    $this->otherBarangay = Barangay::where('name', 'Barangay 23')->first();

    $this->admin = User::factory()->create([
        'role' => User::ROLE_BARANGAY_ADMIN,
        'barangay_id' => $this->barangay->id,
    ]);

    $this->bhw = User::factory()->create([
        'role' => User::ROLE_BHW,
        'barangay_id' => $this->barangay->id,
    ]);

    $this->superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
});

it('lets a barangay admin view staff scoped to their own barangay', function () {
    User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->otherBarangay->id]);

    $this->actingAs($this->admin)
        ->get('/staff')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('staff/index')->has('staff.data', 2));
});

it('forbids bhw from the staff management page', function () {
    $this->actingAs($this->bhw)->get('/staff')->assertForbidden();
});

it('lets a super admin search and filter staff by barangay across the whole city', function () {
    User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->otherBarangay->id, 'name' => 'Someone Else']);

    $this->actingAs($this->superAdmin)
        ->get('/staff')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('staff/index')->has('staff.data', 3));

    $this->actingAs($this->superAdmin)
        ->get('/staff?barangay_id='.$this->otherBarangay->id)
        ->assertInertia(fn ($page) => $page->has('staff.data', 1)->where('staff.data.0.name', 'Someone Else'));

    $this->actingAs($this->superAdmin)
        ->get('/staff?search=Someone')
        ->assertInertia(fn ($page) => $page->has('staff.data', 1)->where('staff.data.0.name', 'Someone Else'));
});

it('paginates the staff list', function () {
    User::factory()->count(20)->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->barangay->id]);

    $this->actingAs($this->superAdmin)
        ->get('/staff')
        ->assertInertia(fn ($page) => $page->has('staff.data', 15)->where('staff.total', 22));
});

it('lets a barangay admin create a bhw account in their own barangay', function () {
    $this->actingAs($this->admin)->post('/staff', [
        'name' => 'New Worker',
        'email' => 'newbhw@resitrack.test',
        'password' => 'password123',
        'role' => 'bhw',
    ])->assertRedirect();

    $created = User::where('email', 'newbhw@resitrack.test')->first();

    expect($created)->not->toBeNull()
        ->and($created->role)->toBe('bhw')
        ->and($created->barangay_id)->toBe($this->barangay->id)
        ->and($created->is_active)->toBeTrue();
});

it('does not let a barangay admin create a peer admin account', function () {
    $this->actingAs($this->admin)->post('/staff', [
        'name' => 'Sneaky Admin',
        'email' => 'sneaky@resitrack.test',
        'password' => 'password123',
        'role' => 'barangay_admin',
    ])->assertSessionHasErrors('role');

    expect(User::where('email', 'sneaky@resitrack.test')->exists())->toBeFalse();
});

it('lets a super admin create a barangay admin for any barangay', function () {
    $this->actingAs($this->superAdmin)->post('/staff', [
        'name' => 'New Admin',
        'email' => 'newadmin@resitrack.test',
        'password' => 'password123',
        'role' => 'barangay_admin',
        'barangay_id' => $this->otherBarangay->id,
    ])->assertRedirect();

    $created = User::where('email', 'newadmin@resitrack.test')->first();

    expect($created->role)->toBe('barangay_admin')
        ->and($created->barangay_id)->toBe($this->otherBarangay->id);
});

it('forbids toggling a staff member from another barangay', function () {
    $otherStaff = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->otherBarangay->id]);

    $this->actingAs($this->admin)
        ->post("/staff/{$otherStaff->id}/toggle")
        ->assertForbidden();
});

it('blocks a barangay admin from deactivating their own account', function () {
    $this->actingAs($this->admin)->post("/staff/{$this->admin->id}/toggle")->assertRedirect();

    expect($this->admin->fresh()->is_active)->toBeTrue();
});

it('deactivating a staff account blocks their next login attempt', function () {
    $this->actingAs($this->admin)->post("/staff/{$this->bhw->id}/toggle")->assertRedirect();
    expect($this->bhw->fresh()->is_active)->toBeFalse();

    // Fortify's login route sits behind the `guest` middleware - still being
    // acting-as admin from the toggle request above would short-circuit it
    // before our authenticateUsing callback ever runs.
    $this->app['auth']->forgetGuards();

    $this->post('/login', [
        'email' => $this->bhw->email,
        'password' => 'password',
    ])->assertSessionHasErrors();

    $this->assertGuest();
});

it('logs out an already-authenticated user the moment their account is deactivated', function () {
    $this->actingAs($this->bhw);

    $this->get('/dashboard')->assertOk();

    $this->bhw->update(['is_active' => false]);

    $this->get('/dashboard')->assertRedirect('/login');
    $this->assertGuest();
});
