<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\Beneficiary;
use App\Models\Concern;
use App\Models\DocumentRequest;
use App\Models\DuplicateAlert;
use App\Models\Household;
use App\Models\HouseholdWellbeingAssessment;
use App\Models\PartnerAgency;
use App\Models\PasswordRecoveryRequest;
use App\Models\Program;
use App\Models\ProgramApplication;
use App\Models\Resident;
use App\Models\User;
use App\Models\VulnerabilitySector;
use App\Models\WellbeingLevel;
use App\Services\DuplicateDetectionService;
use App\Services\NotificationService;
use App\Services\PsgcAddress;
use App\Services\SectorClassificationService;
use Carbon\CarbonInterface;
use Faker\Factory;
use Faker\Generator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

/**
 * About a thousand residents, and everything that hangs off them, to see how
 * the whole system behaves at a realistic size. Run it through
 * `php artisan data:seed loadtest`, which gives it its own database file.
 *
 * Every random choice comes from one fixed seed, so two runs make the same data.
 * All accounts end in @loadtest.test: staff and agencies use their email as the
 * password, residents use "password".
 */
class LoadTestSeeder extends Seeder
{
    private const SEED = 20260926;

    /** Share of residents per barangay: the pilot is the biggest. */
    private const BARANGAY_WEIGHTS = ['Barangay 22' => 40, 'Barangay 23' => 25, 'Barangay 21' => 20, 'Barangay 24' => 15];

    private const STREETS = ['Corrales Avenue', 'Tiano Brothers Street', 'Velez Street', 'Yacapin Street', 'Hayes Street', 'Pabayo Street', 'Chavez Street', 'Osmena Street', 'Akut Street', 'Mabini Street'];

    private const JOBS = ['Farmer', 'Market vendor', 'Tricycle driver', 'Carpenter', 'Teacher', 'Laundry worker', 'Sari-sari store owner', 'Security guard', 'Nurse aide', 'Barangay tanod', 'Construction worker', 'Cashier', 'Seamstress', 'Fisherman', 'Fish vendor', 'Electrician', 'Mechanic', 'Househelper', 'Call center agent', 'Jeepney driver', 'Cook', 'Janitor'];

    private const NOTICES = [
        ['Barangay Assembly this Saturday', 'All residents are invited to the quarterly barangay assembly at the covered court, 9:00 AM.'],
        ['Free medical and dental mission', 'A free check-up, dental extraction and vitamins will be given at the barangay hall from 8:00 AM until noon.'],
        ['Social Pension payout schedule', 'Qualified senior citizens may claim their social pension at the barangay hall next week. Bring a valid ID.'],
        ['Anti-rabies vaccination for pets', 'Bring your dogs and cats to the covered court for free vaccination. Please keep them on a leash.'],
        ['Water interruption notice', 'Water supply will be interrupted tomorrow from 9:00 AM to 3:00 PM for pipe repairs. Please store water ahead.'],
        ['Clean-up drive', 'Join the barangay-wide clean-up drive. Gloves and sacks will be provided. Meet at the hall at 6:00 AM.'],
        ['Registration for the livelihood training', 'Slots are limited. Register at the barangay hall with a valid ID before the end of the month.'],
        ['Typhoon preparedness reminder', 'Prepare a go-bag, charge your phones and know your evacuation center. Listen for announcements from the barangay.'],
        ['Feeding program for children', 'Children aged 3 to 12 are invited to the supplementary feeding at the daycare center every Monday.'],
        ['Update your household information', 'Please visit the barangay hall to update your household details so you are matched with the right programs.'],
    ];

    private const PROGRAMS = [
        // agency type, title, description, sectors
        ['DSWD', '4Ps Family Support Grant', 'Cash grant for poor households with children in school.', ['SOLO_PARENT']],
        ['DSWD', 'Sustainable Livelihood Program', 'Start-up capital and training for a small business.', ['SOLO_PARENT', 'OSY']],
        ['DSWD', 'Supplementary Feeding for Mothers', 'Nutrition packs and check-ups for pregnant and nursing mothers.', ['PREGNANT']],
        ['DSWD', 'Assistive Devices for Persons with Disability', 'Wheelchairs, crutches and hearing aids.', ['PWD']],
        ['DSWD', 'Burial Assistance', 'Financial help for the burial of a family member.', []],
        ['DSWD', 'Senior Wellness Day', 'Check-ups, vitamins and a hot meal for senior citizens.', ['SENIOR']],
        ['DSWD', 'Cash-for-Work Clean-up', 'Short paid work for out-of-school youth.', ['OSY']],
        ['DSWD', 'Emergency Shelter Assistance', 'Help with repairs or a temporary shelter after a fire or flood.', []],
        ['PESO', 'Job Fair 2026', 'Employers hiring on the spot. Bring your resume.', ['OSY']],
        ['PESO', 'Welding and Electrical Skills Training', 'Free NCII-aligned short course with a certificate.', ['OSY']],
        ['PESO', 'Government Internship Program', 'Paid internship in a city office.', ['OSY']],
        ['PESO', 'Livelihood Program for Persons with Disability', 'Livelihood kits and training.', ['PWD']],
        ['PESO', 'Job Referral for Solo Parents', 'Priority referral to partner employers.', ['SOLO_PARENT']],
        ['PESO', 'Special Program for Employment of Students', 'Summer work for students.', ['OSY']],
        ['PESO', 'Skills Certification for Solo Parents', 'Free certification courses with a training allowance.', ['SOLO_PARENT']],
        ['CEDO', 'Micro-enterprise Loan', 'Low-interest loans for small businesses.', []],
        ['CEDO', 'Sari-sari Store Support', 'Starter stock and a business permit walk-through.', []],
        ['CEDO', 'Market Stall Assistance', 'Discounted stalls for small vendors.', []],
        ['CEDO', 'Sewing Livelihood for Mothers', 'Sewing machines and training.', ['SOLO_PARENT', 'PREGNANT']],
        ['CEDO', 'Senior Craft Cooperative', 'Join a craft cooperative and earn from your skills.', ['SENIOR']],
        ['CEDO', 'Entrepreneurship for Persons with Disability', 'Business coaching and seed money.', ['PWD']],
    ];

    private Generator $f;

    /** @var array<int, Barangay> */
    private array $barangays = [];

