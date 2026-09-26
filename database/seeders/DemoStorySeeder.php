<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\Beneficiary;
use App\Models\Concern;
use App\Models\DocumentRequest;
use App\Models\Household;
use App\Models\HouseholdWellbeingAssessment;
use App\Models\PartnerAgency;
use App\Models\Program;
use App\Models\ProgramApplication;
use App\Models\Resident;
use App\Models\User;
use App\Models\WellbeingLevel;
use App\Services\DuplicateDetectionService;
use App\Services\NotificationService;
use App\Services\ProgramEligibilityService;
use App\Services\SectorClassificationService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;

/**
 * A small, hand-made set for screenshots and the defense
 * demo: about 35 named people in four barangays and one story you can follow.
 * No random names, so nothing odd ever shows on screen.
 *
 * The story: Lola Nena Ramirez (Barangay 22) signed up, was verified, is a
 * senior citizen and a solo parent, was approved for the Social Pension, has a
 * payout date coming up, and asks for a Certificate of Indigency. Ernesto
 * Cabahug, her neighbour, qualifies for programs and has not applied yet.
 *
 * Run through `php artisan data:seed demo`. All demo accounts use "password".
 */
class DemoStorySeeder extends Seeder
{
    private const PASSWORD = 'password';

    /** @var array<string, User> */
    private array $staff = [];

    public function __construct(
        private readonly SectorClassificationService $classifier,
        private readonly DuplicateDetectionService $duplicates,
    ) {}

    public function run(): void
    {
        abort_if(app()->isProduction(), 500, 'The demo data is for development machines only.');

        mt_srand(20260926);

        $b = Barangay::pluck('id', 'name');
        $this->people($b);

        $residents = [];

        foreach ($this->households($b) as $spec) {
            $residents = array_merge($residents, $this->household($b[$spec['barangay']], $spec));
        }

        $this->classifyAll();
        $this->duplicatePairs($b);
        $this->story($b);
        $this->activity();
    }

    // --- People who work in the system --------------------------------------

    /**
     * @param  Collection<string, int>  $b
     */
    private function people(Collection $b): void
    {
        $extra = [
            ['Maria Santos', 'secretary@resitrack.test', User::ROLE_BARANGAY_ADMIN, 'Barangay 22'],
            ['Josefa Reyes', 'bhw@resitrack.test', User::ROLE_BHW, 'Barangay 22'],
            ['Rowena Tan', 'bhw2@resitrack.test', User::ROLE_BHW, 'Barangay 22'],
            ['Lourdes Cruz', 'secretary.b21@resitrack.test', User::ROLE_BARANGAY_ADMIN, 'Barangay 21'],
            ['Elmer Bacalso', 'bhw.b21@resitrack.test', User::ROLE_BHW, 'Barangay 21'],
            ['Ana Garcia', 'secretary.b23@resitrack.test', User::ROLE_BARANGAY_ADMIN, 'Barangay 23'],
            ['Pedro Garcia', 'bhw.b23@resitrack.test', User::ROLE_BHW, 'Barangay 23'],
            ['Nestor Pacana', 'secretary.b24@resitrack.test', User::ROLE_BARANGAY_ADMIN, 'Barangay 24'],
            ['Gina Dizon', 'bhw.b24@resitrack.test', User::ROLE_BHW, 'Barangay 24'],
        ];

        foreach ($extra as [$name, $email, $role, $barangay]) {
            $this->staff[$email] = $this->account($name, $email, $role, $b[$barangay]);
        }

        $agencies = PartnerAgency::pluck('id', 'agency_type');
        $this->staff['agency@resitrack.test'] = User::where('email', 'agency@resitrack.test')->first();

        foreach ([['Carla Mendoza', 'peso@resitrack.test', 'PESO'], ['Victor Lim', 'cedo@resitrack.test', 'CEDO']] as [$name, $email, $type]) {
            $this->staff[$email] = $this->account($name, $email, User::ROLE_PARTNER_AGENCY, null, $agencies[$type]);
        }
    }

    private function account(string $name, string $email, string $role, ?int $barangayId, ?int $agencyId = null, ?string $password = null): User
    {
        [$first, $last] = array_pad(explode(' ', $name, 2), 2, '');

        return User::updateOrCreate(['email' => $email], [
            'name' => $name, 'first_name' => $first, 'last_name' => $last, 'role' => $role,
            'barangay_id' => $barangayId, 'agency_id' => $agencyId,
            'password' => Hash::make($password ?? $email), 'email_verified_at' => now(), 'is_active' => true,
        ]);
    }

