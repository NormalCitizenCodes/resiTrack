<?php

namespace App\Http\Controllers;

use App\Models\Program;
use App\Models\ProgramSchedule;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Payout, distribution and service-day schedules for a program. Managed by
 * the program's owner; seen by the program's active beneficiaries, who are
 * told as soon as a date is posted or cancelled.
 */
class ProgramScheduleController extends Controller
{
    public function store(Request $request, Program $program): RedirectResponse
    {
        abort_unless($program->isManagedBy($request->user()), 403, 'You can only schedule your own agency\'s programs.');

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'starts_at' => ['required', 'date', 'after_or_equal:today'],
            'location' => ['required', 'string', 'max:180'],
            'what_to_bring' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $schedule = $program->schedules()->create($validated + ['created_by' => $request->user()->id]);

        AuditLogger::record('create', 'program_schedules', $schedule->id, null, [
            'program' => $program->title,
            'starts_at' => $schedule->starts_at->toDateTimeString(),
        ]);

        $notified = $this->notifyBeneficiaries(
            $program,
            "{$program->title}: {$schedule->title}",
            $this->describe($schedule),
        );

        return back()->with('success', "Schedule posted. {$notified} beneficiar".($notified === 1 ? 'y was' : 'ies were').' notified.');
    }

    public function destroy(Request $request, ProgramSchedule $schedule): RedirectResponse
    {
        $program = $schedule->program;
        abort_unless($program->isManagedBy($request->user()), 403, 'You can only manage your own agency\'s programs.');

        // Only tell people about a cancellation they could still have acted on.
        if ($schedule->starts_at->isFuture()) {
            $this->notifyBeneficiaries(
                $program,
                "Cancelled: {$program->title}, {$schedule->title}",
                'The schedule on '.$schedule->starts_at->format('F j, Y, g:i A').' at '.$schedule->location.' has been cancelled. Watch for a new date.',
            );
        }

        AuditLogger::record('delete', 'program_schedules', $schedule->id, [
            'program' => $program->title,
            'starts_at' => $schedule->starts_at->toDateTimeString(),
        ]);
        $schedule->delete();

        return back()->with('success', 'Schedule removed.');
    }

    private function describe(ProgramSchedule $schedule): string
    {
        $lines = [
            $schedule->starts_at->format('l, F j, Y, g:i A'),
            'Where: '.$schedule->location,
        ];

        if ($schedule->what_to_bring) {
            $lines[] = 'Bring: '.$schedule->what_to_bring;
        }

        if ($schedule->notes) {
            $lines[] = $schedule->notes;
        }

        return implode("\n", $lines);
    }

    private function notifyBeneficiaries(Program $program, string $title, string $message): int
    {
        $residentIds = $program->beneficiaries()->where('status', 'active')->pluck('resident_id');

        $accounts = User::query()
            ->where('role', User::ROLE_RESIDENT)
            ->whereIn('resident_id', $residentIds)
            ->get(['id', 'resident_id']);

        foreach ($accounts as $account) {
            NotificationService::notify(
                $account->id,
                $account->resident_id,
                'program_schedule',
                $title,
                $message,
                null,
                route('programs.show', $program),
            );
        }

        return $accounts->count();
    }
}
