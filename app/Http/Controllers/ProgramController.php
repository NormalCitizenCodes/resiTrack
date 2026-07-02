<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProgramRequest;
use App\Models\Barangay;
use App\Models\Program;
use App\Models\VulnerabilitySector;
use App\Services\NotificationService;
use App\Services\ProgramEligibilityService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProgramController extends Controller
{
    public function __construct(private readonly ProgramEligibilityService $eligibility) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        $isManaging = $user->hasRole('partner_agency', 'super_admin');

        $programs = Program::query()
            ->with(['agency:id,agency_name,agency_type', 'barangay:id,name', 'sectors:id,code,sector_name'])
            ->withCount([
                'applications',
                'applications as pending_applications_count' => fn ($q) => $q->where('status', 'pending'),
                'beneficiaries',
            ])
            // Agencies manage only their own programs; everyone else sees active ones.
            ->when($user->role === 'partner_agency', fn ($q) => $q->where('agency_id', $user->agency_id))
            ->when(! $isManaging, function ($q) use ($user) {
                $q->where('status', 'active')
                    // Browsing residents/staff only see programs open to their own
                    // barangay, or city-wide ones (barangay_id null).
                    ->when($user->barangay_id, function ($q) use ($user) {
                        $q->where(fn ($inner) => $inner->whereNull('barangay_id')->orWhere('barangay_id', $user->barangay_id));
                    }, fn ($q) => $q->whereNull('barangay_id'));
            })
            ->latest()
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('programs/index', [
            'programs' => $programs,
            'canManage' => $isManaging,
            'viewerRole' => $user->role,
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('programs/create', [
            'sectors' => VulnerabilitySector::orderBy('id')->get(['id', 'code', 'sector_name']),
            'barangays' => Barangay::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(StoreProgramRequest $request): RedirectResponse
    {
        $user = $request->user();

        $program = new Program($request->safe()->except('sector_ids'));
        $program->agency_id = $user->agency_id;
        $program->posted_by = $user->id;
        $program->save();
        $program->sectors()->sync($request->input('sector_ids', []));

        // Notify residents whose vulnerability sectors match the new program.
        if ($program->status === 'active') {
            NotificationService::notifyProgramMatch($program->load('sectors'));
        }

        return redirect()
            ->route('programs.show', $program)
            ->with('success', "Program \"{$program->title}\" published.");
    }

    public function show(Request $request, Program $program): Response
    {
        $user = $request->user();
        $program->load(['agency:id,agency_name,agency_type', 'barangay:id,name', 'sectors:id,code,sector_name']);

        $isOwner = $user->isSuperAdmin()
            || ($user->role === 'partner_agency' && $program->agency_id === $user->agency_id);

        $props = [
            'program' => $program,
            'isOwner' => $isOwner,
            'viewerRole' => $user->role,
        ];

        // Agency owner: see all applications + beneficiaries to review.
        if ($isOwner) {
            $props['applications'] = $program->applications()
                ->with(['resident:id,first_name,last_name,middle_name,barangay_id', 'resident.barangay:id,name'])
                ->latest('applied_at')
                ->get();
            $props['beneficiaries'] = $program->beneficiaries()
                ->with('resident:id,first_name,last_name,middle_name')
                ->latest('date_added')
                ->get();
        }

        // Barangay staff: eligible residents in their barangay + endorsements so far.
        if ($user->isBarangayStaff() && $user->barangay_id) {
            $props['eligibleResidents'] = $this->eligibility->eligibleResidents($program, $user->barangay_id);
            $props['barangayApplications'] = $program->applications()
                ->whereHas('resident', fn ($r) => $r->where('barangay_id', $user->barangay_id))
                ->with('resident:id,first_name,last_name,middle_name')
                ->get();
        }

        // Resident: their own application to this program, if any.
        if ($user->role === 'resident' && $user->resident_id) {
            $props['myApplication'] = $program->applications()
                ->where('resident_id', $user->resident_id)
                ->first();
            $props['isEligible'] = $user->resident
                ? $this->eligibility->residentQualifies($program, $user->resident->load('sectors'))
                : false;
        }

        return Inertia::render('programs/show', $props);
    }

    public function edit(Request $request, Program $program): Response
    {
        $this->authorizeOwner($request, $program);

        return Inertia::render('programs/edit', [
            'program' => $program->load('sectors:id'),
            'sectors' => VulnerabilitySector::orderBy('id')->get(['id', 'code', 'sector_name']),
            'barangays' => Barangay::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function update(StoreProgramRequest $request, Program $program): RedirectResponse
    {
        $this->authorizeOwner($request, $program);

        $program->update($request->safe()->except('sector_ids'));
        $program->sectors()->sync($request->input('sector_ids', []));

        return redirect()
            ->route('programs.show', $program)
            ->with('success', "Program \"{$program->title}\" updated.");
    }

    public function destroy(Request $request, Program $program): RedirectResponse
    {
        $this->authorizeOwner($request, $program);
        $title = $program->title;
        $program->delete();

        return redirect()
            ->route('programs.index')
            ->with('success', "Program \"{$title}\" deleted.");
    }

    /**
     * Only the owning agency (or a super admin) may manage a program.
     */
    private function authorizeOwner(Request $request, Program $program): void
    {
        $user = $request->user();

        $owns = $user->isSuperAdmin()
            || ($user->role === 'partner_agency' && $program->agency_id === $user->agency_id);

        abort_unless($owns, 403, 'You can only manage your own agency\'s programs.');
    }
}