    /** @var array<int, array<int, User>> staff per barangay: [barangay_id => [users]] */
    private array $bhws = [];

    /** @var array<int, User> */
    private array $admins = [];

    /** @var array<int, User> */
    private array $agencyUsers = [];

    /** @var array<int, array<int, Model>> */
    private array $zones = [];

    /** @var array<int, array{region: ?string, province: ?string, city: ?string, barangay: ?string}|null> */
    private array $codes = [];

    private PsgcAddress $psgc;

    /** Highest ids that existed before this run, so a run on a database that already has data only touches its own rows. */
    private int $householdFloor = 0;

    private int $alertFloor = 0;

    private int $notificationFloor = 0;

    private int $philsys = 100000;

    /** @var array<int, array<string, mixed>> */
    private array $audit = [];

    public function __construct(
        private readonly SectorClassificationService $classifier,
        private readonly DuplicateDetectionService $duplicates,
    ) {}

    public function run(): void
    {
        abort_if(app()->isProduction(), 500, 'The load-test data is for development machines only.');

        if (User::where('email', 'admin.b22@loadtest.test')->exists()) {
            throw new RuntimeException('The load-test data is already in this database.');
        }

        $this->psgc = app(PsgcAddress::class);
        $this->householdFloor = (int) Household::max('id');
        $this->alertFloor = (int) DuplicateAlert::max('id');
        $this->notificationFloor = (int) DB::table('app_notifications')->max('id');

        mt_srand(self::SEED);
        $this->f = Factory::create('en_PH');
        $this->f->seed(self::SEED);

        $target = (int) config('dataset.residents', 1000);

        DB::transaction(function () use ($target) {
            $this->barangays = Barangay::all()->keyBy('id')->all();
            $this->staff();
            $this->agencies();
            $residents = $this->households($target);
            $this->classifyAll();
            $this->plantDuplicates($residents);
            $accounts = $this->residentAccounts();
            $programs = $this->programs();
            $this->applications($programs);
            $this->schedules($programs);
            $this->announcementsAndNotifications($programs);
            $this->wellbeing();
            $this->certificates($accounts);
            $this->concerns($accounts);
            $this->accountRequests($accounts);
            $this->history($accounts);
        });

    }

    // --- Small helpers -----------------------------------------------------

    /**
     * @param  array<int|string, int>  $weights
     */
    private function weighted(array $weights): string|int
    {
        $roll = mt_rand(1, (int) array_sum($weights));

        foreach ($weights as $key => $weight) {
            $roll -= $weight;

            if ($roll <= 0) {
                return $key;
            }
        }

        return array_key_first($weights);
    }

    private function chance(int $percent): bool
    {
        return mt_rand(1, 100) <= $percent;
    }

    /**
     * @param  array<int|string, mixed>  $items
     */
    private function pick(array $items): mixed
    {
        return $items[array_rand($items)];
    }

    private function daysAgo(int $max, float $bias = 1.6): CarbonInterface
    {
        $fraction = (mt_rand() / mt_getrandmax()) ** $bias;

        return now()->subDays((int) ($max * $fraction))->subMinutes(mt_rand(0, 1400));
    }

    /** A follow-up step some days after $when, but never later than now. */
    private function after(CarbonInterface $when, int $min, int $max): CarbonInterface
    {
        $later = $when->copy()->addDays(mt_rand($min, $max));

        return $later->greaterThan(now()) ? now()->subMinutes(mt_rand(1, 600)) : $later;
    }

    private function barangayNumber(Barangay $barangay): int
    {
        return (int) filter_var($barangay->name, FILTER_SANITIZE_NUMBER_INT);
    }

    private function user(string $name, string $email, string $role, ?int $barangayId, ?int $agencyId = null, ?string $password = null): User
    {
        [$first, $last] = array_pad(explode(' ', $name, 2), 2, '');

        return User::create([
            'name' => $name,
            'first_name' => $first,
            'last_name' => $last,
            'email' => $email,
            'password' => Hash::make($password ?? $email),
            'role' => $role,
            'barangay_id' => $barangayId,
            'agency_id' => $agencyId,
            'email_verified_at' => now()->subDays(mt_rand(30, 300)),
            'is_active' => true,
        ]);
    }

    // --- People who work in the system -------------------------------------

    private function staff(): void
    {
        foreach ($this->barangays as $barangay) {
            $number = $this->barangayNumber($barangay);
            $this->codes[$barangay->id] = $this->psgc->defaultsFor($barangay);

            foreach (range(1, 6) as $purok) {
                $this->zones[$barangay->id][] = $barangay->zones()->firstOrCreate(['zone_name' => "Purok {$purok}"]);
            }

            $this->admins[$barangay->id] = $this->user($this->f->name(), "admin.b{$number}@loadtest.test", User::ROLE_BARANGAY_ADMIN, $barangay->id);

            foreach (range(1, 4) as $i) {
                $this->bhws[$barangay->id][] = $this->user($this->f->name(), "bhw{$i}.b{$number}@loadtest.test", User::ROLE_BHW, $barangay->id);
            }

            // The accounts from the normal seed work as BHWs too.
            foreach (User::where('barangay_id', $barangay->id)->where('role', User::ROLE_BHW)->where('email', 'not like', '%loadtest%')->get() as $existing) {
                $this->bhws[$barangay->id][] = $existing;
            }
        }
    }

    private function agencies(): void
    {
        foreach (PartnerAgency::all() as $agency) {
            $type = strtolower((string) $agency->agency_type);
            $this->agencyUsers[] = $this->user("{$agency->agency_type} Officer", "agency.{$type}.city@loadtest.test", User::ROLE_PARTNER_AGENCY, null, $agency->id);

            foreach (array_rand($this->barangays, 2) as $barangayId) {
                $number = $this->barangayNumber($this->barangays[$barangayId]);
                $this->agencyUsers[] = $this->user($this->f->name(), "agency.{$type}.b{$number}@loadtest.test", User::ROLE_PARTNER_AGENCY, $barangayId, $agency->id);
            }
        }

        // The account from the normal seed too.
        foreach (User::where('role', User::ROLE_PARTNER_AGENCY)->where('email', 'not like', '%loadtest%')->get() as $existing) {
            $this->agencyUsers[] = $existing;
        }
    }

    // --- Households and residents ------------------------------------------

