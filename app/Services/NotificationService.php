<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\AppNotification;
use App\Models\Program;
use App\Models\Resident;
use App\Models\User;

/**
 * Creates in-app notifications. Called explicitly from controllers, consistent
 * with the codebase's other services (AuditLogger, SectorClassificationService)
 * rather than via Eloquent events.
 *
 * Notification types (see the app_notifications enum): program_match, announcement,
 * duplicate_alert, system. Only program_match and announcement are wired today -
 * duplicate_alert and system remain valid for future use (no resident-facing
 * duplicate UI / admin broadcast UI exists yet).
 */
class NotificationService
{
    public static function notify(
        ?int $userId,
        ?int $residentId,
        string $type,
        string $title,
        ?string $message = null,
        ?int $relatedUserId = null,
        ?string $actionUrl = null,
    ): void {
        if ($userId === null) {
            return; // nobody to notify (e.g. resident has no linked account)
        }

        AppNotification::create([
            'user_id' => $userId,
            'resident_id' => $residentId,
            'related_user_id' => $relatedUserId,
            'type' => $type,
            'action_url' => $actionUrl,
            'title' => $title,
            'message' => $message,
            'is_read' => false,
        ]);
    }

    /**
     * Notify BHWs that an account is waiting for in-person verification.
     * The account is intentionally not linked to a Resident yet.
     */
    public static function notifyNewResidentRegistration(User $registration): void
    {
        if ($registration->barangay_id === null) {
            return;
        }

        $bhws = User::query()
            ->where('role', User::ROLE_BHW)
            ->where('barangay_id', $registration->barangay_id)
            ->get(['id']);

        $email = $registration->email ?: '-';
        $message = implode("\n", [
            'A new resident account has been created and is waiting for verification and profiling.',
            '',
            "Resident: {$registration->name}",
            "Email: {$email}",
            'Status: Pending Profiling',
            '',
            'The resident will visit the Barangay Hall and approach a BHW to complete their official profiling.',
        ]);

        foreach ($bhws as $bhw) {
            self::notify(
                $bhw->id,
                null,
                'system',
                '🔔 New Resident Account Created',
                $message,
                $registration->id,
                route('resident-registrations.show', $registration),
            );

            self::notify(
                $bhw->id,
                null,
                'profiling_required',
                'Resident Profiling Required',
                "{$registration->name} is ready for official profiling.",
                $registration->id,
                route('residents.create', ['linked_user' => $registration->id]),
            );
        }
    }

    public static function markRegistrationNotificationsComplete(User $registration, Resident $resident): void
    {
        AppNotification::query()
            ->where('related_user_id', $registration->id)
            ->whereIn('type', ['system', 'profiling_required'])
            ->update([
                'is_read' => true,
                'read_at' => now(),
                'resident_id' => $resident->id,
                'action_url' => route('residents.show', $resident),
            ]);
    }

    public static function notifyResidentProfileVerified(User $account, Resident $resident): void
    {
        self::notify(
            $account->id,
            $resident->id,
            'system',
            'Your resident profile has been verified',
            "Your resident profile has been successfully completed and verified. Resident ID: {$resident->resident_id}. You can now log in using either your Resident ID or registered email address together with your password.",
        );

        User::query()
            ->whereIn('role', [User::ROLE_SUPER_ADMIN, User::ROLE_BARANGAY_ADMIN, User::ROLE_BHW])
            ->where(function ($query) use ($resident) {
                $query->where('barangay_id', $resident->barangay_id)
                    ->orWhere('role', User::ROLE_SUPER_ADMIN);
            })
            ->each(fn (User $staff) => self::notify(
                $staff->id,
                $resident->id,
                'profiling_completed',
                'Resident Profiling Completed',
                "{$resident->full_name}'s resident profile has been successfully completed.",
                $account->id,
                route('residents.show', $resident),
            ));
    }

