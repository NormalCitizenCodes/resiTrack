<?php

use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\BarangayZone;
use App\Models\Beneficiary;
use App\Models\Household;
use App\Models\PartnerAgency;
use App\Models\Program;
use App\Models\ProgramApplication;
use App\Models\Resident;
use App\Models\User;
use App\Models\VulnerabilitySector;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->b22 = Barangay::where('name', 'Barangay 22')->first();
    $this->b23 = Barangay::where('name', 'Barangay 23')->first();
    $this->senior = VulnerabilitySector::where('code', 'SENIOR')->first();
    $this->pwd = VulnerabilitySector::where('code', 'PWD')->first();

    $this->bhw = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->b22->id]);
    $this->admin = User::factory()->create(['role' => User::ROLE_BARANGAY_ADMIN, 'barangay_id' => $this->b22->id]);
    $this->superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
});

function person(Barangay $barangay, array $attributes = []): Resident
{
    return Resident::factory()->create(['barangay_id' => $barangay->id, 'is_active' => true, ...$attributes]);
}

it('lets barangay staff and the super admin open the print preview, and nobody else', function () {
    foreach (['summary', 'residents', 'programs'] as $type) {
        foreach ([$this->bhw, $this->admin, $this->superAdmin] as $user) {
            $this->actingAs($user)->get("/reports/print?type={$type}")
                ->assertOk()
                ->assertInertia(fn ($page) => $page->component('reports/print')->where('type', $type));
        }
    }

    $resident = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id]);
    $agency = User::factory()->create(['role' => User::ROLE_PARTNER_AGENCY, 'agency_id' => PartnerAgency::create(['agency_name' => 'DSWD', 'agency_type' => 'national', 'is_active' => true])->id]);

    $this->actingAs($resident)->get('/reports/print?type=summary')->assertForbidden();
    $this->actingAs($agency)->get('/reports/print?type=summary')->assertForbidden();
});

it('rejects an unknown report type and a period that ends before it starts', function () {
    $this->actingAs($this->bhw)->get('/reports/print?type=nonsense')->assertSessionHasErrors('type');
    $this->actingAs($this->bhw)->get('/reports/print?type=summary&from=2026-05-10&to=2026-05-01')->assertSessionHasErrors('to');
});

it('never lists or counts residents of another barangay', function () {
    $mine = person($this->b22, ['last_name' => 'Ampil']);
    person($this->b23, ['last_name' => 'Zulueta']);
    person($this->b23);

    $this->actingAs($this->bhw)->get('/reports/print?type=residents&barangay_id='.$this->b23->id)
        ->assertInertia(fn ($page) => $page
            ->where('report.total', 1)
            ->has('report.rows', 1)
            ->where('report.rows.0.name', fn ($name) => str_starts_with($name, 'Ampil'))
            ->where('meta.scope', 'Barangay 22'));

    expect($mine->barangay_id)->toBe($this->b22->id);
});

it('lets the super admin report on the whole city or on one barangay', function () {
    person($this->b22);
    person($this->b22);
    person($this->b23);

    $this->actingAs($this->superAdmin)->get('/reports/print?type=residents')
        ->assertInertia(fn ($page) => $page->where('report.total', 3)->where('meta.scope', 'City-wide'));

    $this->actingAs($this->superAdmin)->get('/reports/print?type=residents&barangay_id='.$this->b23->id)
        ->assertInertia(fn ($page) => $page->where('report.total', 1)->where('meta.scope', 'Barangay 23'));
});

it('filters the resident list by sector, sex, age and purok', function () {
    $zone = BarangayZone::create(['barangay_id' => $this->b22->id, 'zone_name' => 'Purok 3']);
    $household = Household::factory()->create(['barangay_id' => $this->b22->id, 'zone_id' => $zone->id]);

    $oldWoman = person($this->b22, ['sex' => 'female', 'date_of_birth' => Carbon::today()->subYears(70)->toDateString(), 'household_id' => $household->id]);
    $oldWoman->sectors()->attach($this->senior->id);
    $oldMan = person($this->b22, ['sex' => 'male', 'date_of_birth' => Carbon::today()->subYears(72)->toDateString()]);
    $oldMan->sectors()->attach($this->senior->id);
    $youngWoman = person($this->b22, ['sex' => 'female', 'date_of_birth' => Carbon::today()->subYears(25)->toDateString()]);
    $youngWoman->sectors()->attach($this->pwd->id);

    $total = fn (string $query) => $this->actingAs($this->bhw)->get('/reports/print?type=residents&'.$query)->viewData('page')['props']['report']['total'];

    expect($total(''))->toBe(3)
        ->and($total('sector=SENIOR'))->toBe(2)
        ->and($total('sector=SENIOR&sex=female'))->toBe(1)
        ->and($total('age_min=60'))->toBe(2)
        ->and($total('age_min=20&age_max=30'))->toBe(1)
        ->and($total('zone_id='.$zone->id))->toBe(1);
});

it('ignores a purok from another barangay', function () {
    person($this->b22);
    $foreign = BarangayZone::create(['barangay_id' => $this->b23->id, 'zone_name' => 'Purok 9']);

    $this->actingAs($this->bhw)->get('/reports/print?type=residents&zone_id='.$foreign->id)
        ->assertOk()
        ->assertInertia(fn ($page) => $page->where('report.total', 1)->where('meta.filters', []));
});

it('prints counts only, with no names, when names are switched off', function () {
    person($this->b22, ['last_name' => 'Secretname']);

    $this->actingAs($this->bhw)->get('/reports/print?type=residents&names=0')
        ->assertInertia(fn ($page) => $page
            ->where('report.show_names', false)
            ->where('report.total', 1)
            ->where('report.rows', []));

    expect(json_encode($this->actingAs($this->bhw)->get('/reports/print?type=residents&names=0')->viewData('page')['props']))->not->toContain('Secretname');
});