    /** @return array<int, Resident> */
    private function households(int $target): array
    {
        $residents = [];
        $barangayIds = array_keys($this->barangays);
        $weights = [];

        foreach ($this->barangays as $id => $barangay) {
            $weights[$id] = self::BARANGAY_WEIGHTS[$barangay->name] ?? 10;
        }

        while (count($residents) < $target) {
            $barangay = $this->barangays[$this->weighted($weights)];
            $bhw = $this->pick($this->bhws[$barangay->id]);
            $registered = $this->daysAgo(180);
            $lastName = $this->f->lastName();

            $members = $this->members((int) $this->weighted([1 => 10, 2 => 18, 3 => 22, 4 => 22, 5 => 15, 6 => 8, 7 => 5]), (string) $this->weighted(['couple_kids' => 30, 'single_parent' => 24, 'senior_only' => 14, 'senior_family' => 11, 'single' => 9, 'extended' => 12]));

            $zone = $this->pick($this->zones[$barangay->id]);
            $street = mt_rand(1, 300).' '.$this->pick(self::STREETS).', '.$zone->getAttribute('zone_name');
            $codes = $this->codes[$barangay->id] ?? null;
            $household = Household::create([
                'barangay_id' => $barangay->id,
                'zone_id' => $zone->getKey(),
                'household_number' => 'HH-'.mt_rand(1000, 9999),
                'address' => $codes ? $this->psgc->compose($codes, $street, '9000') : $street.', '.$barangay->name,
                ...($codes ? ['address_region_code' => $codes['region'], 'address_province_code' => $codes['province'], 'address_city_code' => $codes['city'], 'address_barangay_code' => $codes['barangay'], 'address_street' => $street, 'address_zip' => '9000'] : []),
                'house_materials' => $this->pick(['concrete', 'semi-concrete', 'light materials']),
                'house_ownership' => $this->weighted(['owned' => 60, 'rented' => 25, 'shared' => 15]),
                'water_source' => $this->weighted(['pipe' => 70, 'well' => 20, 'others' => 10]),
                'electricity_source' => $this->weighted(['metered' => 75, 'shared' => 20, 'none' => 5]),
                'waste_management' => $this->weighted(['collected' => 70, 'burned' => 20, 'others' => 10]),
                'toilet_facility' => $this->weighted(['private' => 70, 'shared' => 22, 'none' => 8]),
                'member_count' => count($members),
                'monthly_income' => mt_rand(3000, 30000),
                'is_4ps_beneficiary' => $this->chance(25),
            ]);
            $household->forceFill(['household_id' => sprintf('HH-%06d', $household->id), 'created_at' => $registered, 'updated_at' => $registered])->save();

            foreach ($members as $member) {
                $residents[] = $this->resident($member, $lastName, $barangay, $household, $registered, $bhw);
            }
        }

        return $residents;
    }

    /**
     * @return array<int, array{age: int, sex: string, civil: string, solo: bool}>
     */
    private function members(int $size, string $type): array
    {
        $man = fn (int $age, string $civil = 'married') => ['age' => $age, 'sex' => 'male', 'civil' => $civil, 'solo' => false];
        $woman = fn (int $age, string $civil = 'married') => ['age' => $age, 'sex' => 'female', 'civil' => $civil, 'solo' => false];
        $child = fn (int $max) => ['age' => mt_rand(0, max(1, $max)), 'sex' => $this->chance(50) ? 'male' : 'female', 'civil' => 'single', 'solo' => false];

        $members = [];
        $headAge = mt_rand(26, 54);

        switch ($type) {
            case 'senior_only':
                $age = mt_rand(61, 86);
                $members[] = $this->chance(50) ? $man($age, 'widowed') : $woman($age, 'widowed');

                if ($size >= 2) {
                    $members = [$man($age), $woman(max(58, $age - mt_rand(0, 6)))];
                }

                break;
            case 'senior_family':
                $age = mt_rand(62, 84);
                $members[] = $this->chance(60) ? $woman($age, 'widowed') : $man($age, 'widowed');
                $adult = $age - mt_rand(24, 34);
                $members[] = $this->chance(50) ? $man($adult) : $woman($adult);
                break;
            case 'single':
                $members[] = $this->chance(50) ? $man(mt_rand(20, 58), 'single') : $woman(mt_rand(20, 58), 'single');
                break;
            case 'single_parent':
                $head = $this->chance(75) ? $woman($headAge, $this->pick(['separated', 'widowed', 'single'])) : $man($headAge, $this->pick(['separated', 'widowed']));
                $head['solo'] = $size >= 2 && $this->chance(95);
                $members[] = $head;
                break;
            default: // couple_kids, extended
                $members[] = $man($headAge);
                $members[] = $woman(max(20, $headAge - mt_rand(-3, 6)));

                if ($type === 'extended') {
                    $members[] = $this->chance(50) ? $woman(mt_rand(63, 82), 'widowed') : $man(mt_rand(63, 82), 'widowed');
                }
        }

        while (count($members) < $size) {
            $members[] = $child(min(24, max(1, $headAge - 18)));
        }

        return array_slice($members, 0, max(1, $size));
    }