    // --- Households ----------------------------------------------------------

    /**
     * Member: [first, middle, last, sex, age, civil, work, income, education, enrollment, extras]
     *
     * @return array<int, array<string, mixed>>
     */
    /**
     * @param  Collection<string, int>  $b
     * @return array<int, array<string, mixed>>
     */
    private function households(Collection $b): array
    {
        $m = fn (string $first, ?string $middle, string $last, string $sex, int $age, string $civil, ?string $job, ?int $income, string $edu, string $enrol, array $extra = []) => compact('first', 'middle', 'last', 'sex', 'age', 'civil', 'job', 'income', 'edu', 'enrol') + $extra;

        return [
            ['barangay' => 'Barangay 22', 'purok' => 'Purok 3', 'address' => '128 Tiano Brothers Street', 'fourps' => true, 'members' => [
                $m('Nena', 'Baguio', 'Ramirez', 'female', 68, 'widowed', 'Sari-sari store owner', 3500, 'elementary', 'graduated', ['solo' => true, 'key' => 'nena', 'philsys' => '4421-7788-1203']),
                $m('Ramon', 'Baguio', 'Ramirez', 'male', 44, 'married', 'Tricycle driver', 12000, 'highschool', 'graduated'),
                $m('Elena', 'Cabalfin', 'Ramirez', 'female', 41, 'married', 'Market vendor', 5000, 'highschool', 'graduated'),
                $m('Jhun', 'Cabalfin', 'Ramirez', 'male', 19, 'single', null, null, 'highschool', 'not_enrolled'),
                $m('Mika', 'Cabalfin', 'Ramirez', 'female', 10, 'single', null, null, 'elementary', 'enrolled'),
            ]],
            ['barangay' => 'Barangay 22', 'purok' => 'Purok 3', 'address' => '131 Tiano Brothers Street', 'members' => [
                $m('Ernesto', 'Lagahit', 'Cabahug', 'male', 71, 'married', null, 0, 'elementary', 'graduated', ['key' => 'ernesto']),
                $m('Maribel', 'Sabellano', 'Cabahug', 'female', 66, 'married', 'Laundry worker', 2000, 'elementary', 'graduated', ['philsys' => '5530-2211-9087']),
            ]],
            ['barangay' => 'Barangay 22', 'purok' => 'Purok 1', 'address' => '42 Velez Street', 'members' => [
                $m('Teresita', 'Nacua', 'Dela Pena', 'female', 34, 'separated', 'Cashier', 9000, 'college', 'graduated', ['solo' => true, 'key' => 'teresita']),
                $m('Angelo', 'Nacua', 'Dela Pena', 'male', 12, 'single', null, null, 'elementary', 'enrolled'),
                $m('Bea', 'Nacua', 'Dela Pena', 'female', 8, 'single', null, null, 'elementary', 'enrolled'),
            ]],
            ['barangay' => 'Barangay 22', 'purok' => 'Purok 2', 'address' => '17 Yacapin Street', 'fourps' => true, 'members' => [
                $m('Bernardo', 'Uy', 'Ocampo', 'male', 47, 'married', 'Watch repairer', 6000, 'vocational', 'graduated', ['pwd' => true]),
                $m('Liza', 'Ramos', 'Ocampo', 'female', 45, 'married', 'Seamstress', 4500, 'highschool', 'graduated'),
                $m('Carl', 'Ramos', 'Ocampo', 'male', 22, 'single', null, null, 'highschool', 'not_enrolled'),
            ]],
            ['barangay' => 'Barangay 22', 'purok' => 'Purok 4', 'address' => '9 Hayes Street', 'members' => [
                $m('Dennis', 'Arcilla', 'Tumulak', 'male', 30, 'married', 'Construction worker', 11000, 'highschool', 'graduated'),
                $m('Jocelyn', 'Ponce', 'Tumulak', 'female', 27, 'married', null, null, 'college', 'graduated', ['pregnant' => true, 'key' => 'jocelyn']),
            ]],
            ['barangay' => 'Barangay 22', 'purok' => 'Purok 4', 'address' => '11 Hayes Street', 'members' => [
                $m('Mildred', 'Gorgonio', 'Abella', 'female', 42, 'widowed', 'Housekeeper', 7000, 'highschool', 'graduated', ['solo' => true]),
                $m('Kristine', 'Gorgonio', 'Abella', 'female', 18, 'single', null, null, 'highschool', 'not_enrolled'),
                $m('Paolo', 'Gorgonio', 'Abella', 'male', 15, 'single', null, null, 'highschool', 'enrolled'),
            ]],
            ['barangay' => 'Barangay 22', 'purok' => 'Purok 2', 'address' => '25 Chavez Street', 'members' => [
                $m('Rodolfo', 'Encabo', 'Silva', 'male', 62, 'widowed', 'Security guard', 8000, 'highschool', 'graduated'),
            ]],
            ['barangay' => 'Barangay 21', 'purok' => 'Purok 1', 'address' => '5 Corrales Avenue', 'members' => [
                $m('Danilo', 'Ybanez', 'Pacana', 'male', 63, 'widowed', 'Jeepney driver', 4000, 'highschool', 'graduated', ['philsys' => '6612-4409-3315']),
            ]],
            ['barangay' => 'Barangay 21', 'purok' => 'Purok 2', 'address' => '14 Pabayo Street', 'members' => [
                $m('Marites', 'Lagos', 'Villarin', 'female', 29, 'single', 'Call center agent', 15000, 'college', 'graduated', ['solo' => true]),
                $m('Zion', 'Lagos', 'Villarin', 'male', 5, 'single', null, null, 'none', 'not_enrolled'),
            ]],
            ['barangay' => 'Barangay 23', 'purok' => 'Purok 1', 'address' => '20 Osmena Street', 'members' => [
                $m('Lorna', 'Gaviola', 'Mabini', 'female', 35, 'married', 'Nurse aide', 10000, 'vocational', 'graduated', ['philsys' => '7723-1120-5544']),
                $m('Jerome', 'Salcedo', 'Mabini', 'male', 37, 'married', 'Electrician', 13000, 'vocational', 'graduated'),
            ]],
            ['barangay' => 'Barangay 23', 'purok' => 'Purok 2', 'address' => '33 Akut Street', 'members' => [
                $m('Aileen', 'Torres', 'Salcedo', 'female', 50, 'married', 'Teacher', 22000, 'college', 'graduated'),
                $m('Rey', 'Bautista', 'Salcedo', 'male', 52, 'married', null, 0, 'highschool', 'graduated', ['pwd' => true]),
            ]],
            ['barangay' => 'Barangay 24', 'purok' => 'Purok 1', 'address' => '3 Mabini Street', 'members' => [
                $m('Rodrigo', 'Miranda', 'Uy', 'male', 74, 'married', null, 0, 'elementary', 'graduated'),
                $m('Consolacion', 'Pepito', 'Uy', 'female', 72, 'married', null, 0, 'elementary', 'graduated'),
                $m('Kevin', 'Pepito', 'Uy', 'male', 16, 'single', null, null, 'highschool', 'enrolled'),
            ]],
        ];
    }

