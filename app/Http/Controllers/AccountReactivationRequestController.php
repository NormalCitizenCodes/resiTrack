<?php

namespace App\Http\Controllers;

use App\Models\AccountReactivationRequest;
use App\Models\AppNotification;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AccountReactivationRequestController extends Controller
{
    public function create(Request $request): Response
    {
        $account = $this->inactiveAccount($request->string('identifier')->trim()->toString());

        return Inertia::render('account-reactivation/create', [
            'account' => $account ? [
                'name' => $account->name,
                'email' => $account->email,
                'barangay' => $account->barangay?->name,
                'identifier' => $request->string('identifier')->trim()->toString(),
            ] : null,
            'pending' => $account?->reactivationRequests()->where('status', AccountReactivationRequest::STATUS_PENDING)->exists() ?? false,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'identifier' => ['required', 'string', 'max:150'],
            'reason' => ['required', 'string', 'max:2000'],
        ]);
        $account = $this->inactiveAccount($validated['identifier']);

        if (! $account) {
            throw ValidationException::withMessages(['identifier' => 'We could not find a deactivated resident account with that identifier.']);
        }

        if ($account->reactivationRequests()->where('status', AccountReactivationRequest::STATUS_PENDING)->exists()) {
            return back()->with('error', 'You already have a pending account reactivation request. Please visit your Barangay Hall and wait for the barangay staff to review your request.');
        }

        $reactivationRequest = AccountReactivationRequest::create([
            'user_id' => $account->id,
            'resident_id' => $account->resident_id,
            'barangay_id' => $account->barangay_id,
            'reason' => $validated['reason'],
        ]);

        User::query()
            ->whereIn('role', [User::ROLE_SUPER_ADMIN, User::ROLE_BARANGAY_ADMIN])
            ->when(! $account->barangay_id, fn ($query) => $query->where('role', User::ROLE_SUPER_ADMIN))
            ->when($account->barangay_id, fn ($query) => $query->where(function ($inner) use ($account) {
                $inner->where('barangay_id', $account->barangay_id)->orWhere('role', User::ROLE_SUPER_ADMIN);
            }))
            ->each(fn (User $admin) => AppNotification::create([
                'user_id' => $admin->id,
                'resident_id' => $account->resident_id,
                'related_user_id' => $account->id,
                'type' => 'account_reactivation',
                'action_url' => route('account-reactivation-requests.index', ['highlight' => $reactivationRequest->id]),
                'title' => 'Account Reactivation Request',
                'message' => "{$account->name} has requested reactivation of their Resident Account.",
                'is_read' => false,
            ]));

        AuditLogger::record('account_reactivation_requested', 'account_reactivation_requests', $reactivationRequest->id, null, [
            'user_id' => $account->id,
            'barangay_id' => $account->barangay_id,
            'reason' => $reactivationRequest->reason,
        ]);

        return redirect()->route('account-reactivation.create')->with('success', 'Your account reactivation request has been submitted for administrator review.');
    }

    public function index(Request $request): Response
    {
        $admin = $request->user();
        $requests = AccountReactivationRequest::query()
            ->with(['user:id,name,email,deactivated_at', 'user.deletionRequests:id,user_id,reason,status,reviewed_at', 'resident:id,resident_id,first_name,last_name', 'barangay:id,name', 'reviewer:id,name'])
            ->when(! $admin->isSuperAdmin(), fn ($query) => $query->where('barangay_id', $admin->barangay_id))
            ->latest()
            ->get();

        return Inertia::render('account-reactivation/index', [
            'requests' => $requests,
            'highlight' => $request->integer('highlight') ?: null,
        ]);
    }

    public function approve(Request $request, AccountReactivationRequest $reactivationRequest): RedirectResponse
    {
        $this->authorizeRequest($request, $reactivationRequest);
        $this->ensurePending($reactivationRequest);
        $validated = $request->validate(['admin_remarks' => ['nullable', 'string', 'max:2000']]);
        $admin = $request->user();

        DB::transaction(function () use ($reactivationRequest, $validated, $admin): void {
            $reactivationRequest->update([
                'status' => AccountReactivationRequest::STATUS_APPROVED,
                'reviewed_by' => $admin->id,
                'reviewed_at' => now(),
                'admin_remarks' => $validated['admin_remarks'] ?? null,
            ]);
            $reactivationRequest->user()->update(['is_active' => true, 'deactivated_at' => null, 'deactivated_by' => null]);
        });

        $this->notifyResident($reactivationRequest, 'Your Resident Account has been reactivated.', 'Your account has been successfully reactivated after verification by the barangay staff. You can now log in again using your Resident ID or registered email address and password.');
        AuditLogger::record('account_reactivation_approved', 'account_reactivation_requests', $reactivationRequest->id, null, ['user_id' => $reactivationRequest->user_id, 'barangay_id' => $reactivationRequest->barangay_id, 'reviewed_by' => $admin->id, 'remarks' => $reactivationRequest->admin_remarks]);
        AuditLogger::record('account_reactivated', 'users', $reactivationRequest->user_id, ['is_active' => false], ['is_active' => true, 'reviewed_by' => $admin->id]);

        return back()->with('success', 'The resident account was reactivated.');
    }

    public function reject(Request $request, AccountReactivationRequest $reactivationRequest): RedirectResponse
    {
        $this->authorizeRequest($request, $reactivationRequest);
        $this->ensurePending($reactivationRequest);
        $validated = $request->validate(['admin_remarks' => ['required', 'string', 'max:2000']]);
        $admin = $request->user();
        $reactivationRequest->update([
            'status' => AccountReactivationRequest::STATUS_REJECTED,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
            'admin_remarks' => $validated['admin_remarks'],
        ]);

        $this->notifyResident($reactivationRequest, 'Your Account Reactivation Request was not approved.', 'Your Resident Account remains deactivated. Please visit your Barangay Hall if you need further assistance.');
        AuditLogger::record('account_reactivation_rejected', 'account_reactivation_requests', $reactivationRequest->id, null, ['user_id' => $reactivationRequest->user_id, 'barangay_id' => $reactivationRequest->barangay_id, 'reviewed_by' => $admin->id, 'reason' => $reactivationRequest->admin_remarks]);

        return back()->with('success', 'The reactivation request was rejected.');
    }

    private function inactiveAccount(string $identifier): ?User
    {
        if ($identifier === '') return null;
        $residentIdentifier = strtoupper($identifier);

        return User::query()->with('barangay:id,name')->where('role', User::ROLE_RESIDENT)
            ->where('is_active', false)
            ->where(function ($query) use ($identifier, $residentIdentifier) {
                $query->where('email', $identifier)->orWhereHas('resident', fn ($resident) => $resident->where('resident_id', $residentIdentifier));
            })->first();
    }

    private function authorizeRequest(Request $request, AccountReactivationRequest $reactivationRequest): void
    {
        $admin = $request->user();
        abort_unless($admin->isSuperAdmin() || $reactivationRequest->barangay_id === $admin->barangay_id, 403);
    }

    private function ensurePending(AccountReactivationRequest $reactivationRequest): void
    {
        abort_unless($reactivationRequest->status === AccountReactivationRequest::STATUS_PENDING, 422, 'This reactivation request has already been reviewed.');
    }

    private function notifyResident(AccountReactivationRequest $reactivationRequest, string $title, string $message): void
    {
        AppNotification::create([
            'user_id' => $reactivationRequest->user_id,
            'resident_id' => $reactivationRequest->resident_id,
            'related_user_id' => $reactivationRequest->reviewed_by,
            'type' => 'account_reactivation',
            'action_url' => route('account-reactivation.create'),
            'title' => $title,
            'message' => $message,
            'is_read' => false,
        ]);
    }
}