    /**
     * @param  array{age: int, sex: string, civil: string, solo: bool}  $m
     */
    private function resident(array $m, string $lastName, Barangay $barangay, Household $household, CarbonInterface $registered, User $bhw): Resident
    {
        $age = $m['age'];
        $education = match (true) {
            $age < 7 => 'none',
            $age < 13 => 'elementary',
            $age < 18 => 'highschool',
            default => $this->weighted(['elementary' => 15, 'highschool' => 40, 'college' => 30, 'vocational' => 10, 'none' => 5]),
        };
        $status = match (true) {
            $age < 15 => $age < 6 ? 'not_enrolled' : 'enrolled',
            $age <= 24 => $this->weighted(['enrolled' => 55, 'not_enrolled' => 30, 'graduated' => 15]),
            default => $this->weighted(['graduated' => 60, 'not_enrolled' => 40]),
        };
        $employment = match (true) {
            $age < 15 => 'unemployed',
            $age < 60 => $this->weighted(['employed' => 45, 'self_employed' => 25, 'unemployed' => 30]),
            default => $this->weighted(['unemployed' => 55, 'self_employed' => 35, 'employed' => 10]),
        };
        $income = match ($employment) {
            'employed' => mt_rand(8000, 25000),
            'self_employed' => mt_rand(4000, 15000),
            default => $this->chance(60) ? null : mt_rand(0, 3000),
        };
        $female = $m['sex'] === 'female';
        $firstName = $female ? $this->f->firstNameFemale() : $this->f->firstNameMale();
        $pregnant = $female && $age >= 18 && $age <= 40 && $this->chance(5);
        $born = (string) $this->weighted(['Cagayan de Oro City' => 70, 'Iligan City' => 8, 'Bukidnon' => 8, 'Camiguin' => 4, 'Davao City' => 5, 'Cebu City' => 5]);
        $codes = $this->codes[$barangay->id] ?? null;
        $local = $born === 'Cagayan de Oro City' && $codes !== null;

        $resident = Resident::create([
            'household_id' => $household->id,
            'barangay_id' => $barangay->id,
            'philsys_card_no' => $this->chance(35) ? sprintf('%04d-%04d-%04d', 1000 + intdiv($this->philsys, 10000), $this->philsys % 10000, mt_rand(1000, 9999)) : null,
            'last_name' => $lastName,
            'first_name' => $firstName,
            'middle_name' => $this->chance(85) ? $this->f->lastName() : null,
            'suffix' => ! $female && $this->chance(4) ? $this->pick(['Jr.', 'Sr.', 'III']) : null,
            'date_of_birth' => now()->subYears($age)->subDays(mt_rand(0, 360))->toDateString(),
            'place_of_birth' => $local ? $this->psgc->compose(['region' => $codes['region'], 'province' => $codes['province'], 'city' => $codes['city']]) : $born,
            ...($local ? ['birth_region_code' => $codes['region'], 'birth_province_code' => $codes['province'], 'birth_city_code' => $codes['city']] : []),
            'sex' => $m['sex'],
            'civil_status' => $age < 18 ? 'single' : $m['civil'],
            'religion' => $this->weighted(['Roman Catholic' => 75, 'Islam' => 8, 'Iglesia ni Cristo' => 7, 'Protestant' => 10]),
            'citizenship' => 'Filipino',
            'contact_number' => $age >= 15 ? '09'.mt_rand(100000000, 999999999) : null,
            'email' => $age >= 18 && $this->chance(25) ? strtolower(preg_replace('/[^a-z]/i', '', $firstName.$lastName)).mt_rand(1, 999).'@example.com' : null,
            'address' => $household->address,
            ...($codes ? ['address_region_code' => $codes['region'], 'address_province_code' => $codes['province'], 'address_city_code' => $codes['city'], 'address_barangay_code' => $codes['barangay'], 'address_street' => $household->getAttribute('address_street'), 'address_zip' => $household->getAttribute('address_zip')] : []),
            'occupation' => $employment === 'unemployed' ? null : $this->pick(self::JOBS),
            'employment_status' => $employment,
            'education_level' => $education,
            'education_status' => $status,
            'monthly_income' => $income,
            'is_pwd' => $age >= 4 && $this->chance(4),
            'is_solo_parent' => $m['solo'],
            'is_pregnant' => $pregnant,
            'pregnancy_expected_month' => $pregnant ? now()->startOfMonth()->addMonths(mt_rand(1, 8))->toDateString() : null,
            'pregnancy_source' => $pregnant ? ($this->chance(30) ? 'self' : 'staff') : null,
            'is_active' => true,
            'registered_at' => $registered,
            'profiled_by_user_id' => $bhw->id,
            'profiled_at' => $registered,
        ]);
        $this->philsys += mt_rand(1, 9000);

        $resident->forceFill(['resident_id' => Resident::nextOfficialId((int) $resident->barangay_id, $registered), 'created_at' => $registered, 'updated_at' => $registered])->save();
        $this->audit[] = $this->entry($bhw->id, 'create', 'residents', $resident->id, null, ['name' => $resident->full_name], $registered);

        return $resident;
    }

    private function classifyAll(): void
    {
        Resident::query()->orderBy('id')->each(fn (Resident $resident) => $this->classifier->classify($resident));
    }

    // --- Duplicates and transfers ------------------------------------------

    /** @param  array<int, Resident>  $residents */
    private function plantDuplicates(array $residents): void
    {
        $adults = array_values(array_filter($residents, fn (Resident $r) => $r->age >= 18 && $r->age <= 70));
        $planted = 0;

        foreach (array_rand($adults, 26) as $index) {
            $original = $adults[$index];
            $sameBarangay = $planted < 16;
            $barangayId = $sameBarangay ? $original->barangay_id : $this->pick(array_values(array_diff(array_keys($this->barangays), [$original->barangay_id])));
            $bhw = $this->pick($this->bhws[$barangayId]);
            $when = $this->daysAgo(120);

            $copy = Resident::create([
                'barangay_id' => $barangayId,
                'philsys_card_no' => $sameBarangay ? null : $original->philsys_card_no,
                'last_name' => $sameBarangay && $this->chance(40) ? strtoupper($original->last_name) : $original->last_name,
                'first_name' => $original->first_name,
                'middle_name' => $sameBarangay && $this->chance(50) ? null : $original->middle_name,
                'date_of_birth' => $original->date_of_birth?->toDateString(),
                'sex' => $original->sex,
                'civil_status' => $original->civil_status,
                'citizenship' => 'Filipino',
                'contact_number' => $original->contact_number,
                'address' => $this->barangays[$barangayId]->name,
                'employment_status' => $original->employment_status,
                'education_level' => $original->education_level,
                'education_status' => $original->education_status,
                'is_active' => true,
                'registered_at' => $when,
                'profiled_by_user_id' => $bhw->id,
                'profiled_at' => $when,
            ]);
            $copy->forceFill(['resident_id' => Resident::nextOfficialId((int) $copy->barangay_id, $when), 'created_at' => $when, 'updated_at' => $when])->save();

            $this->classifier->classify($copy);
            $this->duplicates->scan($copy);
            $this->audit[] = $this->entry($bhw->id, 'create', 'residents', $copy->id, null, ['name' => $copy->full_name], $when);
            $planted++;
        }

        // Give the alerts the mix a real barangay would have: mostly waiting, some handled.
        foreach (DuplicateAlert::query()->where('id', '>', $this->alertFloor)->orderBy('id')->get() as $i => $alert) {
            $barangayId = (int) (Resident::whereKey($alert->resident_id_1)->value('barangay_id') ?? array_key_first($this->barangays));
            $admin = $this->admins[$barangayId] ?? $this->pick($this->admins);
            $when = $this->daysAgo(90);
            $roll = $i % 10;

            if ($roll <= 1) {
                $alert->update(['status' => 'resolved', 'resolved_by' => $admin->id, 'resolved_at' => $when]);
                Resident::whereKey($alert->resident_id_2)->update(['is_active' => false]);
                $this->audit[] = $this->entry($admin->id, 'resolve', 'duplicate_alerts', $alert->id, null, ['kept_resident_id' => $alert->resident_id_1], $when);
            } elseif ($roll === 2) {
                $alert->update(['status' => 'dismissed', 'resolved_by' => $admin->id, 'resolved_at' => $when]);
                $this->audit[] = $this->entry($admin->id, 'dismiss', 'duplicate_alerts', $alert->id, null, null, $when);
            } elseif ($roll === 3) {
                $bhw = $this->pick($this->bhws[$barangayId] ?? Arr::first($this->bhws));
                DuplicateAlert::whereKey($alert->id)->update(['escalated_at' => $when, 'escalated_by' => $bhw->id, 'escalation_note' => 'Not sure which record is correct. Please decide.']);
                $this->audit[] = $this->entry($bhw->id, 'escalate', 'duplicate_alerts', $alert->id, null, ['note' => 'Not sure which record is correct. Please decide.'], $when);
            }
        }
    }