    /** @var array<string, Resident> */
    private array $named = [];

    /** @return array<int, Resident> */
    /**
     * @param  array<string, mixed>  $spec
     * @return array<int, Resident>
     */
    private function household(int $barangayId, array $spec): array
    {
        $barangay = Barangay::findOrFail($barangayId);
        $zone = $barangay->zones()->firstOrCreate(['zone_name' => $spec['purok']]);
        $registered = now()->subDays(mt_rand(20, 200));
        $bhw = $this->staff[$barangay->name === 'Barangay 22' ? 'bhw@resitrack.test' : ($barangay->name === 'Barangay 21' ? 'bhw.b21@resitrack.test' : ($barangay->name === 'Barangay 23' ? 'bhw.b23@resitrack.test' : 'bhw.b24@resitrack.test'))];

        $household = Household::create([
            'barangay_id' => $barangayId, 'zone_id' => $zone->getKey(),
            'address' => "{$spec['address']}, {$spec['purok']}, {$barangay->name}",
            'house_materials' => 'semi-concrete', 'house_ownership' => 'owned', 'water_source' => 'pipe',
            'electricity_source' => 'metered', 'waste_management' => 'collected', 'toilet_facility' => 'private',
            'member_count' => count($spec['members']), 'monthly_income' => 9000, 'is_4ps_beneficiary' => $spec['fourps'] ?? false,
        ]);
        $household->forceFill(['household_id' => sprintf('HH-%06d', $household->id), 'created_at' => $registered])->save();

        $created = [];

        foreach ($spec['members'] as $member) {
            $resident = Resident::create([
                'household_id' => $household->id, 'barangay_id' => $barangayId,
                'philsys_card_no' => $member['philsys'] ?? null,
                'first_name' => $member['first'], 'middle_name' => $member['middle'], 'last_name' => $member['last'],
                'date_of_birth' => now()->subYears($member['age'])->subDays(mt_rand(10, 300))->toDateString(),
                'place_of_birth' => 'Cagayan de Oro City', 'sex' => $member['sex'], 'civil_status' => $member['civil'],
                'religion' => 'Roman Catholic', 'citizenship' => 'Filipino',
                'contact_number' => $member['age'] >= 15 ? '09'.mt_rand(170000000, 179999999) : null,
                'address' => $household->address, 'occupation' => $member['job'],
                'employment_status' => $member['job'] ? ($member['income'] > 8000 ? 'employed' : 'self_employed') : 'unemployed',
                'education_level' => $member['edu'], 'education_status' => $member['enrol'], 'monthly_income' => $member['income'],
                'is_pwd' => $member['pwd'] ?? false, 'is_solo_parent' => $member['solo'] ?? false, 'is_pregnant' => $member['pregnant'] ?? false,
                'is_active' => true, 'registered_at' => $registered, 'profiled_by_user_id' => $bhw->id, 'profiled_at' => $registered,
            ]);
            $resident->forceFill(['resident_id' => Resident::makeOfficialId($resident->id, $registered), 'created_at' => $registered, 'updated_at' => $registered])->save();
            $created[] = $resident;

            if (isset($member['key'])) {
                $this->named[$member['key']] = $resident;
            }

            AuditLog::create(['user_id' => $bhw->id, 'action' => 'create', 'table_affected' => 'residents', 'record_id' => $resident->id, 'new_value' => json_encode(['name' => $resident->full_name]), 'performed_at' => $registered, 'created_at' => $registered, 'updated_at' => $registered]);
        }

        HouseholdWellbeingAssessment::create([
            'household_id' => $household->id, 'level_id' => WellbeingLevel::orderBy('id')->skip(mt_rand(0, 2))->value('id'),
            'assessed_by' => $bhw->id, 'assessment_date' => $registered->copy()->addDays(3)->toDateString(),
        ]);

        return $created;
    }

