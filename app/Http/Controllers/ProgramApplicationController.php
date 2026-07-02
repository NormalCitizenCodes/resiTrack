<?php

namespace App\Http\Controllers;

use App\Models\Beneficiary;
use App\Models\Program;
use App\Models\ProgramApplication;
use App\Models\Resident;
use App\Services\AuditLogger;
use App\Services\NotificationService;
use App\Services\ProgramEligibilityService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ProgramApplicationController extends Controller
{
    public function __construct(private readonly ProgramEligibilityService $eligibility) {}

    /**
     * Apply to a program — a resident for themselves, or barangay staff endorsing
     * a resident from their barangay.
     */
    public function store(Request $request, Program $program): RedirectResponse
    {
        $user = $request->user();

        if ($program->status !== 'active') {
            return back()->with('error', 'This program is not accepting applications.');
        }

        $resident = $this->resolveApplicant($request, $user);

        if (! $resident) {
            return back()->with('error', 'No resident record is linked to this application.');
        }

        if ($program->applications()->where('resident_id', $resident->id)->exists()) {
            return back()->with('error', "{$resident->full_name} has already applied to this program.");
        }

        if (! $this->eligibility->residentQualifies($program, $resident->load('sectors'))) {
            return back()->with('error', "{$resident->full_name} does not belong to a sector targeted by this program.");
        }

        $application = ProgramApplication::create([
            'program_id' => $program->id,
            'resident_id' => $resident->id,
            'status' => 'pending',
            'applied_at' => Carbon::now(),
        ]);

        AuditLogger::record('apply', 'program_applications', $application->id, null, [
            'program' => $program->title,
            'resident' => $resident->full_name,
        ]);

        return back()->with('success', "Application submitted for {$resident->full_name}.");
    }

    /**
     * Agency review: approve (create beneficiary, fill a slot) or reject.
     */
    public function update(Request $request, ProgramApplication $application): RedirectResponse
    {
        $user = $request->user();
        $program = $application->program;

        $owns = $user->isSuperAdmin()
            || ($user->role === 'partner_agency' && $program->agency_id === $user->agency_id);
        abort_unless($owns, 403, 'You can only review applications for your own programs.');

        $validated = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected'])],
        ]);

        if ($validated['status'] === 'approved') {
            return $this->approve($application, $program, $user->id);
        }

        $application->update(['status' => 'rejected']);

        AuditLogger::record('reject', 'program_applications', $application->id);
        NotificationService::notifyApplicationOutcome($application->resident_id, $program->title, 'rejected');

        return back()->with('success', 'Application rejected.');
    }

    /**
     * A resident's own applications across all programs.
     */
    public function mine(Request $request): Response
    {
        $user = $request->user();

        $applications = ProgramApplication::query()
            ->when($user->resident_id, fn ($q) => $q->where('resident_id', $user->resident_id), fn ($q) => $q->whereRaw('1 = 0'))
            ->with(['program:id,title,status,agency_id', 'program.agency:id,agency_name,agency_type'])
            ->latest('applied_at')
            ->get();

        return Inertia::render('programs/my-applications', [
            'applications' => $applications,
            'hasResidentRecord' => $user->resident_id !== null,
        ]);
    }

    private function approve(ProgramApplication $application, Program $program, int $reviewerId): RedirectResponse
    {
        if ($program->slots_available > 0 && $program->slots_filled >= $program->slots_available) {
            return back()->with('error', 'All slots for this program are already filled.');
        }

        DB::transaction(function () use ($application, $program, $reviewerId) {
            $application->update(['status' => 'approved']);

            $exists = Beneficiary::where('program_id', $program->id)
                ->where('resident_id', $application->resident_id)
                ->exists();

            if (! $exists) {
                Beneficiary::create([
                    'program_id' => $program->id,
                    'resident_id' => $application->resident_id,
                    'application_id' => $application->id,
                    'status' => 'active',
                    'added_by' => $reviewerId,
                    'date_added' => Carbon::now(),
                ]);

                $program->increment('slots_filled');
            }
        });

        AuditLogger::record('approve', 'program_applications', $application->id, null, [
            'program' => $program->title,
        ]);
        NotificationService::notifyApplicationOutcome($application->resident_id, $program->title, 'approved');

        return back()->with('success', 'Application approved and added to beneficiaries.');
    }

    /**
     * Determine which resident the application is for and enforce barangay scope.
     */
    private function resolveApplicant(Request $request, $user): ?Resident
    {
        // Resident applying for themselves.
        if ($user->role === 'resident') {
            return $user->resident_id ? Resident::find($user->resident_id) : null;
        }

        // Barangay staff endorsing a resident from their own barangay.
        $validated = $request->validate([
            'resident_id' => ['required', 'integer', 'exists:residents,id'],
        ]);

        $resident = Resident::find($validated['resident_id']);

        if (! $user->isSuperAdmin() && $resident->barangay_id !== $user->barangay_id) {
            abort(403, 'You can only endorse residents from your own barangay.');
        }

        return $resident;
    }
}