    // --- Accounts for residents --------------------------------------------

    /** @return array<int, User> */
    private function residentAccounts(): array
    {
        $accounts = [];
        $pool = Resident::query()->where('is_active', true)->whereNull('transferred_to_barangay')->whereDoesntHave('portalAccount')->get()->filter(fn (Resident $r) => $r->age >= 16)->shuffle()->take(200);
        $password = Hash::make('password');

        foreach ($pool->values() as $i => $resident) {
            $user = User::create([
                'name' => $resident->full_name,
                'first_name' => $resident->first_name,
                'last_name' => $resident->last_name,
                'email' => 'resident'.($i + 1).'@loadtest.test',
                'password' => $password,
                'role' => User::ROLE_RESIDENT,
                'barangay_id' => $resident->barangay_id,
                'resident_id' => $resident->id,
                'email_verified_at' => now(),
                'is_active' => true,
            ]);
            $user->forceFill(['created_at' => $resident->registered_at, 'updated_at' => $resident->registered_at, 'last_login_at' => $this->daysAgo(30)])->save();
            $accounts[] = $user;
        }

        // People who signed up online and are still waiting to be verified in person.
        foreach (range(1, 15) as $i) {
            $barangay = $this->barangays[$this->weighted(array_map(fn () => 10, $this->barangays))];
            $first = $this->f->firstName();
            $last = $this->f->lastName();
            $user = User::create([
                'name' => "{$first} {$last}",
                'first_name' => $first,
                'last_name' => $last,
                'email' => "pending{$i}@loadtest.test",
                'password' => $password,
                'role' => User::ROLE_RESIDENT,
                'barangay_id' => $barangay->id,
                'email_verified_at' => now(),
                'is_active' => true,
            ]);
            $user->update(['registration_id' => sprintf('REG-%06d', $user->id)]);
        }

        return $accounts;
    }

    // --- Programs, applications, claim dates -------------------------------

    /** @return array<int, Program> */
    private function programs(): array
    {
        $sectorIds = VulnerabilitySector::pluck('id', 'code');
        $agencies = PartnerAgency::pluck('id', 'agency_type');
        $programs = Program::query()->get()->all();

        foreach (self::PROGRAMS as $i => [$type, $title, $description, $codes]) {
            $agencyId = $agencies[$type];
            $city = $this->chance(60);
            $barangayId = $city ? null : $this->pick(array_keys($this->barangays));
            $poster = collect($this->agencyUsers)->first(fn (User $u) => $u->agency_id === $agencyId && $u->barangay_id === null) ?? $this->agencyUsers[0];
            $status = $i % 9 === 4 ? 'inactive' : $this->weighted(['active' => 82, 'expired' => 18]);
            $start = now()->subDays(mt_rand(-10, 90));
            $end = $status === 'expired' ? now()->subDays(mt_rand(1, 40)) : $start->copy()->addDays(mt_rand(30, 150));
            $slots = $this->chance(10) ? 0 : $this->pick([10, 15, 20, 25, 40, 60, 100, 150]);

            $program = Program::create([
                'agency_id' => $agencyId,
                'barangay_id' => $barangayId,
                'posted_by' => $poster->id,
                'title' => $title,
                'description' => $description,
                'eligibility_criteria' => $codes ? 'Open to residents in the target sectors.' : 'Open to all residents.',
                'slots_available' => $slots,
                'slots_filled' => 0,
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
                'status' => $status,
            ]);
            $program->sectors()->sync(collect($codes)->map(fn ($code) => $sectorIds[$code])->all());
            // A program is created before it opens, so a start date still ahead does not date its creation.
            $created = $start->greaterThan(now()) ? now()->subDays(mt_rand(1, 10)) : $start;
            $program->forceFill(['created_at' => $created, 'updated_at' => $created])->save();
            $this->audit[] = $this->entry($poster->id, 'create', 'programs', $program->id, null, ['title' => $title], $created);
            $programs[] = $program;
        }

        return $programs;
    }

