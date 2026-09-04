<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreResidentRequest;
use App\Http\Requests\UpdateResidentRequest;
use App\Models\Barangay;
use App\Models\DuplicateAlert;
use App\Models\Household;
use App\Models\Resident;
use App\Models\User;
use App\Models\VulnerabilitySector;
use App\Services\AuditLogger;
use App\Services\DuplicateDetectionService;
use App\Services\SectorClassificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class ResidentController extends Controller
{
    public function __construct(
        private readonly SectorClassificationService $classifier,
        private readonly DuplicateDetectionService $duplicates,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        $residents = Resident::query()
            ->with(['sectors:id,code,sector_name', 'household:id,household_number'])
            ->when(! $user->isSuperAdmin(), fn ($q) => $q->where('barangay_id', $user->barangay_id))
            ->when($request->string('search')->trim()->value(), function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('philsys_card_no', 'like', "%{$search}%");
                });
            })
            ->when($request->string('sector')->value(), function ($q, $sector) {
                $q->whereHas('sectors', fn ($s) => $s->where('code', $sector));
            })
            ->when($request->string('status')->value() === 'active', fn ($q) => $q->where('is_active', true))
            ->when($request->string('status')->value() === 'inactive', fn ($q) => $q->where('is_active', false))
            ->when($request->string('status')->value() === 'flagged', fn ($q) => $q->where('is_duplicate_flagged', true))
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('residents/index', [
            'residents' => $residents,
            'sectors' => VulnerabilitySector::orderBy('id')->get(['id', 'code', 'sector_name']),
            'filters' => $request->only(['search', 'sector', 'status']),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('residents/create', $this->formData($request));
    }

    public function store(StoreResidentRequest $request): RedirectResponse
    {
        $user = $request->user();

        $resident = new Resident($request->validated());
        $resident->barangay_id = $user->isSuperAdmin()
            ? ($request->integer('barangay_id') ?: Barangay::value('id'))
            : $user->barangay_id;
        $resident->registered_at = Carbon::now();
        $resident->save();
        $resident->update(['resident_id' => sprintf('RES-%06d', $resident->id)]);

        if ($request->boolean('create_account')) {
            User::create([
                'name' => $resident->full_name,
                'email' => $resident->email,
                'password' => Hash::make($request->string('password')->toString()),
                'role' => User::ROLE_RESIDENT,
                'first_name' => $resident->first_name,
                'last_name' => $resident->last_name,
                'barangay_id' => $resident->barangay_id,
                'resident_id' => $resident->id,
                'is_active' => true,
                'email_verified_at' => $resident->email ? now() : null,
            ]);
        }

        // Classify vulnerability sectors, then screen for duplicates/transfers.
        $this->classifier->classify($resident);
        $newAlerts = $this->duplicates->scan($resident);

        AuditLogger::record('create', 'residents', $resident->id, null, ['name' => $resident->full_name]);

        $message = "Resident {$resident->full_name} registered successfully.";
        if ($newAlerts > 0) {
            $message .= " {$newAlerts} possible duplicate/transfer match(es) were flagged for review.";
        }

        return redirect()
            ->route('residents.show', $resident)
            ->with('success', $message)
            ->with('residentRegistration', [
                'residentId' => $resident->resident_id,
                'name' => $resident->full_name,
                'householdId' => $resident->household?->household_id ?? $resident->household_id,
                'accountCreated' => $request->boolean('create_account'),
                'emailLoginAvailable' => filled($resident->email),
            ]);
    }

    public function show(Request $request, Resident $resident): Response
    {
        $this->authorizeBarangay($request, $resident);

        $resident->load([
            'sectors:id,code,sector_name',
            'household',
            'barangay:id,name',
            'transferBarangay:id,name',
        ]);

        // Any open duplicate/transfer alerts that reference this resident.
        $alerts = DuplicateAlert::query()
            ->with(['residentOne:id,first_name,last_name,barangay_id', 'residentTwo:id,first_name,last_name,barangay_id'])
            ->where(function ($q) use ($resident) {
                $q->where('resident_id_1', $resident->id)
                    ->orWhere('resident_id_2', $resident->id);
            })
            ->orderByDesc('detected_at')
            ->get();

        return Inertia::render('residents/show', [
            'resident' => $resident,
            'alerts' => $alerts,
        ]);
    }

    public function edit(Request $request, Resident $resident): Response
    {
        $this->authorizeBarangay($request, $resident);

        return Inertia::render('residents/edit', [
            ...$this->formData($request),
            'resident' => $resident->load('sectors:id,code'),
        ]);
    }

    public function update(UpdateResidentRequest $request, Resident $resident): RedirectResponse
    {
        $this->authorizeBarangay($request, $resident);

        $resident->fill($request->validated());
        $resident->save();

        // Attributes may have changed sector membership; re-run classification.
        $this->classifier->classify($resident);
        $this->duplicates->scan($resident);

        AuditLogger::record('update', 'residents', $resident->id, null, ['name' => $resident->full_name]);

        return redirect()
            ->route('residents.show', $resident)
            ->with('success', "Resident {$resident->full_name} updated successfully.");
    }

    public function destroy(Request $request, Resident $resident): RedirectResponse
    {
        $this->authorizeBarangay($request, $resident);
        $this->authorizeStatusManagement($request);

        // Deactivate rather than hard-delete to preserve records for audit.
        $resident->update(['is_active' => false]);

        return redirect()
            ->route('residents.index')
            ->with('success', "Resident {$resident->full_name} was deactivated.");
    }

    public function toggleActive(Request $request, Resident $resident): RedirectResponse
    {
        $this->authorizeBarangay($request, $resident);
        $this->authorizeStatusManagement($request);

        $resident->update(['is_active' => ! $resident->is_active]);

        AuditLogger::record(
            $resident->is_active ? 'activate' : 'deactivate',
            'residents',
            $resident->id,
            null,
            ['name' => $resident->full_name],
        );

        return redirect()
            ->route('residents.show', $resident)
            ->with('success', $resident->is_active
                ? "Resident {$resident->full_name} was restored."
                : "Resident {$resident->full_name} was deactivated.");
    }

    public function forceDestroy(Request $request, Resident $resident): RedirectResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Only a Super Admin can permanently delete residents.');

        $resident->delete();

        return redirect()
            ->route('residents.index')
            ->with('success', 'Resident permanently deleted.');
    }

    /**
     * Reference data shared by the create/edit forms, scoped to the barangay.
     *
     * @return array<string, mixed>
     */
    private function formData(Request $request): array
    {
        $user = $request->user();

        return [
            'households' => Household::query()
                ->when(! $user->isSuperAdmin(), fn ($q) => $q->where('barangay_id', $user->barangay_id))
                ->orderBy('household_number')
                ->get(['id', 'household_number', 'address']),
            'barangays' => $user->isSuperAdmin()
                ? Barangay::orderBy('name')->get(['id', 'name'])
                : [],
        ];
    }

    /**
     * Barangay staff may only touch residents within their own barangay.
     */
    private function authorizeBarangay(Request $request, Resident $resident): void
    {
        $user = $request->user();

        if (! $user->isSuperAdmin() && $resident->barangay_id !== $user->barangay_id) {
            abort(403, 'This resident belongs to another barangay.');
        }
    }

    private function authorizeStatusManagement(Request $request): void
    {
        abort_unless(
            $request->user()->hasRole(User::ROLE_SUPER_ADMIN, User::ROLE_BARANGAY_ADMIN),
            403,
            'Only a Super Admin or Barangay Admin can change resident status.',
        );
    }
}
