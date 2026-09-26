<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreResidentRequest;
use App\Http\Requests\UpdateResidentRequest;
use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\Beneficiary;
use App\Models\Concern;
use App\Models\DocumentRequest;
use App\Models\DuplicateAlert;
use App\Models\Household;
use App\Models\ProgramApplication;
use App\Models\Resident;
use App\Models\User;
use App\Models\VulnerabilitySector;
use App\Services\ActivityLogPresenter;
use App\Services\AuditLogger;
use App\Services\DuplicateDetectionService;
use App\Services\NotificationService;
use App\Services\PregnancyStatus;
use App\Services\PsgcAddress;
use App\Services\SectorClassificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class ResidentController extends Controller
{
    public function __construct(
        private readonly SectorClassificationService $classifier,
        private readonly DuplicateDetectionService $duplicates,
        private readonly PregnancyStatus $pregnancy,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        $residents = Resident::query()
            ->with(['sectors:id,code,sector_name', 'household:id,household_number', 'barangay:id,name'])
            ->when(! $user->isSuperAdmin(), fn ($q) => $q->where('barangay_id', $user->barangay_id))
            ->when($user->isSuperAdmin() ? $request->integer('barangay_id') : null, fn ($q, $barangayId) => $q->where('barangay_id', $barangayId))
            ->when($request->string('search')->trim()->value(), function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('resident_id', 'like', '%'.(Resident::normalizeOfficialId($search) ?: $search).'%')
                        ->orWhere('philsys_card_no', 'like', "%{$search}%");
                });
            })
            ->when($request->string('sector')->value(), function ($q, $sector) {
                $q->whereHas('sectors', fn ($s) => $s->where('code', $sector));
            })
            ->when($request->string('status')->value() === 'active', fn ($q) => $q->where('is_active', true))
            ->when($request->string('status')->value() === 'inactive', fn ($q) => $q->where('is_active', false))
            ->when($request->string('status')->value() === 'flagged', fn ($q) => $q->where('is_duplicate_flagged', true))
            ->when($request->string('household')->value() === 'none', fn ($q) => $q->whereNull('household_id'))
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('residents/index', [
            'residents' => $residents,
            'sectors' => VulnerabilitySector::orderBy('id')->get(['id', 'code', 'sector_name']),
            'filters' => $request->only(['search', 'sector', 'status', 'household', 'barangay_id']),
            'barangays' => $user->isSuperAdmin() ? Barangay::orderBy('name')->get(['id', 'name']) : [],
        ]);
    }

    public function create(Request $request): Response|RedirectResponse
    {
        // A BHW revisiting a "complete profiling" link (e.g. clicking the same
        // notification twice) after it's already been completed used to hit a
        // bare 404. Send them to the resident's actual profile instead.
        if ($request->filled('linked_user') || $request->filled('account')) {
            $account = User::find($request->integer('linked_user') ?: $request->integer('account'));

            if ($account && $account->resident_id !== null) {
                return redirect()
                    ->route('residents.show', $account->resident_id)
                    ->with('success', "{$account->name} has already been profiled.");
            }
        }

        // "Add member" on a household page opens this form with that household chosen,
        // but only one of the viewer's own barangay (anything else is ignored).
        $user = $request->user();
        $prefillHouseholdId = $request->integer('household_id') > 0
            ? Household::query()
                ->whereKey($request->integer('household_id'))
                ->when(! $user->isSuperAdmin(), fn ($q) => $q->where('barangay_id', $user->barangay_id))
                ->value('id')
            : null;

        return Inertia::render('residents/create', [
            ...$this->formData($request, $prefillHouseholdId),
            'linkedAccount' => $this->linkedAccountPayload($request),
            'prefillHouseholdId' => $prefillHouseholdId,
        ]);
    }

    public function store(StoreResidentRequest $request): RedirectResponse
    {
        $user = $request->user();
        $linkedAccount = $request->pendingAccountToLink();

        // linked_user_id was submitted but pendingAccountToLink() found no
        // still-pending match - most likely another BHW already completed this
        // profiling. The create() page already redirects for this on load, but
        // a BHW who had the form open before that happened, then submits
        // without reloading, would otherwise fall through to creating a
        // second, unlinked resident for the same person.
        if (! $linkedAccount && $request->filled('linked_user_id')) {
            $existing = User::find($request->integer('linked_user_id'));

            if ($existing && $existing->resident_id !== null) {
                return redirect()
                    ->route('residents.show', $existing->resident_id)
                    ->with('success', "{$existing->name} has already been profiled by another staff member.");
            }
        }

        $alreadyLinkedResidentId = null;

        $resident = DB::transaction(function () use ($request, $user, &$linkedAccount, &$alreadyLinkedResidentId) {
            if ($linkedAccount) {
                // pendingAccountToLink() already validated this is still pending,
                // but that was earlier in the request - two BHWs can both load the
                // same "complete profiling" link before either submits. Re-check
                // under a row lock right before writing (held for the rest of this
                // transaction) so a losing second submission is redirected to the
                // resident the other one just created, instead of silently
                // creating a duplicate profile.
                $fresh = User::whereKey($linkedAccount->id)->lockForUpdate()->first();

                if (! $fresh || $fresh->resident_id !== null) {
                    $alreadyLinkedResidentId = $fresh?->resident_id;

                    return null;
                }

                $linkedAccount = $fresh;
            }

            $resident = new Resident($request->safe()->except([
                'create_account',
                'password',
                'password_confirmation',
                'linked_user_id',
                'is_pregnant',
                'pregnancy_expected_month',
            ]));
            $this->pregnancy->apply($resident, $request->boolean('is_pregnant'), $request->string('pregnancy_expected_month')->value() ?: null, 'staff');
            $resident->barangay_id = $user->isSuperAdmin()
                ? ($request->integer('barangay_id') ?: Barangay::value('id'))
                : $user->barangay_id;
            $resident->registered_at = Carbon::now();
            $resident->profiled_by_user_id = $user->id;
            $resident->profiled_at = Carbon::now();
            $resident->save();
            $resident->assignOfficialId();

            if ($linkedAccount) {
                $this->linkExistingAccount($linkedAccount, $resident);
            } elseif ($request->boolean('create_account')) {
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

            return $resident;
        });

        if ($resident === null) {
            return redirect()
                ->route('residents.show', $alreadyLinkedResidentId)
                ->with('success', "{$linkedAccount->name} has already been profiled by another staff member.");
        }

        // Classify vulnerability sectors, then screen for duplicates/transfers.
        $this->classifier->classify($resident);
        $newAlerts = $this->duplicates->scan($resident);

        AuditLogger::record('create', 'residents', $resident->id, null, ['name' => $resident->full_name]);

        $message = $linkedAccount
            ? "Resident {$resident->full_name} was profiled and verified. The existing account is now linked."
            : "Resident {$resident->full_name} registered successfully.";
        if ($newAlerts > 0) {
            $message .= " {$newAlerts} possible duplicate/transfer match(es) were flagged for review.";
        }

        $leaderNote = $this->applyLeaderChoice($request, $resident);
        if ($leaderNote !== null) {
            $message .= ' '.$leaderNote;
        }

        $accountCreated = $linkedAccount === null && $request->boolean('create_account');
        $emailLoginAvailable = $linkedAccount
            ? filled($linkedAccount->email)
            : filled($resident->email);

        return redirect()
            ->route('residents.show', $resident)
            ->with('success', $message)
            ->with('residentRegistration', [
                'residentId' => $resident->resident_id,
                'name' => $resident->full_name,
                'householdId' => $resident->household?->household_id ?? $resident->household_id,
                'accountCreated' => $accountCreated,
                'accountLinked' => $linkedAccount !== null,
                'emailLoginAvailable' => $emailLoginAvailable,
            ]);
    }

    public function show(Request $request, Resident $resident, ActivityLogPresenter $presenter): Response
    {
        $this->authorizeBarangay($request, $resident);
        $viewer = $request->user();

        $resident->load([
            'sectors:id,code,sector_name',
            'household',
            'barangay:id,name',
            'transferBarangay:id,name',
            'profiledBy:id,name,role',
        ]);

        // Duplicate/transfer alerts that reference this resident. The other record is
        // named, but only linked when this viewer may open it (the same rule as the
        // Duplicate Alerts page: a record from another barangay stays closed).
        $alerts = DuplicateAlert::query()
            ->with([
                'residentOne:id,first_name,middle_name,last_name,barangay_id',
                'residentOne.barangay:id,name',
                'residentTwo:id,first_name,middle_name,last_name,barangay_id',
                'residentTwo.barangay:id,name',
            ])
            ->where(function ($q) use ($resident) {
                $q->where('resident_id_1', $resident->id)
                    ->orWhere('resident_id_2', $resident->id);
            })
            ->orderByDesc('detected_at')
            ->get()
            ->map(function (DuplicateAlert $alert) use ($resident, $viewer) {
                $other = $alert->resident_id_1 === $resident->id ? $alert->residentTwo : $alert->residentOne;

                return [
                    'id' => $alert->id,
                    'match_basis' => $alert->match_basis,
                    'similarity_score' => $alert->similarity_score,
                    'status' => $alert->status,
                    'escalated' => $alert->escalated_at !== null,
                    'other' => $other ? [
                        'id' => $other->id,
                        'name' => $other->full_name,
                        'barangay' => $other->barangay?->getAttribute('name'),
                        'can_open' => $viewer->isSuperAdmin() || $other->barangay_id === $viewer->barangay_id,
                    ] : null,
                ];
            })
            ->values();

        $memberQuery = Resident::query()
            ->where('household_id', $resident->household_id)
            ->where('barangay_id', $resident->barangay_id)
            ->whereKeyNot($resident->id);
        $memberTotal = $resident->household_id === null ? 0 : (clone $memberQuery)->count();
        $members = $resident->household_id === null ? collect() : $memberQuery
            ->with('sectors:id,code,sector_name')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->limit(12)
            ->get();

        $beneficiaryStatus = Beneficiary::query()->where('resident_id', $resident->id)->pluck('status', 'program_id');

        $portal = $viewer->isBarangayStaff()
            ? User::query()->where('resident_id', $resident->id)->first(['id', 'is_active', 'last_login_at'])
            : null;

        return Inertia::render('residents/show', [
            'resident' => $resident,
            'alerts' => $alerts,
            'profiler' => [
                'name' => $resident->profiledBy?->getAttribute('name'),
                'role' => $resident->profiledBy instanceof User ? $resident->profiledBy->roleLabel() : null,
                'at' => $resident->profiled_at?->format('F j, Y'),
                'registered' => ($resident->registered_at ?? $resident->created_at)?->format('F j, Y'),
            ],
            'sector_reasons' => $this->classifier->explain($resident),
            'household_member_total' => $memberTotal,
            'is_household_leader' => $resident->household !== null && $resident->household->leader_resident_id === $resident->id,
            'household_members' => $members->map(fn (Resident $member) => [
                'id' => $member->id,
                'is_leader' => $resident->household !== null && $resident->household->leader_resident_id === $member->id,
                'name' => $member->full_name,
                'age' => $member->age,
                'sex' => $member->sex,
                'is_active' => $member->is_active,
                'sectors' => $member->sectors->pluck('sector_name')->all(),
            ])->values(),
            'programs' => ProgramApplication::query()
                ->where('resident_id', $resident->id)
                ->with('program:id,title,agency_id', 'program.agency:id,agency_name')
                ->latest('applied_at')
                ->limit(10)
                ->get()
                ->map(fn (ProgramApplication $application) => [
                    'id' => $application->id,
                    'title' => $application->program?->getAttribute('title'),
                    'agency' => $application->program?->agency?->getAttribute('agency_name'),
                    'status' => $application->status,
                    'beneficiary' => $beneficiaryStatus[$application->program_id] ?? null,
                    'applied_on' => $application->applied_at?->format('M j, Y'),
                ])->values(),
            // The certificate and concern desks belong to barangay staff; the super admin has none.
            'requests' => $viewer->isSuperAdmin() ? null : [
                'certificates' => DocumentRequest::query()->where('resident_id', $resident->id)->latest()->limit(5)->get()
                    ->map(fn (DocumentRequest $request) => [
                        'id' => $request->id,
                        'label' => DocumentRequest::TYPE_LABELS[$request->type] ?? $request->type,
                        'status' => $request->status,
                        'on' => $request->created_at?->format('M j, Y'),
                    ])->values(),
                'concerns' => Concern::query()->where('resident_id', $resident->id)->latest()->limit(5)->get()
                    ->map(fn (Concern $concern) => [
                        'id' => $concern->id,
                        'label' => Concern::CATEGORY_LABELS[$concern->category] ?? $concern->category,
                        'status' => $concern->status,
                        'on' => $concern->created_at?->format('M j, Y'),
                    ])->values(),
            ],
            // Who did what to this record: the Activity Log's audience (admins) only.
            'history' => in_array($viewer->role, [User::ROLE_BARANGAY_ADMIN, User::ROLE_SUPER_ADMIN], true)
                ? AuditLog::query()
                    ->where('table_affected', 'residents')
                    ->where('record_id', $resident->id)
                    ->with('user:id,name,role')
                    ->latest('performed_at')
                    ->limit(8)
                    ->get()
                    ->map(fn (AuditLog $log) => [
                        'id' => $log->id,
                        'summary' => $presenter->describe($log)['summary'],
                        'by' => $log->user?->getAttribute('name'),
                        'at' => $log->performed_at?->format('M j, Y g:i A'),
                    ])->values()
                : null,
            'portal' => $viewer->isBarangayStaff() ? [
                'has_account' => $portal !== null,
                'is_active' => $portal?->is_active,
                'last_login' => $portal?->last_login_at?->format('F j, Y'),
            ] : null,
        ]);
    }

    public function edit(Request $request, Resident $resident): Response
    {
        $this->authorizeBarangay($request, $resident);

        $resident->load('sectors:id,code');
        $resident->setAttribute('is_household_leader', $resident->household_id !== null
            && Household::query()->whereKey($resident->household_id)->where('leader_resident_id', $resident->id)->exists());

        return Inertia::render('residents/edit', [
            ...$this->formData($request, $resident->household_id),
            'resident' => $resident,
        ]);
    }

    public function update(UpdateResidentRequest $request, Resident $resident): RedirectResponse
    {
        $this->authorizeBarangay($request, $resident);

        $resident->fill(Arr::except($request->validated(), ['is_pregnant', 'pregnancy_expected_month']));
        $this->pregnancy->apply($resident, $request->boolean('is_pregnant'), $request->string('pregnancy_expected_month')->value() ?: null, 'staff');
        $resident->save();

        // Attributes may have changed sector membership; re-run classification.
        $this->classifier->classify($resident);
        $this->duplicates->scan($resident);

        AuditLogger::record('update', 'residents', $resident->id, null, ['name' => $resident->full_name]);

        $message = "Resident {$resident->full_name} updated successfully.";
        $leaderNote = $this->applyLeaderChoice($request, $resident);
        if ($leaderNote !== null) {
            $message .= ' '.$leaderNote;
        }

        return redirect()
            ->route('residents.show', $resident)
            ->with('success', $message);
    }

    /**
     * The form's "household leader" tick: records this person as their household's leader (the family's
     * choice, entered by staff), or clears it when someone who is the leader is unticked. Returns a note
     * when the choice could not be applied, so the confirmation message can say why.
     */
    private function applyLeaderChoice(Request $request, Resident $resident): ?string
    {
        if (! $request->has('is_household_leader') || $resident->household_id === null) {
            return null;
        }

        $household = Household::query()->where('barangay_id', $resident->barangay_id)->find($resident->household_id);

        if ($household === null) {
            return null;
        }

        // A just-created resident has not read its database defaults (is_active) back yet.
        $resident->refresh();

        if ($request->boolean('is_household_leader')) {
            if ($household->leader_resident_id === $resident->id) {
                return null;
            }

            if (! Household::canLead($resident, $household)) {
                return 'Not set as household leader: a leader must be an active member aged 18 or older.';
            }

            $household->update(['leader_resident_id' => $resident->id]);
            AuditLogger::record('update', 'households', $household->id, null, [
                'household_number' => $household->household_number,
                'changed' => 'household leader set to '.$resident->full_name,
            ]);

            return null;
        }

        if ($household->leader_resident_id === $resident->id) {
            $household->update(['leader_resident_id' => null]);
            AuditLogger::record('update', 'households', $household->id, null, [
                'household_number' => $household->household_number,
                'changed' => 'household leader cleared',
            ]);
        }

        return null;
    }

    public function destroy(Request $request, Resident $resident): RedirectResponse
    {
        $this->authorizeBarangay($request, $resident);
        $this->authorizeStatusManagement($request);

        // Deactivate rather than hard-delete to preserve records for audit.
        $resident->update(['is_active' => false]);
        $this->syncLinkedAccountStatus($resident, false, $request->user()->id);
        AuditLogger::record('deactivate', 'residents', $resident->id, null, ['name' => $resident->full_name]);

        return redirect()
            ->route('residents.index')
            ->with('success', "Resident {$resident->full_name} was deactivated.");
    }

    public function toggleActive(Request $request, Resident $resident): RedirectResponse
    {
        $this->authorizeBarangay($request, $resident);
        $this->authorizeStatusManagement($request);

        $resident->update(['is_active' => ! $resident->is_active]);

        User::query()
            ->where('resident_id', $resident->id)
            ->update(['is_active' => $resident->is_active]);

        $linkedAccount = User::query()->where('resident_id', $resident->id)->first();
        if ($linkedAccount) {
            $linkedAccount->update([
                'deactivated_at' => $resident->is_active ? null : now(),
                'deactivated_by' => $resident->is_active ? null : $request->user()->id,
            ]);
        }

        AuditLogger::record(
            $resident->is_active ? 'activate' : 'deactivate',
            'residents',
            $resident->id,
            null,
            ['name' => $resident->full_name],
        );
        AuditLogger::record(
            $resident->is_active ? 'account_reactivated' : 'account_deactivated',
            'users',
            $linkedAccount?->id,
            ['is_active' => ! $resident->is_active],
            ['is_active' => $resident->is_active, 'barangay_id' => $resident->barangay_id, 'actor_id' => $request->user()->id],
        );

        if ($resident->is_active && $linkedAccount) {
            NotificationService::notifyAccountReactivated($linkedAccount);
        }

        return redirect()
            ->route('residents.show', $resident)
            ->with('success', $resident->is_active
                ? "Resident {$resident->full_name} was restored."
                : "Resident {$resident->full_name} was deactivated.");
    }

    public function forceDestroy(Request $request, Resident $resident): RedirectResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403, 'Only a Super Admin can permanently delete residents.');

        // Logged before the delete: afterwards there is nothing left to name.
        AuditLogger::record('force_delete', 'residents', $resident->id, [
            'name' => $resident->full_name,
            'resident_id' => $resident->resident_id,
            'barangay_id' => $resident->barangay_id,
        ]);
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
    private function formData(Request $request, ?int $householdId = null): array
    {
        $user = $request->user();

        return [
            'addressDefaults' => app(PsgcAddress::class)->defaultsFor($user->barangay),
            'households' => $this->chosenHousehold($request, $householdId),
            'barangays' => $user->isSuperAdmin()
                ? Barangay::orderBy('name')->get(['id', 'name'])
                : [],
        ];
    }


    /**
     * The household already chosen on the form (a saved one, or "Add member" from its page), so the
     * picker can name it. The rest are found by typing, through `households/search`.
     *
     * @return list<array{id: int, household_number: string|null, address: string|null, family_name: string|null}>
     */
    private function chosenHousehold(Request $request, ?int $householdId): array
    {
        if ($householdId === null) {
            return [];
        }

        $user = $request->user();

        $household = Household::query()
            ->with(['leader:id,last_name', 'residents:id,household_id,last_name'])
            ->whereKey($householdId)
            ->when(! $user->isSuperAdmin(), fn ($q) => $q->where('barangay_id', $user->barangay_id))
            ->first();

        return $household ? [$household->pickerOption()] : [];
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
            $request->user()->hasRole(User::ROLE_BARANGAY_ADMIN),
            403,
            'Only a Barangay Admin can change resident status.',
        );
    }

    private function syncLinkedAccountStatus(Resident $resident, bool $active, int $actorId): void
    {
        $account = User::query()->where('resident_id', $resident->id)->first();

        if (! $account) {
            return;
        }

        $account->update([
            'is_active' => $active,
            'deactivated_at' => $active ? null : now(),
            'deactivated_by' => $active ? null : $actorId,
        ]);

        AuditLogger::record(
            $active ? 'account_reactivated' : 'account_deactivated',
            'users',
            $account->id,
            ['is_active' => ! $active],
            ['is_active' => $active, 'barangay_id' => $resident->barangay_id, 'actor_id' => $actorId],
        );
    }

    /**
     * @return array{id: int, name: string, email: string|null, first_name: string, last_name: string}|null
     */
    private function linkedAccountPayload(Request $request): ?array
    {
        if ($request->filled('linked_user') || $request->filled('account')) {
            $account = $this->pendingAccount(
                $request,
                $request->integer('linked_user') ?: $request->integer('account'),
            );
            [$firstName, $lastName] = $this->splitName($account->name);

            return [
                'id' => $account->id,
                'name' => $account->name,
                'email' => $account->email,
                'first_name' => $firstName,
                'last_name' => $lastName,
            ];
        }

        return null;
    }

    private function pendingAccount(Request $request, int $accountId): User
    {
        $account = User::query()->findOrFail($accountId);

        abort_unless($account->isPendingProfiling(), 404);

        $user = $request->user();

        if (! $user->isSuperAdmin() && $account->barangay_id !== $user->barangay_id) {
            abort(403, 'This registration belongs to another barangay.');
        }

        return $account;
    }

    private function linkExistingAccount(User $account, Resident $resident): void
    {
        $account->update([
            'resident_id' => $resident->id,
            'first_name' => $resident->first_name,
            'last_name' => $resident->last_name,
            'name' => $resident->full_name,
        ]);

        // A BHW physically checking ID and linking this account to an official
        // resident record is a stronger identity check than clicking an emailed
        // link - email_verified_at isn't mass-fillable (see GoogleAuthController
        // for the same pattern), so it's set directly here rather than above.
        if (! $account->hasVerifiedEmail()) {
            $account->forceFill(['email_verified_at' => now()])->save();
        }

        NotificationService::markRegistrationNotificationsComplete($account, $resident);
        NotificationService::notifyResidentProfileVerified($account, $resident);
    }

    /** @return array{string, string} */
    private function splitName(string $name): array
    {
        $parts = preg_split('/\s+/', trim($name), 2) ?: [$name];

        return [$parts[0], $parts[1] ?? $parts[0]];
    }
}