    private function classifyAll(): void
    {
        Resident::query()->orderBy('id')->each(fn (Resident $r) => $this->classifier->classify($r));
    }

    // --- Duplicates: one inside Barangay 22, one transfer ----------------------

    /**
     * @param  Collection<string, int>  $b
     */
    private function duplicatePairs(Collection $b): void
    {
        $maribel = Resident::where('first_name', 'Maribel')->where('last_name', 'Cabahug')->first();
        $lorna = Resident::where('first_name', 'Lorna')->where('last_name', 'Mabini')->first();
        $bhw = $this->staff['bhw2@resitrack.test'];

        // The same woman registered twice in the same barangay by different health workers: no middle name, no PhilSys number.
        $copy = Resident::create(['barangay_id' => $b['Barangay 22'], 'first_name' => 'Maribel', 'last_name' => 'Cabahug', 'date_of_birth' => $maribel->date_of_birth->toDateString(), 'sex' => 'female', 'civil_status' => 'married', 'citizenship' => 'Filipino', 'contact_number' => $maribel->contact_number, 'address' => 'Purok 3, Barangay 22', 'is_active' => true, 'registered_at' => now()->subDays(6), 'profiled_by_user_id' => $bhw->id, 'profiled_at' => now()->subDays(6)]);
        $copy->forceFill(['resident_id' => Resident::makeOfficialId($copy->id, now()), 'created_at' => now()->subDays(6)])->save();
        $this->classifier->classify($copy);
        $this->duplicates->scan($copy);

        // Lorna moved from Barangay 23 to Barangay 22 and was registered again there.
        $moved = Resident::create(['barangay_id' => $b['Barangay 22'], 'first_name' => 'Lorna', 'middle_name' => 'Gaviola', 'last_name' => 'Mabini', 'date_of_birth' => $lorna->date_of_birth->toDateString(), 'philsys_card_no' => $lorna->philsys_card_no, 'sex' => 'female', 'civil_status' => 'married', 'citizenship' => 'Filipino', 'address' => 'Purok 2, Barangay 22', 'is_active' => true, 'registered_at' => now()->subDays(3), 'profiled_by_user_id' => $bhw->id, 'profiled_at' => now()->subDays(3)]);
        $moved->forceFill(['resident_id' => Resident::makeOfficialId($moved->id, now()), 'created_at' => now()->subDays(3)])->save();
        $this->classifier->classify($moved);
        $this->duplicates->scan($moved);
    }