it('leaves inactive residents out unless asked', function () {
    person($this->b22);
    person($this->b22, ['is_active' => false]);

    $this->actingAs($this->bhw)->get('/reports/print?type=residents')->assertInertia(fn ($page) => $page->where('report.total', 1));
    $this->actingAs($this->bhw)->get('/reports/print?type=residents&status=all')->assertInertia(fn ($page) => $page->where('report.total', 2));
});

it('compares the summary with the period just before it', function () {
    person($this->b22, ['registered_at' => Carbon::create(2026, 3, 10)]);
    person($this->b22, ['registered_at' => Carbon::create(2026, 3, 20)]);
    person($this->b22, ['registered_at' => Carbon::create(2026, 2, 15)]);

    $this->actingAs($this->bhw)->get('/reports/print?type=summary&from=2026-03-01&to=2026-03-31&compare=1')
        ->assertInertia(fn ($page) => $page
            ->where('report.activity.0.label', 'New registrations')
            ->where('report.activity.0.current', 2)
            ->where('report.activity.0.previous', 1)
            ->where('report.compared_with.from', '2026-01-29')
            ->where('report.compared_with.to', '2026-02-28'));

    $this->actingAs($this->bhw)->get('/reports/print?type=summary&from=2026-03-01&to=2026-03-31&compare=0')
        ->assertInertia(fn ($page) => $page->where('report.activity.0.previous', null)->where('report.compared_with', null));
});

it('reports how far each program has reached the residents it is for', function () {
    $agency = PartnerAgency::create(['agency_name' => 'DSWD', 'agency_type' => 'national', 'is_active' => true]);
    $program = Program::create([
        'agency_id' => $agency->id, 'posted_by' => $this->admin->id, 'title' => 'Senior pension', 'description' => 'x',
        'slots_available' => 50, 'slots_filled' => 0, 'status' => 'active',
    ]);
    $program->sectors()->attach($this->senior->id);

    $seniors = collect(range(1, 4))->map(function () {
        $resident = person($this->b22);
        $resident->sectors()->attach($this->senior->id);

        return $resident;
    });
    $outsider = person($this->b23);
    $outsider->sectors()->attach($this->senior->id);
    person($this->b22); // no sector, not eligible

    $approved = ProgramApplication::create(['program_id' => $program->id, 'resident_id' => $seniors[0]->id, 'status' => 'approved', 'applied_at' => now()]);
    ProgramApplication::create(['program_id' => $program->id, 'resident_id' => $seniors[1]->id, 'status' => 'pending', 'applied_at' => now()]);
    ProgramApplication::create(['program_id' => $program->id, 'resident_id' => $outsider->id, 'status' => 'approved', 'applied_at' => now()]);
    Beneficiary::create(['program_id' => $program->id, 'resident_id' => $seniors[0]->id, 'application_id' => $approved->id, 'status' => 'active', 'date_added' => now()]);

    $this->actingAs($this->bhw)->get('/reports/print?type=programs')
        ->assertInertia(fn ($page) => $page
            ->where('report.rows.0.title', 'Senior pension')
            ->where('report.rows.0.eligible', 4)
            ->where('report.rows.0.applicants', 2)
            ->where('report.rows.0.approved', 1)
            ->where('report.rows.0.beneficiaries', 1)
            ->where('report.rows.0.not_applied', 2)
            ->where('report.rows.0.reach', 25)
            ->where('report.totals.programs', 1));
});

it('leaves out programs aimed at another barangay', function () {
    $agency = PartnerAgency::create(['agency_name' => 'DSWD', 'agency_type' => 'national', 'is_active' => true]);
    Program::create(['agency_id' => $agency->id, 'barangay_id' => $this->b23->id, 'posted_by' => $this->admin->id, 'title' => 'Elsewhere', 'description' => 'x', 'slots_available' => 5, 'slots_filled' => 0, 'status' => 'active']);
    Program::create(['agency_id' => $agency->id, 'barangay_id' => $this->b22->id, 'posted_by' => $this->admin->id, 'title' => 'Here', 'description' => 'x', 'slots_available' => 5, 'slots_filled' => 0, 'status' => 'active']);

    $this->actingAs($this->bhw)->get('/reports/print?type=programs')
        ->assertInertia(fn ($page) => $page->has('report.rows', 1)->where('report.rows.0.title', 'Here'));
});

it('records every print in the activity trail, including whether names were printed', function () {
    person($this->b22);

    $this->actingAs($this->bhw)->get('/reports/print?type=residents&names=1&sex=female')->assertOk();

    $entry = AuditLog::where('action', 'generated_report')->where('table_affected', 'resident_list')->latest('id')->first();
    $payload = json_decode((string) $entry->new_value, true);

    expect($entry->user_id)->toBe($this->bhw->id)
        ->and($payload['format'])->toBe('print')
        ->and($payload['names'])->toBeTrue()
        ->and($payload['filters'])->toContain('Sex: Female');
});

it('prints the preparer automatically and the noted-by name as typed', function () {
    $this->actingAs($this->admin)->get('/reports/print?type=summary&noted_by='.urlencode('  Hon. Maria Cruz  '))
        ->assertInertia(fn ($page) => $page
            ->where('meta.generated_by', $this->admin->name)
            ->where('meta.generated_by_role', 'Barangay Admin')
            ->where('meta.noted_by', 'Hon. Maria Cruz'));
});
