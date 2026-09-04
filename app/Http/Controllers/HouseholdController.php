<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreHouseholdRequest;
use App\Models\BarangayZone;
use App\Models\Household;
use App\Models\WellbeingLevel;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HouseholdController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $households = Household::query()
            ->withCount('residents')
            ->with('zone:id,zone_name')
            ->when(! $user->isSuperAdmin(), fn ($q) => $q->where('barangay_id', $user->barangay_id))
            ->when($request->string('search')->trim()->value(), function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('household_number', 'like', "%{$search}%")
                        ->orWhere('address', 'like', "%{$search}%");
                });
            })
            ->orderBy('household_number')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('households/index', [
            'households' => $households,
            'filters' => $request->only(['search']),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('households/create', [
            'zones' => $this->zones($request),
        ]);
    }

    public function store(StoreHouseholdRequest $request): RedirectResponse
    {
        $user = $request->user();

        $household = new Household($request->validated());
        $household->barangay_id = $user->barangay_id ?? \App\Models\Barangay::value('id');
        $household->save();
        $household->update(['household_id' => sprintf('HH-%06d', $household->id)]);

        AuditLogger::record('create', 'households', $household->id, null, [
            'household_number' => $household->household_number,
        ]);

        return redirect()
            ->route('households.index')
            ->with('success', 'Household '.($household->household_number ?? '#'.$household->id).' registered successfully.');
    }

    public function show(Request $request, Household $household): Response
    {
        $user = $request->user();

        if (! $user->isSuperAdmin() && $household->barangay_id !== $user->barangay_id) {
            abort(403, 'This household belongs to another barangay.');
        }

        $household->load([
            'residents.sectors:id,code,sector_name',
            'zone:id,zone_name',
            'barangay:id,name',
            'wellbeingAssessments' => fn ($q) => $q->latest('assessment_date')->latest('id'),
            'wellbeingAssessments.level:id,level_code,label',
            'wellbeingAssessments.assessor:id,name',
        ]);

        return Inertia::render('households/show', [
            'household' => $household,
            'wellbeingLevels' => WellbeingLevel::orderBy('id')->get(['id', 'level_code', 'label']),
        ]);
    }

    /**
     * Zones belonging to the acting user's barangay.
     *
     * @return \Illuminate\Support\Collection<int, BarangayZone>
     */
    private function zones(Request $request)
    {
        $user = $request->user();

        return BarangayZone::query()
            ->when($user->barangay_id, fn ($q) => $q->where('barangay_id', $user->barangay_id))
            ->orderBy('zone_name')
            ->get(['id', 'zone_name']);
    }
}