    // --- The story --------------------------------------------------------------

    /**
     * @param  Collection<string, int>  $b
     */
    private function story(Collection $b): void
    {
        $nena = $this->named['nena'];
        $ernesto = $this->named['ernesto'];
        $agencyUser = $this->staff['agency@resitrack.test'];
        $secretary = $this->staff['secretary@resitrack.test'];
        $pension = Program::where('title', 'like', 'Social Pension%')->first();
        $aics = Program::where('title', 'like', 'AICS%')->first();

        $nenaAccount = $this->residentAccount($nena, 'lola.nena@demo.test', 'Nena Ramirez');
        $ernestoAccount = $this->residentAccount($ernesto, 'mang.ernesto@demo.test', 'Ernesto Cabahug');
        $this->residentAccount($this->named['teresita'], 'teresita@demo.test', 'Teresita Dela Pena');
        $this->residentAccount($this->named['jocelyn'], 'jocelyn@demo.test', 'Jocelyn Tumulak');

        // Someone who signed up online and still has to be verified at the hall.
        $rosa = User::create(['name' => 'Rosa Villanueva', 'first_name' => 'Rosa', 'last_name' => 'Villanueva', 'email' => 'rosa@demo.test', 'password' => Hash::make(self::PASSWORD), 'role' => User::ROLE_RESIDENT, 'barangay_id' => $b['Barangay 22'], 'email_verified_at' => now(), 'is_active' => true]);
        $rosa->update(['registration_id' => sprintf('REG-%06d', $rosa->id)]);
        NotificationService::notifyNewResidentRegistration($rosa);

        // Nena applied for the Social Pension and was approved.
        $application = ProgramApplication::create(['program_id' => $pension->id, 'resident_id' => $nena->id, 'status' => 'approved', 'applied_at' => now()->subDays(12)]);
        Beneficiary::create(['program_id' => $pension->id, 'resident_id' => $nena->id, 'application_id' => $application->id, 'status' => 'active', 'added_by' => $agencyUser->id, 'date_added' => now()->subDays(9)]);
        $pension->increment('slots_filled');
        NotificationService::notifyApplicationOutcome($nena->id, $pension->title, 'approved');

        // A few other applications so the agency has a queue to review.
        foreach ([$this->named['teresita'], $this->named['jocelyn']] as $resident) {
            foreach (Program::where('status', 'active')->get() as $program) {
                if (app(ProgramEligibilityService::class)->residentQualifies($program, $resident->load('sectors')) && ! ProgramApplication::where('program_id', $program->id)->where('resident_id', $resident->id)->exists()) {
                    ProgramApplication::create(['program_id' => $program->id, 'resident_id' => $resident->id, 'status' => 'pending', 'applied_at' => now()->subDays(mt_rand(1, 4))]);
                }
            }
        }

        // Ernesto has not applied to anything yet (so "Programs for you" is full of matches).
        ProgramApplication::where('resident_id', $ernesto->id)->delete();

        // The payout date, and the notification that goes with it.
        $starts = now()->addDays(3)->setTime(8, 0);
        $pension->schedules()->create(['title' => 'Payout', 'starts_at' => $starts, 'location' => 'Barangay 22 Covered Court', 'what_to_bring' => 'Valid ID and your resiTrack ID card', 'notes' => 'Seniors and PWDs are served first. Please come on time.', 'created_by' => $agencyUser->id]);
        $pension->schedules()->create(['title' => 'Second payout', 'starts_at' => $starts->copy()->addDays(30), 'location' => 'Barangay 22 Covered Court', 'what_to_bring' => 'Valid ID', 'created_by' => $agencyUser->id]);
        NotificationService::notify($nenaAccount->id, $nena->id, 'program_schedule', "{$pension->title}: Payout", $starts->format('l, F j, Y, g:i A')."\nWhere: Barangay 22 Covered Court\nBring: Valid ID and your resiTrack ID card", null, route('programs.show', $pension));
        NotificationService::notify($ernestoAccount->id, $ernesto->id, 'program_match', 'New program you may qualify for', "{$aics->title} is now open. Check if you're eligible and apply.", null, route('programs.show', $aics));

        // A certificate ready for pickup, and a report that is being worked on.
        $this->certificate($nena, $nenaAccount, 'indigency', 'Hospital bill for my grandchild', 'ready', 2, $secretary);
        $this->certificate($this->named['teresita'], null, 'residency', 'Scholarship application', 'pending', 0, $secretary);
        $this->certificate($this->named['jocelyn'], null, 'clearance', 'Job application', 'pending', 1, $secretary);
        $this->certificate($ernesto, $ernestoAccount, 'residency', 'Bank account opening', 'released', 9, $secretary);
        $this->concern($nena, $nenaAccount, 'streetlight', 'The streetlight at the corner of Purok 3 has been out for a week. It is very dark at night.', 'Purok 3, corner by the chapel', 'in_progress', 'Reported to the power company. A lineman is scheduled to come this week.');
        $this->concern($this->named['teresita'], null, 'garbage', 'Garbage has not been collected on our street since last Monday.', 'Purok 1', 'open', null);
        $this->concern($this->named['jocelyn'], null, 'drainage', 'The canal beside the basketball court overflows whenever it rains.', 'Near the basketball court', 'open', null);

        foreach (Announcement::all() as $announcement) {
            NotificationService::notifyAnnouncement($announcement->load('sectors'));
        }
    }

