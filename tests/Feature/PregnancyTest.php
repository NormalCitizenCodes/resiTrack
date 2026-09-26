<?php

use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\Resident;
use App\Models\User;
use App\Services\ActivityLogPresenter;
use App\Services\PregnancyStatus;
use App\Services\SectorClassificationService;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->b22 = Barangay::where('name', 'Barangay 22')->first();
    $this->bhw = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->b22->id]);
});

afterEach(fn () => Carbon::setTestNow());

function womanPayload(array $extra = []): array
{
    return [
        'first_name' => 'Ana', 'last_name' => 'Reyes', 'sex' => 'female', 'civil_status' => 'married',
        'date_of_birth' => now()->subYears(28)->toDateString(), ...$extra,
    ];
}

function inMonths(int $months): string
{
    return now()->startOfMonth()->addMonths($months)->format('Y-m');
}

function hasPregnantSector(Resident $resident): bool
{
    return $resident->fresh()->sectors()->where('code', 'PREGNANT')->exists();
}

it('needs an expected month when staff tick Pregnant', function () {
    $this->actingAs($this->bhw)->post('/residents', womanPayload(['is_pregnant' => true]))
        ->assertSessionHasErrors('pregnancy_expected_month');

    expect(Resident::where('first_name', 'Ana')->exists())->toBeFalse();
});

it('only accepts a plausible resident and a plausible month', function (array $change, string $field) {
    $this->actingAs($this->bhw)->post('/residents', womanPayload(['is_pregnant' => true, 'pregnancy_expected_month' => inMonths(3), ...$change]))
        ->assertSessionHasErrors($field);
})->with([
    'a man' => [['sex' => 'male'], 'is_pregnant'],
    'a child of nine' => [['date_of_birth' => 'nine years ago'], 'date_of_birth'],
    'no month at all' => [['pregnancy_expected_month' => null], 'pregnancy_expected_month'],
    'not a month' => [['pregnancy_expected_month' => 'soon'], 'pregnancy_expected_month'],
    'a month that does not exist' => [['pregnancy_expected_month' => '2026-13'], 'pregnancy_expected_month'],
]);

it('rejects a month that is too far ahead, too old, or a resident outside the age range', function () {
    $post = fn (array $extra) => $this->actingAs($this->bhw)->post('/residents', womanPayload(['is_pregnant' => true, ...$extra]));

    $post(['pregnancy_expected_month' => inMonths(11)])->assertSessionHasErrors('pregnancy_expected_month');
    $post(['pregnancy_expected_month' => inMonths(-2)])->assertSessionHasErrors('pregnancy_expected_month');
    $post(['pregnancy_expected_month' => inMonths(2), 'date_of_birth' => now()->subYears(9)->toDateString()])->assertSessionHasErrors('is_pregnant');
    $post(['pregnancy_expected_month' => inMonths(2), 'date_of_birth' => now()->subYears(60)->toDateString()])->assertSessionHasErrors('is_pregnant');
    $post(['pregnancy_expected_month' => inMonths(-1)])->assertSessionHasNoErrors();
});

it('records the month, marks staff as the source and adds the Pregnant sector', function () {
    $this->actingAs($this->bhw)->post('/residents', womanPayload(['first_name' => 'Bea', 'is_pregnant' => true, 'pregnancy_expected_month' => inMonths(4)]))->assertSessionHasNoErrors();

    $resident = Resident::where('first_name', 'Bea')->first();

    expect($resident->is_pregnant)->toBeTrue()
        ->and($resident->pregnancy_expected_month->toDateString())->toBe(now()->startOfMonth()->addMonths(4)->toDateString())
        ->and($resident->pregnancy_source)->toBe('staff')
        ->and(hasPregnantSector($resident))->toBeTrue();
});

