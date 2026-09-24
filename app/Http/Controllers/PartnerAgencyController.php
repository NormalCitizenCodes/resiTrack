<?php

namespace App\Http\Controllers;

use App\Models\Barangay;
use App\Models\PartnerAgency;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class PartnerAgencyController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $accounts = User::query()
            ->where('role', User::ROLE_PARTNER_AGENCY)
            ->with(['agency:id,agency_name,agency_type', 'barangay:id,name'])
            ->when(! $user->isSuperAdmin(), fn ($query) => $query->where('barangay_id', $user->barangay_id))
            ->latest()
            ->get(['id', 'name', 'email', 'agency_id', 'barangay_id', 'is_active', 'last_login_at']);

        // Every barangay staff member picks from the full roster of agency orgs
        // here, not just ones already active in their own barangay - otherwise a
        // barangay with zero existing agency accounts could never create its
        // first one (the "Partner Agency" dropdown would have nothing to offer).
        // Creating a *new* agency org (as opposed to an account for an existing
        // one) stays super admin only - that's enforced separately in storeAgency().
        $agencies = PartnerAgency::query()
            ->withCount(['users as accounts_count' => fn ($query) => $query->where('role', User::ROLE_PARTNER_AGENCY)])
            ->orderBy('agency_name')
            ->get();

        return Inertia::render('partner-agencies/index', [
            'agencies' => $agencies,
            'accounts' => $accounts,
            'barangays' => $user->isSuperAdmin() ? Barangay::orderBy('name')->get(['id', 'name']) : [],
            'isSuperAdmin' => $user->isSuperAdmin(),
            'assignedBarangay' => $user->isSuperAdmin() ? null : $user->barangay?->only(['id', 'name']),
        ]);
    }

    public function storeAgency(Request $request): RedirectResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);
        $validated = $request->validate([
            'agency_name' => ['required', 'string', 'max:150', 'unique:partner_agencies,agency_name'],
            'agency_type' => ['nullable', 'string', 'max:100'],
            'contact_person' => ['nullable', 'string', 'max:150'],
            'contact_number' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);
        $agency = PartnerAgency::create([...$validated, 'is_active' => true, 'registered_at' => now()]);
        AuditLogger::record('partner_agency_created', 'partner_agencies', $agency->id, null, $validated);

        return back()->with('success', "Partner agency {$agency->agency_name} was created.");
    }

    public function storeAccount(Request $request): RedirectResponse
    {
        $actor = $request->user();
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'agency_id' => ['required', 'integer', 'exists:partner_agencies,id'],
            'barangay_id' => $actor->isSuperAdmin() ? ['required', 'integer', 'exists:barangays,id'] : ['prohibited'],
        ]);
        $barangayId = $actor->isSuperAdmin() ? $validated['barangay_id'] : $actor->barangay_id;
        abort_unless($barangayId !== null, 422, 'Your account is not assigned to a barangay.');

        $account = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => User::ROLE_PARTNER_AGENCY,
            'agency_id' => $validated['agency_id'],
            'barangay_id' => $barangayId,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);
        $agency = PartnerAgency::findOrFail($account->agency_id);
        AuditLogger::record('partner_agency_account_created', 'users', $account->id, null, ['agency_id' => $agency->id, 'barangay_id' => $barangayId]);
        AuditLogger::record('partner_agency_barangay_assigned', 'users', $account->id, null, ['agency_id' => $agency->id, 'barangay_id' => $barangayId]);
        NotificationService::notify($account->id, null, 'system', 'Partner Agency Account Created', "Your Partner Agency account has been created for {$agency->agency_name}. Barangay: {$account->barangay?->name}. You may now log in to resiTrack.", $actor->id, route('programs.index'));

        return back()->with('success', "Partner agency account {$account->name} was created.");
    }

    public function updateAgency(Request $request, PartnerAgency $agency): RedirectResponse
    {
        abort_unless($request->user()->isSuperAdmin(), 403);
        $validated = $request->validate($this->agencyValidationRules($agency));
        $agency->update($validated);
        AuditLogger::record('partner_agency_updated', 'partner_agencies', $agency->id, null, $validated);

        return back()->with('success', 'Partner agency information updated.');
    }

    /**
     * An agency's own account editing its own org's contact details, as
     * opposed to updateAgency() above which is super admin managing any
     * agency. The agency is resolved from the authenticated user, not a
     * route-bound id, so there is nothing for a request to target but the
     * caller's own organization.
     */
    public function showProfile(Request $request): Response
    {
        $agency = $this->ownAgency($request);

        return Inertia::render('partner-agencies/profile', ['agency' => $agency]);
    }

    public function updateProfile(Request $request): RedirectResponse
    {
        $agency = $this->ownAgency($request);
        $validated = $request->validate($this->agencyValidationRules($agency));
        $agency->update($validated);
        AuditLogger::record('partner_agency_profile_updated', 'partner_agencies', $agency->id, null, $validated);

        return back()->with('success', 'Agency profile updated.');
    }

    private function ownAgency(Request $request): PartnerAgency
    {
        $agencyId = $request->user()->agency_id;
        abort_unless($agencyId !== null, 404);

        return PartnerAgency::findOrFail($agencyId);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    private function agencyValidationRules(PartnerAgency $agency): array
    {
        return [
            'agency_name' => ['required', 'string', 'max:150', Rule::unique('partner_agencies', 'agency_name')->ignore($agency->id)],
            'agency_type' => ['nullable', 'string', 'max:100'],
            'contact_person' => ['nullable', 'string', 'max:150'],
            'contact_number' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function updateAccount(Request $request, User $account): RedirectResponse
    {
        $this->authorizeAccount($request, $account);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($account->id)],
            'agency_id' => ['required', 'integer', 'exists:partner_agencies,id'],
        ]);
        $account->update($validated);
        AuditLogger::record('partner_agency_account_updated', 'users', $account->id, null, ['agency_id' => $account->agency_id]);

        return back()->with('success', 'Partner agency account updated.');
    }

    public function toggleAccount(Request $request, User $account): RedirectResponse
    {
        $this->authorizeAccount($request, $account);
        $account->update(['is_active' => ! $account->is_active]);
        AuditLogger::record($account->is_active ? 'partner_agency_account_activated' : 'partner_agency_account_deactivated', 'users', $account->id, null, ['agency_id' => $account->agency_id, 'barangay_id' => $account->barangay_id]);

        return back()->with('success', $account->is_active ? 'Agency account activated.' : 'Agency account deactivated.');
    }

    private function authorizeAccount(Request $request, User $account): void
    {
        abort_unless($account->role === User::ROLE_PARTNER_AGENCY, 404);
        abort_unless($request->user()->isSuperAdmin() || $account->barangay_id === $request->user()->barangay_id, 403);
    }
}