    /** @param  array<int, Program>  $programs */
    private function applications(array $programs): void
    {
        $sectorsByResident = DB::table('resident_sectors')
            ->join('vulnerability_sectors', 'vulnerability_sectors.id', '=', 'resident_sectors.sector_id')
            ->get(['resident_id', 'vulnerability_sectors.code'])
            ->groupBy('resident_id')
            ->map(fn ($rows) => $rows->pluck('code')->all())
            ->all();
        $residents = Resident::query()->where('is_active', true)->get(['id', 'barangay_id'])->all();

        foreach ($programs as $program) {
            $codes = $program->sectors()->pluck('code')->all();
            $poster = User::find($program->posted_by);
            $pool = array_values(array_filter($residents, function ($r) use ($program, $codes, $sectorsByResident) {
                if ($program->barangay_id && $program->barangay_id !== $r->barangay_id) {
                    return false;
                }

                return $codes === [] || array_intersect($codes, $sectorsByResident[$r->id] ?? []) !== [];
            }));

            if ($pool === []) {
                continue;
            }

            $wanted = min(count($pool), $program->slots_available > 0 ? (int) ($program->slots_available * mt_rand(90, 170) / 100) : mt_rand(20, 90), max(6, (int) (count($pool) * mt_rand(35, 75) / 100)));
            $filled = 0;

            foreach (array_slice((array) array_rand(array_flip(array_column($pool, 'id')), min($wanted, count($pool))), 0) as $residentId) {
                $applied = $this->daysAgo(75);
                $status = $this->weighted(['approved' => 45, 'pending' => 35, 'rejected' => 20]);
                $full = $program->slots_available > 0 && $filled >= $program->slots_available;

                if ($status === 'approved' && $full) {
                    $status = 'pending';
                }

                $application = ProgramApplication::create(['program_id' => $program->id, 'resident_id' => $residentId, 'status' => $status, 'applied_at' => $applied]);
                $application->forceFill(['created_at' => $applied, 'updated_at' => $applied])->save();

                $this->audit[] = $this->entry(($this->userOfResident((int) $residentId) ?? $poster)->id, 'apply', 'program_applications', $application->id, null, ['program' => $program->title, 'resident' => 'Resident #'.$residentId], $applied);

                if ($status === 'approved') {
                    $added = $this->after($applied, 1, 6);
                    $beneficiary = Beneficiary::create(['program_id' => $program->id, 'resident_id' => $residentId, 'application_id' => $application->id, 'status' => $this->chance(92) ? 'active' : 'inactive', 'added_by' => $poster->id, 'date_added' => $added]);
                    $beneficiary->forceFill(['created_at' => $added, 'updated_at' => $added])->save();
                    $filled++;
                    $this->audit[] = $this->entry($poster->id, 'approve', 'program_applications', $application->id, null, ['program' => $program->title], $added);
                } elseif ($status === 'rejected') {
                    $this->audit[] = $this->entry($poster->id, 'reject', 'program_applications', $application->id, null, null, $this->after($applied, 1, 6));
                }
            }

            // A few programs end up completely full, which is what the Apply button has to handle.
            if ($program->slots_available > 0 && $filled >= 4 && $this->fullPrograms < 3 && $program->status === 'active') {
                $program->slots_available = $filled;
                $this->fullPrograms++;
            }

            $program->update(['slots_filled' => $filled, 'slots_available' => $program->slots_available]);
        }
    }

    /** @var array<int, User> */
    private array $accountByResident = [];

    private int $fullPrograms = 0;

    /** @var Collection<int, Resident>|null */
    private ?Collection $residentCache = null;

    /** @return Collection<int, Resident> */
    private function allResidents(): Collection
    {
        return $this->residentCache ??= Resident::query()->get(['id', 'first_name', 'middle_name', 'last_name', 'suffix', 'barangay_id']);
    }

    private function userOfResident(int $residentId): ?User
    {
        if ($this->accountByResident === []) {
            $this->accountByResident = User::whereNotNull('resident_id')->get()->keyBy('resident_id')->all();
        }

        return $this->accountByResident[$residentId] ?? null;
    }

    /** @param  array<int, Program>  $programs */
    private function schedules(array $programs): void
    {
        foreach ($programs as $program) {
            if ($program->beneficiaries()->where('status', 'active')->count() < 3 || ! $this->chance(65)) {
                continue;
            }

            foreach (range(1, mt_rand(1, 2)) as $n) {
                $starts = now()->addDays(mt_rand(-40, 45))->setTime($this->pick([8, 9, 13, 14]), 0);
                $program->schedules()->create([
                    'title' => $this->pick(['Payout', 'Distribution', 'Claiming day', 'Check-up day']),
                    'starts_at' => $starts,
                    'location' => $this->pick(['Barangay Covered Court', 'Barangay Hall', 'Daycare Center', 'Multi-purpose Hall']),
                    'what_to_bring' => $this->pick(['Valid ID and your resiTrack ID card', 'Valid ID', 'Claim stub and valid ID']),
                    'notes' => $this->chance(40) ? 'Seniors and PWDs are served first.' : null,
                    'created_by' => $program->posted_by,
                ]);
            }
        }
    }

    // --- Announcements and notifications -----------------------------------

    /** @param  array<int, Program>  $programs */
    private function announcementsAndNotifications(array $programs): void
    {
        $sectors = VulnerabilitySector::pluck('id');

        foreach ($this->barangays as $barangay) {
            foreach (range(1, 7) as $i) {
                [$title, $content] = self::NOTICES[array_rand(self::NOTICES)];
                $posted = $this->daysAgo(170);
                $announcement = Announcement::create([
                    'posted_by' => $this->admins[$barangay->id]->id,
                    'barangay_id' => $barangay->id,
                    'title' => $title,
                    'content' => $content,
                    'posted_at' => $posted,
                    'expires_at' => $this->chance(30) ? $posted->copy()->addDays(mt_rand(3, 30)) : null,
                ]);
                $announcement->forceFill(['created_at' => $posted, 'updated_at' => $posted])->save();

                if ($this->chance(30)) {
                    $announcement->sectors()->sync([$sectors->random()]);
                }

                NotificationService::notifyAnnouncement($announcement->load('sectors'));
                $this->audit[] = $this->entry($this->admins[$barangay->id]->id, 'create', 'announcements', $announcement->id, null, ['title' => $title], $posted);
            }
        }

        foreach ($programs as $program) {
            if ($program->status === 'active') {
                NotificationService::notifyProgramMatch($program->load('sectors'));
            }
        }

        foreach (ProgramApplication::query()->whereIn('status', ['approved', 'rejected'])->with('program:id,title')->get() as $application) {
            NotificationService::notifyApplicationOutcome($application->resident_id, (string) $application->program?->getAttribute('title'), $application->status);
        }

        // Spread the notifications over the last four months, and read most of them.
        DB::statement("UPDATE app_notifications SET created_at = datetime('now', '-' || (abs(random()) % 120) || ' days', '-' || (abs(random()) % 1400) || ' minutes'), updated_at = created_at WHERE id > {$this->notificationFloor}");
        DB::statement('UPDATE app_notifications SET is_read = 1, read_at = created_at WHERE id > '.$this->notificationFloor.' AND abs(random()) % 100 < 65');
    }

    // --- Household wellbeing ------------------------------------------------

