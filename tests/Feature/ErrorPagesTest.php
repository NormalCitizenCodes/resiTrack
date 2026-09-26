<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Barangay;
use App\Models\Resident;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->own = Barangay::where('name', 'Barangay 22')->first();
    $this->other = Barangay::where('name', 'Barangay 21')->first();
    $this->admin = User::factory()->create(['role' => User::ROLE_BARANGAY_ADMIN, 'barangay_id' => $this->own->id]);
});

it('shows the branded page for a page that does not exist, with no internal details', function () {
    $this->get('/definitely-not-a-page')
        ->assertNotFound()
        ->assertInertia(fn ($page) => $page->component('error')->where('status', 404)->where('detail', null));

    // A missing record must not leak the model name that Laravel puts in its own message.
    $this->actingAs($this->admin)->get('/residents/999999')
        ->assertNotFound()
        ->assertInertia(fn ($page) => $page->component('error')->where('status', 404)->where('detail', null));
});

it('shows the branded page for a 403 together with the reason we gave', function () {
    $resident = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->own->id]);

    $this->actingAs($resident)->get('/residents')
        ->assertForbidden()
        ->assertInertia(fn ($page) => $page->component('error')->where('status', 403)->where('detail', 'You do not have permission to access this page.'));

    $elsewhere = Resident::factory()->create(['barangay_id' => $this->other->id]);

    $this->actingAs($this->admin)->get("/residents/{$elsewhere->id}")
        ->assertForbidden()
        ->assertInertia(fn ($page) => $page->component('error')->where('status', 403)->where('detail', 'This resident belongs to another barangay.'));
});

it('leaves JSON requests as JSON', function () {
    $this->actingAs($this->admin)->getJson('/residents/999999')->assertNotFound()->assertJsonStructure(['message']);
});

it('answers an Inertia request with the branded page too, so it replaces the raw error box', function () {
    $elsewhere = Resident::factory()->create(['barangay_id' => $this->other->id]);

    $this->actingAs($this->admin)
        ->withHeaders(['X-Inertia' => 'true', 'X-Requested-With' => 'XMLHttpRequest', 'X-Inertia-Version' => (string) app(HandleInertiaRequests::class)->version(Request::create('/'))])
        ->get("/residents/{$elsewhere->id}")
        ->assertForbidden()
        ->assertHeader('X-Inertia', 'true')
        ->assertJsonPath('component', 'error')
        ->assertJsonPath('props.status', 403);
});