    public static function notifyAccountReactivated(User $account): void
    {
        self::notify(
            $account->id,
            $account->resident_id,
            'account_reactivation',
            'Your Resident Account has been reactivated.',
            'Your account has been successfully reactivated. You can now log in again using your Resident ID or registered email address and password.',
            null,
            route('account-reactivation.create'),
        );
    }

    /**
     * Notify residents (with a linked account) whose sectors match a new program.
     *
     * @return int number of residents notified
     */
    public static function notifyProgramMatch(Program $program): int
    {
        $residentIds = self::residentsMatchingProgram($program);

        return self::fanOut(
            $residentIds,
            'program_match',
            'New program you may qualify for',
            "{$program->title} is now open. Check if you're eligible and apply.",
        );
    }

    /**
     * Notify the owning agency's accounts that a resident applied to one of their programs.
     */
    public static function notifyNewApplication(Program $program, Resident $resident): void
    {
        if ($program->agency_id === null) {
            return;
        }

        User::query()
            ->where('role', User::ROLE_PARTNER_AGENCY)
            ->where('agency_id', $program->agency_id)
            ->get(['id'])
            ->each(fn (User $agencyUser) => self::notify(
                $agencyUser->id,
                $resident->id,
                'program_match',
                'New application received',
                "{$resident->full_name} applied to {$program->title}.",
                null,
                route('programs.show', $program),
            ));
    }

    /**
     * Notify a single resident about the outcome of their application.
     */
    public static function notifyApplicationOutcome(int $residentId, string $programTitle, string $status): void
    {
        $user = User::where('resident_id', $residentId)->first();

        $title = $status === 'approved'
            ? 'Your application was approved'
            : 'Update on your application';
        $message = $status === 'approved'
            ? "You were approved for {$programTitle}."
            : "Your application for {$programTitle} was not approved this time.";

        self::notify($user?->id, $residentId, 'program_match', $title, $message);
    }

    /**
     * Notify residents targeted by an announcement (barangay-wide, or
     * whoever belongs to any of its target sectors).
     *
     * @return int number of residents notified
     */
    public static function notifyAnnouncement(Announcement $announcement): int
    {
        $targetSectorIds = $announcement->sectors->pluck('id');

        $residentIds = Resident::query()
            ->where('is_active', true)
            ->where('barangay_id', $announcement->barangay_id)
            ->when($targetSectorIds->isNotEmpty(), fn ($q) => $q->whereHas(
                'sectors',
                fn ($s) => $s->whereIn('vulnerability_sectors.id', $targetSectorIds)
            ))
            ->pluck('id');

        return self::fanOut(
            $residentIds,
            'announcement',
            $announcement->title,
            $announcement->content,
        );
    }

    /**
     * @return \Illuminate\Support\Collection<int, int>
     */
    private static function residentsMatchingProgram(Program $program): \Illuminate\Support\Collection
    {
        $targetSectorIds = $program->sectors->pluck('id');

        return Resident::query()
            ->where('is_active', true)
            ->when($program->barangay_id, fn ($q) => $q->where('barangay_id', $program->barangay_id))
            ->when($targetSectorIds->isNotEmpty(), fn ($q) => $q->whereHas(
                'sectors',
                fn ($s) => $s->whereIn('vulnerability_sectors.id', $targetSectorIds)
            ))
            ->pluck('id');
    }

    /**
     * Deliver one notification to each resident that has a linked user account.
     *
     * @param  \Illuminate\Support\Collection<int, int>  $residentIds
     */
    private static function fanOut(\Illuminate\Support\Collection $residentIds, string $type, string $title, ?string $message): int
    {
        if ($residentIds->isEmpty()) {
            return 0;
        }

        $users = User::query()
            ->where('role', User::ROLE_RESIDENT)
            ->whereIn('resident_id', $residentIds)
            ->get(['id', 'resident_id']);

        foreach ($users as $user) {
            self::notify($user->id, $user->resident_id, $type, $title, $message);
        }

        return $users->count();
    }
}