it('clears everything when staff untick Pregnant, and keeps who reported it when the month is unchanged', function () {
    $resident = Resident::factory()->create(['barangay_id' => $this->b22->id, 'sex' => 'female', 'date_of_birth' => now()->subYears(28)->toDateString(), 'is_pregnant' => true, 'pregnancy_expected_month' => inMonths(3).'-01', 'pregnancy_source' => 'self']);
    app(SectorClassificationService::class)->classify($resident);

    $update = fn (array $extra) => $this->actingAs($this->bhw)->put("/residents/{$resident->id}", [
        'first_name' => $resident->first_name, 'last_name' => $resident->last_name, 'sex' => 'female', 'civil_status' => $resident->civil_status,
        'date_of_birth' => $resident->date_of_birth->format('Y-m-d'), ...$extra,
    ]);

    $update(['is_pregnant' => true, 'pregnancy_expected_month' => inMonths(3)])->assertSessionHasNoErrors();
    expect($resident->fresh()->pregnancy_source)->toBe('self');

    $update(['is_pregnant' => true, 'pregnancy_expected_month' => inMonths(4)])->assertSessionHasNoErrors();
    expect($resident->fresh()->pregnancy_source)->toBe('staff');

    $update(['is_pregnant' => false])->assertSessionHasNoErrors();
    $fresh = $resident->fresh();

    expect($fresh->is_pregnant)->toBeFalse()
        ->and($fresh->pregnancy_expected_month)->toBeNull()
        ->and($fresh->pregnancy_source)->toBeNull()
        ->and(hasPregnantSector($fresh))->toBeFalse();
});

it('lets a woman report her own pregnancy, marked as self-reported', function () {
    $resident = Resident::factory()->create(['barangay_id' => $this->b22->id, 'sex' => 'female', 'date_of_birth' => now()->subYears(30)->toDateString()]);
    $account = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id, 'resident_id' => $resident->id]);

    $this->actingAs($account)->put('/my-profile', ['is_pregnant' => true, 'pregnancy_expected_month' => inMonths(5)])->assertSessionHasNoErrors();

    $fresh = $resident->fresh();

    expect($fresh->is_pregnant)->toBeTrue()
        ->and($fresh->pregnancy_source)->toBe('self')
        ->and(hasPregnantSector($fresh))->toBeTrue();

    $entry = AuditLog::where('table_affected', 'residents')->where('record_id', $resident->id)->latest('id')->first();
    expect($entry->user_id)->toBe($account->id)
        ->and($entry->new_value)->toContain('declared, expected');
});

it('lets her end it herself', function () {
    $resident = Resident::factory()->create(['barangay_id' => $this->b22->id, 'sex' => 'female', 'date_of_birth' => now()->subYears(30)->toDateString(), 'is_pregnant' => true, 'pregnancy_expected_month' => inMonths(2).'-01', 'pregnancy_source' => 'self']);
    app(SectorClassificationService::class)->classify($resident);
    $account = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id, 'resident_id' => $resident->id]);

    $this->actingAs($account)->put('/my-profile', ['is_pregnant' => false])->assertSessionHasNoErrors();

    expect($resident->fresh()->is_pregnant)->toBeFalse()
        ->and(hasPregnantSector($resident))->toBeFalse();
});

it('refuses a self-report from a man, or without a month', function () {
    $man = Resident::factory()->create(['barangay_id' => $this->b22->id, 'sex' => 'male', 'date_of_birth' => now()->subYears(30)->toDateString()]);
    $manAccount = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id, 'resident_id' => $man->id]);
    $this->actingAs($manAccount)->put('/my-profile', ['is_pregnant' => true, 'pregnancy_expected_month' => inMonths(3)])->assertSessionHasErrors('is_pregnant');

    $woman = Resident::factory()->create(['barangay_id' => $this->b22->id, 'sex' => 'female', 'date_of_birth' => now()->subYears(30)->toDateString()]);
    $womanAccount = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->b22->id, 'resident_id' => $woman->id]);
    $this->actingAs($womanAccount)->put('/my-profile', ['is_pregnant' => true])->assertSessionHasErrors('pregnancy_expected_month');

    expect($man->fresh()->is_pregnant)->toBeFalse()->and($woman->fresh()->is_pregnant)->toBeFalse();
});

