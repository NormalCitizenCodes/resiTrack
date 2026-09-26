<?php

use App\Models\Barangay;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->staff = User::factory()->create([
        'role' => User::ROLE_BARANGAY_ADMIN,
        'barangay_id' => Barangay::first()->id,
    ]);
});

it('sends someone to their dashboard after login by default', function () {
    $this->post('/login', ['email' => $this->staff->email, 'password' => 'password'])
        ->assertRedirect('/dashboard');
});

it('takes someone back to the page they were sent away from when a real visit hit the login wall', function () {
    $this->get('/help')->assertRedirect('/login');

    $this->post('/login', ['email' => $this->staff->email, 'password' => 'password'])
        ->assertRedirect('/help');
});

it('does not remember a page the browser only pre-loaded while nobody was signed in', function () {
    // Inertia sends Purpose: prefetch when a link is hovered, for example the Help link
    // that the pointer rests on right after the account menu's Log out is clicked.
    $this->withHeaders(['Purpose' => 'prefetch', 'X-Inertia' => 'true'])->get('/help')->assertRedirect('/login');

    $this->post('/login', ['email' => $this->staff->email, 'password' => 'password'])
        ->assertRedirect('/dashboard');
});

it('lands on the dashboard after logging out and back in again', function () {
    $this->actingAs($this->staff)->post('/logout');
    $this->withHeaders(['Purpose' => 'prefetch'])->get('/help');

    $this->post('/login', ['email' => $this->staff->email, 'password' => 'password'])
        ->assertRedirect('/dashboard');
});
