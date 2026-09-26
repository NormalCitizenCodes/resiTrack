<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreHouseholdRequest;
use App\Models\Barangay;
use App\Models\BarangayZone;
use App\Models\Household;
use App\Models\Resident;
use App\Models\WellbeingLevel;
use App\Services\AuditLogger;
use App\Services\PsgcAddress;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class HouseholdController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $households = Household::query()
            ->withCount('residents')
            ->with([
                'zone:id,zone_name',
                'barangay:id,name',
                'currentWellbeing.level:id,level_code,label',
                'leader:id,first_name,middle_name,last_name,contact_number',
                'residents:id,household_id,last_name',
            ])
            ->when(! $user->isSuperAdmin(), fn ($q) => $q->where('barangay_id', $user->barangay_id))
            ->when($user->isSuperAdmin() ? $request->integer('barangay_id') : null, fn ($q, $barangayId) => $q->where('barangay_id', $barangayId))
            ->when($request->string('search')->trim()->value(), function ($q, $search) {
                // The barangay says "the Pollich household", so a surname finds it (a member's or the leader's).
                $q->where(function ($inner) use ($search) {
                    $inner->where('household_number', 'like', "%{$search}%")
                        ->orWhere('address', 'like', "%{$search}%")
                        ->orWhereHas('residents', fn ($r) => $r->where('last_name', 'like', "%{$search}%"));
                });
            })
            ->when($request->string('leader')->value() === 'none', fn ($q) => $q->whereNull('leader_resident_id'))
            ->when($request->integer('zone_id'), fn ($q, $zoneId) => $q->where('zone_id', $zoneId))
            ->when($request->string('is_4ps')->value() === 'yes', fn ($q) => $q->where('is_4ps_beneficiary', true))
            ->when($request->string('is_4ps')->value() === 'no', fn ($q) => $q->where('is_4ps_beneficiary', false))
            ->when($request->string('wellbeing')->value() === 'none', fn ($q) => $q->doesntHave('wellbeingAssessments'))
            ->when($request->integer('wellbeing'), fn ($q, $levelId) => $q->whereHas(
                'currentWellbeing',
                fn ($assessment) => $assessment->where('level_id', $levelId)
            ))
            ->orderBy('household_number')
            ->paginate(15)
            ->withQueryString();

        // The list shows each household by its family name, so hand over that name, not every member's.
        $households->through(function (Household $household) {
            $household->setAttribute('family_name', $household->familyName());
            $household->unsetRelation('residents');

            return $household;
        });

        return Inertia::render('households/index', [
            'households' => $households,
            'filters' => $request->only(['search', 'barangay_id', 'zone_id', 'wellbeing', 'is_4ps', 'leader']),
            'barangays' => $user->isSuperAdmin() ? Barangay::orderBy('name')->get(['id', 'name']) : [],
            'zones' => $this->zones($request),
            'wellbeingLevels' => WellbeingLevel::orderBy('id')->get(['id', 'level_code', 'label']),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('households/create', [
            'addressDefaults' => app(PsgcAddress::class)->defaultsFor($request->user()->barangay),
            'zones' => $this->zones($request),
        ]);
    }

    public function store(StoreHouseholdRequest $request): RedirectResponse
    {
        $user = $request->user();

        $household = new Household($request->validated());
        $household->barangay_id = $user->barangay_id ?? Barangay::value('id');
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
            'leader:id,first_name,middle_name,last_name,suffix,date_of_birth,contact_number',
            'residents' => fn ($q) => $q->orderBy('date_of_birth'),
            'residents.sectors:id,code,sector_name',
            'zone:id,zone_name',
            'barangay:id,name',
            'wellbeingAssessments' => fn ($q) => $q->latest('assessment_date')->latest('id'),
            'wellbeingAssessments.level:id,level_code,label',
            'wellbeingAssessments.assessor:id,name',
        ]);

        $members = $household->residents;
        $ages = $members->pluck('age')->filter(fn ($age) => $age !== null);

        return Inertia::render('households/show', [
            'household' => $household,
            'family_name' => $household->familyName(),
            'leader' => $household->leader ? [
                'id' => $household->leader->id,
                'name' => $household->leader->full_name,
                'age' => $household->leader->age,
                'contact_number' => $household->leader->contact_number,
            ] : null,
            // Who the family could choose: active adult members only.
            'eligible_leaders' => $members
                ->filter(fn ($member) => Household::canLead($member, $household))
                ->map(fn ($member) => ['id' => $member->id, 'name' => $member->full_name, 'age' => $member->age])
                ->values(),
            'wellbeingLevels' => WellbeingLevel::orderBy('id')->get(['id', 'level_code', 'label']),
            // The household at a glance: who lives here and which sectors they bring.
            'summary' => [
                'members' => $members->count(),
                'children' => $members->filter(fn ($member) => $member->age !== null && $member->age < 18)->count(),
                'seniors' => $members->filter(fn ($member) => $member->age !== null && $member->age >= 60)->count(),
                'average_age' => $ages->isNotEmpty() ? round((float) $ages->avg(), 1) : null,
                'sectors' => $members
                    ->flatMap(fn ($member) => $member->sectors)
                    ->groupBy('code')
                    ->map(fn ($group, $code) => ['code' => $code, 'name' => $group->first()->sector_name, 'count' => $group->count()])
                    ->values()
                    ->all(),
            ],
        ]);
    }

    public function edit(Request $request, Household $household): Response
    {
        $this->authorizeWrite($request, $household);

        return Inertia::render('households/edit', [
            'household' => $household->only([
                'id', 'household_number', 'address', 'address_region_code', 'address_province_code', 'address_city_code',
                'address_barangay_code', 'address_street', 'address_zip', 'zone_id', 'house_materials', 'house_ownership',
                'water_source', 'electricity_source', 'waste_management', 'toilet_facility', 'member_count', 'monthly_income',
                'is_4ps_beneficiary',
            ]),
            'zones' => $this->zones($request),
        ]);
    }

    public function update(StoreHouseholdRequest $request, Household $household): RedirectResponse
    {
        $this->authorizeWrite($request, $household);

        $household->update($request->validated());

        // Name only what changed, so the Activity Log can say it.
        $changed = collect(array_keys($household->getChanges()))->reject(fn ($field) => $field === 'updated_at')->values();

        AuditLogger::record('update', 'households', $household->id, null, [
            'household_number' => $household->household_number,
            'changed' => $changed->map(fn ($field) => str_replace('_', ' ', $field))->implode(', '),
        ]);

        return redirect()
            ->route('households.show', $household)
            ->with('success', 'Household '.($household->household_number ?? '#'.$household->id).' updated.');
    }

    /**
     * Records who the family chose to represent the household, or clears it. The person must
     * be an active member of this household and 18 or older.
     */
    public function setLeader(Request $request, Household $household): RedirectResponse
    {
        $this->authorizeWrite($request, $household);

        $validated = $request->validate(['resident_id' => ['nullable', 'integer']]);
        $leader = null;

        if (($validated['resident_id'] ?? null) !== null) {
            $leader = Resident::query()->where('household_id', $household->id)->find((int) $validated['resident_id']);

            if ($leader === null) {
                throw ValidationException::withMessages(['resident_id' => 'Pick someone who lives in this household.']);
            }

            if (! Household::canLead($leader, $household)) {
                throw ValidationException::withMessages([
                    'resident_id' => $leader->is_active
                        ? 'A household leader must be 18 or older.'
                        : 'A deactivated resident cannot be the household leader.',
                ]);
            }
        }

        $household->update(['leader_resident_id' => $leader?->id]);

        AuditLogger::record('update', 'households', $household->id, null, [
            'household_number' => $household->household_number,
            'changed' => $leader ? 'household leader set to '.$leader->full_name : 'household leader cleared',
        ]);

        return back()->with('success', $leader ? "{$leader->full_name} is now the household leader." : 'The household leader was cleared.');
    }

    /** Only staff of the household's own barangay may change it (the super admin is read-only, and the route already keeps them out). */
    private function authorizeWrite(Request $request, Household $household): void
    {
        abort_unless($household->barangay_id === $request->user()->barangay_id, 403, 'This household belongs to another barangay.');
    }

    /**
     * Zones belonging to the acting user's barangay.
     *
     * @return Collection<int, BarangayZone>
     */
    private function zones(Request $request)
    {
        $user = $request->user();

        $barangayId = $user->isSuperAdmin() ? $request->integer('barangay_id') : $user->barangay_id;

        return BarangayZone::query()
            ->when($barangayId, fn ($q) => $q->where('barangay_id', $barangayId))
            ->orderBy('zone_name')
            ->get(['id', 'zone_name']);
    }
}