it('removes the tag 30 days after the end of the expected month, and not a day sooner', function () {
    $resident = Resident::factory()->create(['barangay_id' => $this->b22->id, 'sex' => 'female', 'date_of_birth' => '1995-05-05', 'is_pregnant' => true, 'pregnancy_expected_month' => '2026-03-01', 'pregnancy_source' => 'staff']);
    app(SectorClassificationService::class)->classify($resident);

    // March ends on the 31st; 30 days later is April 30.
    expect(PregnancyStatus::endsOn(Carbon::parse('2026-03-01'))->toDateString())->toBe('2026-04-30');

    expect(app(PregnancyStatus::class)->expireDue(Carbon::parse('2026-04-30')))->toBe(0);
    expect($resident->fresh()->is_pregnant)->toBeTrue();

    expect(app(PregnancyStatus::class)->expireDue(Carbon::parse('2026-05-01')))->toBe(1);

    $fresh = $resident->fresh();
    expect($fresh->is_pregnant)->toBeFalse()
        ->and($fresh->pregnancy_expected_month)->toBeNull()
        ->and(hasPregnantSector($fresh))->toBeFalse();
});

it('leaves a pregnancy with no month alone, and someone still within the period', function () {
    $noMonth = Resident::factory()->create(['barangay_id' => $this->b22->id, 'sex' => 'female', 'date_of_birth' => '1995-05-05', 'is_pregnant' => true, 'pregnancy_expected_month' => null]);
    $stillDue = Resident::factory()->create(['barangay_id' => $this->b22->id, 'sex' => 'female', 'date_of_birth' => '1995-05-05', 'is_pregnant' => true, 'pregnancy_expected_month' => '2026-06-01']);

    expect(app(PregnancyStatus::class)->expireDue(Carbon::parse('2026-06-15')))->toBe(0);
    expect($noMonth->fresh()->is_pregnant)->toBeTrue()->and($stillDue->fresh()->is_pregnant)->toBeTrue();
});

it('logs the automatic end as the system, never as whoever happened to trigger it', function () {
    $resident = Resident::factory()->create(['barangay_id' => $this->b22->id, 'sex' => 'female', 'date_of_birth' => '1995-05-05', 'is_pregnant' => true, 'pregnancy_expected_month' => '2026-01-01']);

    $this->actingAs($this->bhw);
    $this->artisan('sectors:expire-pregnancies')->assertSuccessful();

    $entry = AuditLog::where('table_affected', 'residents')->where('record_id', $resident->id)->latest('id')->first();

    expect($entry->user_id)->toBeNull()
        ->and(app(ActivityLogPresenter::class)->describe($entry)['summary'])->toBe('Pregnancy ended automatically');
});

it('explains a pregnancy with its month, who reported it and when the tag clears', function () {
    $resident = Resident::factory()->create(['barangay_id' => $this->b22->id, 'sex' => 'female', 'date_of_birth' => '1995-05-05', 'is_pregnant' => true, 'pregnancy_expected_month' => '2026-11-01', 'pregnancy_source' => 'self']);
    app(SectorClassificationService::class)->classify($resident);

    $reason = app(SectorClassificationService::class)->explain($resident->fresh()->load('sectors'))['PREGNANT'][0];

    expect($reason)->toContain('November 2026')->toContain('reported by the resident')->toContain('December 30, 2026');
});

it('asks for the month when an older pregnancy has none', function () {
    $resident = Resident::factory()->create(['barangay_id' => $this->b22->id, 'sex' => 'female', 'date_of_birth' => '1995-05-05', 'is_pregnant' => true, 'pregnancy_expected_month' => null]);
    app(SectorClassificationService::class)->classify($resident);

    $reason = app(SectorClassificationService::class)->explain($resident->fresh()->load('sectors'))['PREGNANT'][0];

    expect($reason)->toContain('Add the expected month');
});