    private function wellbeing(): void
    {
        $levels = WellbeingLevel::orderBy('id')->pluck('id')->all();

        foreach (Household::where('id', '>', $this->householdFloor)->get()->shuffle()->take(110) as $household) {
            $bhw = $this->pick($this->bhws[$household->barangay_id]);
            $dates = $this->chance(35) ? [$this->daysAgo(170, 0.8), $this->daysAgo(90)] : [$this->daysAgo(120)];
            usort($dates, fn (CarbonInterface $a, CarbonInterface $b) => $a <=> $b);

            foreach ($dates as $when) {
                $assessment = HouseholdWellbeingAssessment::create([
                    'household_id' => $household->id,
                    'level_id' => $levels[(int) $this->weighted([0 => 25, 1 => 50, 2 => 25])],
                    'assessed_by' => $bhw->id,
                    'assessment_date' => $when->toDateString(),
                    'remarks' => $this->chance(40) ? $this->pick(['Family has irregular income.', 'Improved since the last visit.', 'Children are in school.', 'Needs livelihood support.']) : null,
                ]);
                $this->audit[] = $this->entry($bhw->id, 'create', 'household_wellbeing_assessments', $assessment->id, null, ['household_id' => $household->id, 'level_id' => $assessment->level_id], $when);
            }
        }
    }

    // --- Certificates and reports -------------------------------------------

    /** @param  array<int, User>  $accounts */
    private function certificates(array $accounts): void
    {
        $purposes = ['Job application', 'Scholarship', 'Hospital bill', 'Bank account opening', 'School enrollment', 'Business permit', 'Burial assistance', 'Passport application'];

        foreach (range(1, 200) as $n) {
            $account = $this->chance(70) ? $this->pick($accounts) : null;
            $resident = $account ? Resident::findOrFail((int) $account->resident_id) : $this->allResidents()->random();
            $when = $this->daysAgo(150);
            $status = $this->weighted(['released' => 45, 'pending' => 30, 'ready' => 15, 'rejected' => 10]);
            $handler = $this->chance(50) ? $this->admins[$resident->barangay_id] : $this->pick($this->bhws[$resident->barangay_id]);

            $request = new DocumentRequest([
                'resident_id' => $resident->id,
                'barangay_id' => $resident->barangay_id,
                'requested_by' => $account?->id,
                'type' => $this->weighted(['residency' => 40, 'indigency' => 30, 'clearance' => 30]),
                'purpose' => $this->pick($purposes),
                'status' => $status,
                'remarks' => $status === 'rejected' ? $this->pick(['Please bring a valid ID and a recent proof of billing.', 'No record of residence found. Please visit the hall.']) : null,
                'handled_by' => $status === 'pending' ? null : $handler->id,
                'ready_at' => in_array($status, ['ready', 'released'], true) ? $this->after($when, 1, 3) : null,
                'released_at' => $status === 'released' ? $this->after($when, 3, 7) : null,
            ]);
            $request->created_at = $when;
            $request->updated_at = $when;
            $request->save();
            $request->assignReferenceNo();

            $this->audit[] = $this->entry(($account ?? $handler)->id, 'create', 'document_requests', $request->id, null, ['type' => $request->type, 'reference_no' => $request->reference_no, 'source' => 'self_service'], $when);

            if ($status !== 'pending') {
                $this->audit[] = $this->entry($handler->id, 'update', 'document_requests', $request->id, ['status' => 'pending'], ['status' => $status, 'reference_no' => $request->reference_no, 'type' => $request->type], $this->after($when, 1, 3));
            }
        }
    }

    /** @param  array<int, User>  $accounts */
    private function concerns(array $accounts): void
    {
        $texts = [
            'streetlight' => 'The streetlight near our house has been out for days and it is very dark at night.',
            'garbage' => 'Garbage was not collected on our street this week.',
            'drainage' => 'The canal overflows every time it rains and floods the road.',
            'road' => 'There is a big hole in the road that is dangerous for motorcycles.',
            'safety' => 'There are groups drinking loudly and fighting in front of the store every night.',
            'noise' => 'A neighbor plays loud karaoke past midnight almost every day.',
            'record_correction' => 'My birth date is wrong in my record. It should be corrected.',
            'other' => 'I would like to ask about the schedule of the next barangay assembly.',
        ];

        foreach (range(1, 150) as $n) {
            $account = $this->pick($accounts);
            $resident = Resident::findOrFail((int) $account->resident_id);
            $category = $this->weighted(['streetlight' => 18, 'garbage' => 20, 'drainage' => 14, 'road' => 12, 'safety' => 8, 'noise' => 10, 'record_correction' => 10, 'other' => 8]);
            $status = $this->weighted(['resolved' => 35, 'open' => 30, 'in_progress' => 20, 'closed' => 15]);
            $when = $this->daysAgo(150);
            $handler = $this->pick($this->bhws[$resident->barangay_id]);

            $concern = new Concern([
                'resident_id' => $resident->id,
                'barangay_id' => $resident->barangay_id,
                'reported_by' => $account->id,
                'category' => $category,
                'description' => $texts[(string) $category],
                'location' => $category === 'record_correction' ? null : 'Purok '.mt_rand(1, 6),
                'status' => $status,
                'response' => $status === 'open' ? null : $this->pick(['Thank you for reporting. We have informed the concerned office.', 'Fixed. Please tell us if the problem comes back.', 'Scheduled for this week.']),
                'handled_by' => $status === 'open' ? null : $handler->id,
                'resolved_at' => in_array($status, ['resolved', 'closed'], true) ? $this->after($when, 1, 14) : null,
            ]);
            $concern->created_at = $when;
            $concern->updated_at = $when;
            $concern->save();
            $concern->assignReferenceNo();

            $this->audit[] = $this->entry($account->id, 'create', 'concerns', $concern->id, null, ['category' => $category, 'reference_no' => $concern->reference_no], $when);

            if ($status !== 'open') {
                $this->audit[] = $this->entry($handler->id, 'update', 'concerns', $concern->id, ['status' => 'open'], ['status' => $status, 'response' => $concern->response, 'reference_no' => $concern->reference_no, 'category' => $category], $this->after($when, 1, 10));
            }
        }
    }

    // --- Account requests ---------------------------------------------------

