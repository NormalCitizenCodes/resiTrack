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
 * duplicate_alert, system. Only program_match and announcement are wired today —
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
    ): void {
        if ($userId === null) {
            return; // nobody to notify (e.g. resident has no linked account)
        }

        AppNotification::create([
            'user_id' => $userId,
            'resident_id' => $residentId,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'is_read' => false,
        ]);
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
