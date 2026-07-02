<?php

use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\Household;
use App\Models\Resident;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->barangay = Barangay::where('name', 'Barangay 22')->first();

    $this->staff = User::factory()->create([
        'role' => User::ROLE_BARANGAY_ADMIN,
        'barangay_id' => $this->barangay->id,
    ]);
});

it('lets barangay staff open the reports dashboard', function () {
    $this->actingAs($this->staff)
        ->get('/reports')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('reports/index')
            ->has('sectorSummary')
            ->has('auditSummary'));
});

it('forbids residents and partner agencies from reports', function () {
    $resident = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->barangay->id]);
    $agency = User::factory()->create(['role' => User::ROLE_PARTNER_AGENCY]);

    $this->actingAs($resident)->get('/reports')->assertForbidden();
    $this->actingAs($agency)->get('/reports')->assertForbidden();
});

it('writes an audit log entry when a resident is registered', function () {
    $this->actingAs($this->staff)->post('/residents', [
        'first_name' => 'Pedro',
        'last_name' => 'Reyes',
        'date_of_birth' => now()->subYears(40)->format('Y-m-d'),
        'sex' => 'male',
        'civil_status' => 'single',
    ])->assertRedirect();

    expect(AuditLog::where('action', 'create')->where('table_affected', 'residents')->count())->toBe(1);
});

it('counts the 4Ps households in the sector summary', function () {
    Household::factory()->count(3)->create(['barangay_id' => $this->barangay->id, 'is_4ps_beneficiary' => true]);
    Household::factory()->count(2)->create(['barangay_id' => $this->barangay->id, 'is_4ps_beneficiary' => false]);

    $summary = app(\App\Services\ReportStatsService::class)->sectorSummary($this->barangay->id);

    expect($summary['fourps_households'])->toBe(3);
});

it('exports a PDF sector dashboard and logs it', function () {
    $response = $this->actingAs($this->staff)->get('/reports/export/pdf');

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('application/pdf');
    expect(AuditLog::where('action', 'generated_report')->where('table_affected', 'sector_dashboard')->count())->toBe(1);
});

it('exports a resident-population CSV and logs it', function () {
    Resident::factory()->count(2)->create(['barangay_id' => $this->barangay->id]);

    $response = $this->actingAs($this->staff)->get('/reports/export/csv');

    $response->assertOk();
    expect($response->headers->get('content-type'))->toContain('text/csv');
    expect(AuditLog::where('action', 'generated_report')->where('table_affected', 'resident_population')->count())->toBe(1);
});

it('scopes report stats to the acting staff barangay', function () {
    // Residents in another barangay must not inflate this barangay's counts.
    $other = Barangay::where('name', 'Barangay 23')->first();
    Resident::factory()->count(4)->create(['barangay_id' => $other->id, 'registered_at' => now()]);
    Resident::factory()->count(2)->create(['barangay_id' => $this->barangay->id, 'registered_at' => now()]);

    $summary = app(\App\Services\ReportStatsService::class)->auditSummary($this->barangay->id);

    expect($summary['new_registrations'])->toBe(2);
});
