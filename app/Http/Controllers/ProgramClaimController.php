<?php

namespace App\Http\Controllers;

use App\Models\Beneficiary;
use App\Models\Program;
use App\Models\ProgramClaim;
use App\Models\Resident;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Recording that a beneficiary actually claimed what a program gives. Only the agency that
 * owns the program does this (at its own counter, from the program page or after scanning
 * the resident's ID card); barangay staff and the super admin do not.
 */
class ProgramClaimController extends Controller
{
    public function store(Request $request, Program $program): RedirectResponse
    {
        $user = $request->user();
        $this->authorizeAgency($user, $program);

        $validated = $request->validate([
            'resident_id' => ['required', 'integer'],
            'schedule_id' => ['nullable', 'integer'],
            'note' => ['nullable', 'string', 'max:200'],
        ]);

        $resident = Resident::query()->find((int) $validated['resident_id']);

        // An agency limited to one barangay can only record claims for that barangay's residents.
        abort_unless(
            $resident !== null && ($user->barangay_id === null || $resident->barangay_id === $user->barangay_id),
            403,
            'This resident is outside your barangay.',
        );

        $isBeneficiary = Beneficiary::query()
            ->where('program_id', $program->id)
            ->where('resident_id', $resident->id)
            ->where('status', 'active')
            ->exists();

        if (! $resident->is_active || ! $isBeneficiary) {
            throw ValidationException::withMessages(['resident_id' => 'Only an active beneficiary of this program can claim.']);
        }

        $schedule = null;

        if (($validated['schedule_id'] ?? null) !== null) {
            $schedule = $program->schedules()->find((int) $validated['schedule_id']);

            if ($schedule === null) {
                throw ValidationException::withMessages(['schedule_id' => 'That claim day does not belong to this program.']);
            }
        }

        // One claim per person per claim day; without a set day, one per calendar day.
        $existing = ProgramClaim::query()
            ->where('program_id', $program->id)
            ->where('resident_id', $resident->id)
            ->when($schedule !== null, fn ($q) => $q->where('schedule_id', $schedule?->id), fn ($q) => $q->whereNull('schedule_id')->whereDate('claim_date', today()))
            ->first();

        if ($existing !== null) {
            throw ValidationException::withMessages(['resident_id' => "{$resident->full_name} already claimed on ".$existing->claimed_at->format('M j, Y g:i A').'.']);
        }

        $claim = ProgramClaim::create([
            'program_id' => $program->id,
            'resident_id' => $resident->id,
            'schedule_id' => $schedule?->id,
            'claim_date' => today(),
            'claimed_at' => now(),
            'recorded_by' => $user->id,
            'note' => $validated['note'] ?? null,
        ]);

        AuditLogger::record('create', 'program_claims', $claim->id, null, [
            'name' => $resident->full_name,
            'program' => $program->title,
            'program_id' => $program->id,
        ]);

        NotificationService::notify(
            User::query()->where('resident_id', $resident->id)->value('id'),
            $resident->id,
            'system',
            'Your claim was recorded',
            "{$program->title}: your claim was recorded on ".$claim->claimed_at->format('F j, Y').'.',
            null,
            "/programs/{$program->id}",
        );

        return back()->with('success', "Claim recorded for {$resident->full_name}.");
    }

    /** Undo a claim recorded by mistake. */
    public function destroy(Request $request, Program $program, ProgramClaim $claim): RedirectResponse
    {
        $this->authorizeAgency($request->user(), $program);
        abort_unless($claim->program_id === $program->id, 404);

        $name = $claim->resident?->full_name;
        $claim->delete();

        AuditLogger::record('delete', 'program_claims', $claim->id, null, [
            'name' => $name,
            'program' => $program->title,
            'program_id' => $program->id,
        ]);

        return back()->with('success', 'The claim was removed.');
    }

    private function authorizeAgency(User $user, Program $program): void
    {
        abort_unless(
            $user->role === User::ROLE_PARTNER_AGENCY && $program->isManagedBy($user),
            403,
            "Only the program's own agency can record claims.",
        );
    }
}
