<?php

namespace App\Services;

use App\Models\Resident;
use Carbon\CarbonInterface;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Support\Carbon;

/**
 * Pregnancy as a vulnerable sector that ends by itself.
 *
 * Whoever reports a pregnancy (staff on the resident form, or the resident in their own profile)
 * gives the expected MONTH of delivery. The Pregnant tag is removed GRACE_DAYS after that month
 * ends, with no one having to remember: a daily check calls expireDue(). The month, not an exact
 * date, because that is what families know.
 */
class PregnancyStatus
{
    /** Days after the end of the expected month before the tag clears (babies can come late). */
    public const GRACE_DAYS = 30;

    /** Only residents in this age range can be marked pregnant. */
    public const MIN_AGE = 10;

    public const MAX_AGE = 55;

    public function __construct(private readonly SectorClassificationService $classifier) {}

    /** The day the tag clears, for an expected month like 2026-11-01. */
    public static function endsOn(CarbonInterface $expectedMonth): Carbon
    {
        return Carbon::instance($expectedMonth)->endOfMonth()->startOfDay()->addDays(self::GRACE_DAYS);
    }

    /** "2026-11" as the first day of that month, or null when it is not a real year and month. */
    private static function monthFrom(?string $month): ?Carbon
    {
        if ($month === null || preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month) !== 1) {
            return null;
        }

        return Carbon::createFromFormat('!Y-m', $month) ?: null;
    }

    /**
     * Checks a pregnancy report added to a form. Call from a validator's after() hook.
     *
     * @param  string|null  $month  "YYYY-MM" as typed
     */
    public function validate(Validator $validator, bool $pregnant, ?string $month, ?string $sex, ?CarbonInterface $dateOfBirth): void
    {
        if (! $pregnant) {
            return;
        }

        if ($sex !== 'female') {
            $validator->errors()->add('is_pregnant', 'Only female residents can be marked as pregnant.');

            return;
        }

        $age = $dateOfBirth?->age;

        if ($age !== null && ($age < self::MIN_AGE || $age > self::MAX_AGE)) {
            $validator->errors()->add('is_pregnant', 'Pregnancy can only be recorded for residents aged '.self::MIN_AGE.' to '.self::MAX_AGE.'.');
        }

        if ($month === null || $month === '') {
            $validator->errors()->add('pregnancy_expected_month', 'Enter the expected month of delivery.');

            return;
        }

        $expected = self::monthFrom($month);

        if ($expected === null) {
            // A malformed value is reported by the field's own format rule; do not report it twice.
            if (! $validator->errors()->has('pregnancy_expected_month')) {
                $validator->errors()->add('pregnancy_expected_month', 'Enter the expected month as a month and year.');
            }

            return;
        }

        $earliest = Carbon::today()->startOfMonth()->subMonth();
        $latest = Carbon::today()->startOfMonth()->addMonths(10);

        if ($expected->lt($earliest) || $expected->gt($latest)) {
            $validator->errors()->add('pregnancy_expected_month', 'The expected month should be within the next 10 months, or at most a month ago.');
        }
    }

    /**
     * Sets or clears the pregnancy fields on a resident (does not save). Turning it off, or a
     * missing month, clears everything, so an ended pregnancy never leaves a stale month behind.
     */
    public function apply(Resident $resident, bool $pregnant, ?string $month, string $source): void
    {
        $expected = self::monthFrom($month);

        if (! $pregnant || $expected === null) {
            $resident->is_pregnant = false;
            $resident->pregnancy_expected_month = null;
            $resident->pregnancy_source = null;

            return;
        }

        $sameMonth = $resident->pregnancy_expected_month?->format('Y-m') === $month;

        $resident->is_pregnant = true;
        $resident->pregnancy_expected_month = $expected;

        // Keep who first reported it when someone re-saves the same month.
        if (! $sameMonth || $resident->pregnancy_source === null) {
            $resident->pregnancy_source = $source;
        }
    }

    /**
     * Removes the Pregnant tag from everyone whose expected month plus the grace period has passed,
     * re-runs their sector classification, and leaves an Activity Log entry with no signed-in user.
     * Residents marked pregnant before months existed (no month) are left alone.
     *
     * @return int how many tags were removed
     */
    public function expireDue(?Carbon $today = null): int
    {
        $today ??= Carbon::today();
        $removed = 0;

        // The tag lasts through the end of the month plus GRACE_DAYS, so a month is due once its start is more than that long ago.
        $cutoff = $today->copy()->subDays(self::GRACE_DAYS)->startOfMonth();

        Resident::query()
            ->where('is_pregnant', true)
            ->whereNotNull('pregnancy_expected_month')
            ->whereDate('pregnancy_expected_month', '<=', $cutoff->toDateString())
            ->each(function (Resident $resident) use ($today, &$removed): void {
                $month = $resident->pregnancy_expected_month;

                if ($month === null || self::endsOn($month)->gte($today)) {
                    return;
                }

                $this->apply($resident, false, null, 'system');
                $resident->save();
                $this->classifier->classify($resident);

                AuditLogger::record('update', 'residents', $resident->id, null, [
                    'name' => $resident->full_name,
                    'source' => 'system',
                    'pregnancy' => 'ended, the expected month has passed',
                ], asSystem: true);

                $removed++;
            });

        return $removed;
    }
}
