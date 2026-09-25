<?php

use App\Models\Barangay;
use App\Models\PartnerAgency;
use App\Models\Program;
use App\Models\ProgramApplication;
use App\Models\Resident;
use App\Models\User;
use App\Models\VulnerabilitySector;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->own = Barangay::where('name', 'Barangay 22')->first();
    $this->other = Barangay::where('name', 'Barangay 23')->first();
    $this->agency = PartnerAgency::first();
    $this->senior = VulnerabilitySector::where('code', 'SENIOR')->first();
    $this->pwd = VulnerabilitySector::where('code', 'PWD')->first();

    $this->resident = Resident::factory()->create(['barangay_id' => $this->own->id, 'is_senior_citizen' => true]);
    $this->resident->sectors()->attach($this->senior->id);
    $this->account = User::factory()->create([
        'role' => User::ROLE_RESIDENT,
        'barangay_id' => $this->own->id,
        'resident_id' => $this->resident->id,
    ]);
});

function makeProgram(array $overrides = [], array $sectorIds = []): Program
{
    $program = Program::create(array_merge([
        'agency_id' => PartnerAgency::first()->id,
        'posted_by' => User::factory()->create(['role' => User::ROLE_PARTNER_AGENCY])->id,
        'title' => 'Program '.uniqid(),
        'slots_available' => 10,
        'slots_filled' => 0,
        'status' => 'active',
    ], $overrides));
    $program->sectors()->sync($sectorIds);

    return $program;
}

function matchedTitles($test): array
{
    return collect($test->actingAs($test->account)->get('/dashboard')->viewData('page')['props']['matchedPrograms']['items'])->pluck('title')->all();
}

it('shows only open programs the resident qualifies for', function () {
    makeProgram(['title' => 'Senior aid'], [$this->senior->id]);
    makeProgram(['title' => 'Open to all'], []);
    makeProgram(['title' => 'For PWDs only'], [$this->pwd->id]);

    expect(matchedTitles($this))->toContain('Senior aid', 'Open to all')->not->toContain('For PWDs only');
});

it('leaves out programs already applied to, full, closed, expired, or aimed at another barangay', function () {
    $applied = makeProgram(['title' => 'Applied'], [$this->senior->id]);
    ProgramApplication::create(['program_id' => $applied->id, 'resident_id' => $this->resident->id, 'status' => 'pending']);
    makeProgram(['title' => 'Full', 'slots_available' => 5, 'slots_filled' => 5], [$this->senior->id]);
    makeProgram(['title' => 'Closed', 'status' => 'inactive'], [$this->senior->id]);
    makeProgram(['title' => 'Expired', 'end_date' => now()->subDay()->toDateString()], [$this->senior->id]);
    makeProgram(['title' => 'Elsewhere', 'barangay_id' => $this->other->id], [$this->senior->id]);
    makeProgram(['title' => 'Mine only', 'barangay_id' => $this->own->id], [$this->senior->id]);
    makeProgram(['title' => 'Unlimited slots', 'slots_available' => 0, 'slots_filled' => 3], [$this->senior->id]);

    expect(matchedTitles($this))->toEqualCanonicalizing(['Mine only', 'Unlimited slots']);
});

it('reports how many match in total but lists at most three', function () {
    foreach (range(1, 5) as $i) {
        makeProgram(['title' => "Match {$i}"], [$this->senior->id]);
    }

    $matched = $this->actingAs($this->account)->get('/dashboard')->viewData('page')['props']['matchedPrograms'];

    expect($matched['total'])->toBe(5)->and($matched['items'])->toHaveCount(3);
});

it('gives an account with no resident record nothing to match', function () {
    makeProgram(['title' => 'Open to all'], []);
    $unlinked = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->own->id, 'resident_id' => null]);

    $this->actingAs($unlinked)->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('matchedPrograms', []));
});