    private function residentAccount(Resident $resident, string $email, string $name): User
    {
        $user = User::create(['name' => $name, 'first_name' => $resident->first_name, 'last_name' => $resident->last_name, 'email' => $email, 'password' => Hash::make(self::PASSWORD), 'role' => User::ROLE_RESIDENT, 'barangay_id' => $resident->barangay_id, 'resident_id' => $resident->id, 'email_verified_at' => now(), 'is_active' => true]);
        NotificationService::notifyResidentProfileVerified($user, $resident);

        return $user;
    }

    private function certificate(Resident $resident, ?User $account, string $type, string $purpose, string $status, int $daysAgo, User $handler): void
    {
        $when = now()->subDays($daysAgo);
        $request = new DocumentRequest(['resident_id' => $resident->id, 'barangay_id' => $resident->barangay_id, 'requested_by' => $account?->id, 'type' => $type, 'purpose' => $purpose, 'status' => $status, 'handled_by' => $status === 'pending' ? null : $handler->id, 'ready_at' => $status === 'pending' ? null : $when->copy()->addDay(), 'released_at' => $status === 'released' ? $when->copy()->addDays(3) : null]);
        $request->created_at = $when;
        $request->updated_at = $when;
        $request->save();
        $request->assignReferenceNo();

        if ($status === 'ready' && $account) {
            NotificationService::notify($account->id, $resident->id, 'document_request', "Your {$request->typeLabel()} is ready", "Request {$request->reference_no} is ready for pickup at the Barangay Hall. Bring a valid ID.", null, route('documents.index'));
        }
    }

    private function concern(Resident $resident, ?User $account, string $category, string $text, string $where, string $status, ?string $response): void
    {
        $when = now()->subDays(mt_rand(1, 6));
        $concern = new Concern(['resident_id' => $resident->id, 'barangay_id' => $resident->barangay_id, 'reported_by' => $account?->id, 'category' => $category, 'description' => $text, 'location' => $where, 'status' => $status, 'response' => $response, 'handled_by' => $response ? $this->staff['bhw@resitrack.test']->id : null]);
        $concern->created_at = $when;
        $concern->updated_at = $when;
        $concern->save();
        $concern->assignReferenceNo();
    }

    // --- Fresh activity so the Activity Log and dashboards look alive ----------

    private function activity(): void
    {
        $people = ['bhw@resitrack.test', 'bhw2@resitrack.test', 'secretary@resitrack.test', 'agency@resitrack.test'];

        foreach ($people as $email) {
            $user = $this->staff[$email];

            foreach (range(0, 9) as $day) {
                $when = Carbon::now()->subDays($day)->setTime(mt_rand(7, 9), mt_rand(0, 59));
                AuditLog::create(['user_id' => $user->id, 'action' => 'login', 'table_affected' => 'users', 'record_id' => $user->id, 'performed_at' => $when, 'created_at' => $when, 'updated_at' => $when]);
            }
        }
    }
}
