<?php

use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\PartnerAgency;
use App\Models\PasswordRecoveryRequest;
use App\Models\Program;
use App\Models\Resident;
use App\Models\User;
use App\Services\AuditLogger;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->own = Barangay::where('name', 'Barangay 22')->first();
    $this->other = Barangay::where('name', 'Barangay 23')->first();

    $this->admin = User::factory()->create(['role' => User::ROLE_BARANGAY_ADMIN, 'barangay_id' => $this->own->id, 'name' => 'Ana Admin']);
    $this->bhwOne = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->own->id, 'name' => 'Maria BHW']);
    $this->bhwTwo = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->own->id, 'name' => 'Pedro BHW']);
    $this->outsider = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->other->id, 'name' => 'Other BHW']);
    $this->superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN, 'barangay_id' => null]);
});

function logAs(User $user, string $action, string $table, ?int $recordId = null, ?array $new = null): void
{
    AuditLogger::record($action, $table, $recordId, null, $new, $user->id);
}

function entryTexts($response): array
{
    return collect($response->viewData('page')['props']['entries']['data'])
        ->map(fn ($e) => ($e['actor']['name'] ?? '?').': '.$e['summary'].($e['subject'] ? ' '.$e['subject'] : ''))
        ->all();
}

it('tells each BHW apart and shows a barangay admin only their own barangay', function () {
    logAs($this->bhwOne, 'create', 'residents', 1, ['name' => 'Juan Dela Cruz']);
    logAs($this->bhwTwo, 'create', 'households', 2, ['household_number' => 'HH-7']);
    logAs($this->outsider, 'create', 'residents', 3, ['name' => 'Someone Else']);

    $texts = entryTexts($this->actingAs($this->admin)->get('/activity-log')->assertOk());

    expect($texts)->toContain('Maria BHW: Registered resident Juan Dela Cruz')
        ->toContain('Pedro BHW: Registered household HH-7')
        ->not->toContain('Other BHW: Registered resident Someone Else');
});

it('filters by person and by kind of activity', function () {
    logAs($this->bhwOne, 'create', 'residents', 1, ['name' => 'Juan']);
    logAs($this->bhwTwo, 'create', 'residents', 2, ['name' => 'Pedro Kid']);
    logAs($this->bhwOne, 'login', 'users', $this->bhwOne->id);

    expect(entryTexts($this->actingAs($this->admin)->get('/activity-log?who='.$this->bhwOne->id)))
        ->toHaveCount(2)
        ->each->toStartWith('Maria BHW');

    expect(entryTexts($this->actingAs($this->admin)->get('/activity-log?category=signins')))
        ->toBe(['Maria BHW: Signed in']);
});

it('ignores a person filter pointing at another barangay', function () {
    logAs($this->outsider, 'create', 'residents', 3, ['name' => 'Someone Else']);

    expect(entryTexts($this->actingAs($this->admin)->get('/activity-log?who='.$this->outsider->id)))->toBe([]);
});

it('summarises each staff member\'s last 30 days and last sign-in', function () {
    logAs($this->bhwOne, 'create', 'residents', 1, ['name' => 'Juan']);
    logAs($this->bhwOne, 'update', 'residents', 1, ['name' => 'Juan']);
    logAs($this->bhwOne, 'login', 'users', $this->bhwOne->id);

    $summary = collect($this->actingAs($this->admin)->get('/activity-log')->viewData('page')['props']['staffSummary'])->keyBy('name');

    expect($summary['Maria BHW']['actions'])->toBe(2)
        ->and($summary['Maria BHW']['last_sign_in'])->not->toBeNull()
        ->and($summary['Pedro BHW']['actions'])->toBe(0)
        ->and($summary['Pedro BHW']['last_sign_in'])->toBeNull()
        ->and($summary->has('Other BHW'))->toBeFalse();
});

it('lets the super admin see every barangay or narrow to one', function () {
    logAs($this->bhwOne, 'create', 'residents', 1, ['name' => 'Juan']);
    logAs($this->outsider, 'create', 'residents', 3, ['name' => 'Someone Else']);

    expect(entryTexts($this->actingAs($this->superAdmin)->get('/activity-log')))->toHaveCount(2);
    expect(entryTexts($this->actingAs($this->superAdmin)->get('/activity-log?barangay='.$this->other->id)))
        ->toBe(['Other BHW: Registered resident Someone Else']);
});

it('is only for admins', function () {
    $resident = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->own->id]);
    $agency = User::factory()->create(['role' => User::ROLE_PARTNER_AGENCY, 'agency_id' => PartnerAgency::first()->id, 'barangay_id' => $this->own->id]);

    // Guest first: actingAs() below keeps the user signed in for the rest of the test.
    $this->get('/activity-log')->assertRedirect('/login');

    foreach ([$this->bhwOne, $resident, $agency] as $user) {
        $this->actingAs($user)->get('/activity-log')->assertForbidden();
    }
});

// --- The gaps that were not logged before ----------------------------------

it('records a sign-in against the person who signed in', function () {
    $this->post('/login', ['email' => $this->bhwOne->email, 'password' => 'password']);

    expect(AuditLog::where('action', 'login')->where('user_id', $this->bhwOne->id)->exists())->toBeTrue();
});

it('records a permanent resident deletion with the name, before it is gone', function () {
    $resident = Resident::factory()->create(['barangay_id' => $this->own->id, 'first_name' => 'Gone', 'last_name' => 'Forever']);

    $this->actingAs($this->superAdmin)->delete("/residents/{$resident->id}/permanent")->assertRedirect();

    $log = AuditLog::where('action', 'force_delete')->first();
    expect($log->user_id)->toBe($this->superAdmin->id)
        ->and(json_decode($log->old_value, true)['name'])->toContain('Gone');
});

it('records a BHW handling a password recovery', function () {
    $resident = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->own->id, 'name' => 'Lola Nena']);
    $request = PasswordRecoveryRequest::create([
        'user_id' => $resident->id,
        'barangay_id' => $this->own->id,
        'status' => PasswordRecoveryRequest::STATUS_PENDING,
    ]);

    $this->actingAs($this->bhwOne)->post("/account-recovery/{$request->id}/approve")->assertRedirect();

    expect(AuditLog::where('action', 'approve')->where('table_affected', 'password_recovery_requests')->where('user_id', $this->bhwOne->id)->exists())->toBeTrue();
});

it('records programs being published, edited and deleted, and announcements being deleted', function () {
    $agencyUser = User::factory()->create(['role' => User::ROLE_PARTNER_AGENCY, 'agency_id' => PartnerAgency::first()->id, 'barangay_id' => null]);
    $program = Program::create(['agency_id' => $agencyUser->agency_id, 'title' => 'Rice Aid', 'status' => 'active', 'slots_available' => 5]);

    $this->actingAs($agencyUser)->delete("/programs/{$program->id}")->assertRedirect();

    $announcement = Announcement::create(['barangay_id' => $this->own->id, 'posted_by' => $this->admin->id, 'title' => 'Assembly', 'content' => 'Saturday']);
    $this->actingAs($this->admin)->delete("/announcements/{$announcement->id}")->assertRedirect();

    expect(AuditLog::where('action', 'delete')->where('table_affected', 'programs')->exists())->toBeTrue()
        ->and(AuditLog::where('action', 'delete')->where('table_affected', 'announcements')->where('user_id', $this->admin->id)->exists())->toBeTrue();
});