    /** @param  array<int, User>  $accounts */
    private function accountRequests(array $accounts): void
    {
        $pool = collect($accounts)->shuffle()->values();

        // Six accounts that were deleted on request; two of those people then ask to come back.
        foreach ($pool->slice(0, 6) as $i => $account) {
            $admin = $this->admins[(int) $account->barangay_id];
            $when = $this->daysAgo(100);
            $account->update(['is_active' => false, 'deactivated_at' => $when, 'deactivated_by' => $admin->id]);
            Resident::whereKey($account->resident_id)->update(['is_active' => false]);

            DB::table('account_deletion_requests')->insert(['user_id' => $account->id, 'resident_id' => $account->resident_id, 'barangay_id' => $account->barangay_id, 'reason' => $this->pick(['I moved to another city.', 'I no longer use the app.', 'I created a second account by mistake.']), 'status' => 'approved', 'admin_remarks' => 'Verified in person.', 'reviewed_by' => $admin->id, 'reviewed_at' => $when, 'created_at' => $when->copy()->subDay(), 'updated_at' => $when]);
            $this->audit[] = $this->entry($admin->id, 'deletion_request_approved', 'account_deletion_requests', null, null, ['reviewed_by' => $admin->id], $when);

            if ($i < 2) {
                DB::table('account_reactivation_requests')->insert(['user_id' => $account->id, 'resident_id' => $account->resident_id, 'barangay_id' => $account->barangay_id, 'reason' => 'I am back in the barangay and need my account.', 'status' => 'pending', 'created_at' => now()->subDays($i + 1), 'updated_at' => now()->subDays($i + 1)]);
            }
        }

        foreach ($pool->slice(6, 5) as $i => $account) {
            $pending = $i < 3;
            DB::table('account_deletion_requests')->insert(['user_id' => $account->id, 'resident_id' => $account->resident_id, 'barangay_id' => $account->barangay_id, 'reason' => 'I want my account removed.', 'status' => $pending ? 'pending' : 'rejected', 'admin_remarks' => $pending ? null : 'Please visit the hall first.', 'reviewed_by' => $pending ? null : $this->admins[(int) $account->barangay_id]->id, 'reviewed_at' => $pending ? null : now()->subDays(5), 'created_at' => now()->subDays($i + 2), 'updated_at' => now()->subDays($i + 2)]);
        }

        foreach ($pool->slice(11, 8) as $i => $account) {
            $status = match (true) {
                $i < 4 => PasswordRecoveryRequest::STATUS_PENDING,
                $i < 6 => PasswordRecoveryRequest::STATUS_APPROVED,
                default => PasswordRecoveryRequest::STATUS_REJECTED,
            };
            $bhw = $this->pick($this->bhws[(int) $account->barangay_id]);
            $when = $this->daysAgo(20);
            $request = PasswordRecoveryRequest::create(['user_id' => $account->id, 'resident_id' => $account->resident_id, 'barangay_id' => $account->barangay_id, 'status' => $status, 'reviewed_by' => $status === PasswordRecoveryRequest::STATUS_PENDING ? null : $bhw->id, 'reviewed_at' => $status === PasswordRecoveryRequest::STATUS_PENDING ? null : $when]);

            if ($status !== PasswordRecoveryRequest::STATUS_PENDING) {
                $this->audit[] = $this->entry($bhw->id, $status === PasswordRecoveryRequest::STATUS_APPROVED ? 'approve' : 'reject', 'password_recovery_requests', $request->id, null, ['name' => $account->name], $when);
            }
        }
    }

    // --- Six months of history for the Activity Log --------------------------

    /** @param  array<int, User>  $accounts */
    private function history(array $accounts): void
    {
        $staff = User::query()->whereIn('role', [User::ROLE_BARANGAY_ADMIN, User::ROLE_BHW, User::ROLE_PARTNER_AGENCY])->get();

        foreach ($staff as $person) {
            foreach (range(1, mt_rand(40, 110)) as $n) {
                $this->audit[] = $this->entry($person->id, 'login', 'users', $person->id, null, null, $this->daysAgo(180, 1.2));
            }
        }

        foreach ($accounts as $account) {
            foreach (range(1, mt_rand(2, 14)) as $n) {
                $this->audit[] = $this->entry($account->id, 'login', 'users', $account->id, null, null, $this->daysAgo(150, 1.2));
            }
        }

        $residents = $this->allResidents()->shuffle()->take(350);

        foreach ($residents as $resident) {
            $bhw = $this->pick($this->bhws[$resident->barangay_id]);
            $this->audit[] = $this->entry($bhw->id, 'update', 'residents', $resident->id, null, ['name' => $resident->full_name], $this->daysAgo(160));
        }

        foreach (range(1, 45) as $n) {
            $person = $this->chance(60) ? $this->pick($this->admins) : $this->pick($this->bhws[array_rand($this->bhws)]);
            $pdf = $this->chance(60);
            $this->audit[] = $this->entry($person->id, 'generated_report', $pdf ? 'sector_dashboard' : 'resident_population', null, null, ['scope' => $this->barangays[$person->barangay_id]->name, 'format' => $pdf ? 'pdf' : 'csv'], $this->daysAgo(150));
        }

        foreach (range(1, 60) as $n) {
            $person = $this->chance(50) ? $this->pick($this->agencyUsers) : $this->pick($this->bhws[array_rand($this->bhws)]);
            $resident = $residents->random();
            $this->audit[] = $this->entry($person->id, 'verify_id', 'residents', $resident->id, null, ['resident_id' => 'RES-'.$resident->id, 'result' => $this->chance(92) ? 'valid' : 'invalid'], $this->daysAgo(90));
        }

        foreach (array_chunk($this->audit, 100) as $chunk) {
            AuditLog::insert($chunk);
        }

        $this->audit = [];
    }

    /** @return array<string, mixed> */
    /**
     * @param  array<string, mixed>|null  $old
     * @param  array<string, mixed>|null  $new
     * @return array<string, mixed>
     */
    private function entry(?int $userId, string $action, string $table, ?int $recordId, ?array $old, ?array $new, CarbonInterface $when): array
    {
        return [
            'user_id' => $userId,
            'action' => $action,
            'table_affected' => $table,
            'record_id' => $recordId,
            'old_value' => $old !== null ? json_encode($old) : null,
            'new_value' => $new !== null ? json_encode($new) : null,
            'performed_at' => $when,
            'created_at' => $when,
            'updated_at' => $when,
        ];
    }
}
