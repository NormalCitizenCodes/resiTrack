<?php

namespace App\Http\Controllers;

use App\Models\AccountDeletionRequest;
use App\Models\AppNotification;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountDeletionRequestController extends Controller
{
    public function create(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user->role === User::ROLE_RESIDENT, 403);

        return Inertia::render('settings/account', [
            'deletionRequest' => AccountDeletionRequest::query()
                ->where('user_id', $user->id)
                ->latest()
                ->first(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user->role === User::ROLE_RESIDENT, 403);

        if (AccountDeletionRequest::query()
            ->where('user_id', $user->id)
            ->where('status', AccountDeletionRequest::STATUS_PENDING)
            ->exists()) {
            return back()->with('error', 'You already have a deletion request pending review.');
        }

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        $deletionRequest = AccountDeletionRequest::create([
            'user_id' => $user->id,
            'resident_id' => $user->resident_id,
            'barangay_id' => $user->barangay_id,
            'reason' => $validated['reason'],
        ]);

        User::query()
            ->whereIn('role', [User::ROLE_SUPER_ADMIN, User::ROLE_BARANGAY_ADMIN])
            ->when(! $user->isSuperAdmin(), fn ($query) => $query->where(function ($inner) use ($user) {
                $inner->where('barangay_id', $user->barangay_id)->orWhere('role', User::ROLE_SUPER_ADMIN);
            }))
            ->each(fn (User $admin) => AppNotification::create([
                'user_id' => $admin->id,
                'resident_id' => $user->resident_id,
                'related_user_id' => $user->id,
                'type' => 'account_deletion',
                'action_url' => route('account-deletion-requests.index', ['highlight' => $deletionRequest->id]),
                'title' => 'New account deletion request',
                'message' => "{$user->name} requested account deletion.",
                'is_read' => false,
            ]));

        AuditLogger::record('deletion_requested', 'account_deletion_requests', $deletionRequest->id, null, [
            'user_id' => $user->id,
            'reason' => $deletionRequest->reason,
        ]);

        return back()->with('success', 'Your account deletion request has been submitted for administrator review.');
    }

    public function index(Request $request): Response
    {
        $admin = $request->user();
        $requests = AccountDeletionRequest::query()
            ->with([
                'user:id,name,email',
                'resident:id,resident_id,first_name,last_name',
                'barangay:id,name',
                'reviewer:id,name',
            ])
            ->when(! $admin->isSuperAdmin(), fn ($query) => $query->where('barangay_id', $admin->barangay_id))
            ->latest()
            ->get();

        return Inertia::render('account-deletion-requests/index', [
            'requests' => $requests,
            'highlight' => $request->integer('highlight') ?: null,
        ]);
    }

    public function approve(Request $request, AccountDeletionRequest $deletionRequest): RedirectResponse
    {
        $this->ensureOwnBarangay($request, $deletionRequest);

        if ($deletionRequest->status !== AccountDeletionRequest::STATUS_PENDING) {
            return back()->with('error', 'This deletion request has already been reviewed.');
        }

        $admin = $request->user();
        $deletionRequest->update([
            'status' => AccountDeletionRequest::STATUS_APPROVED,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
            'admin_remarks' => $request->input('admin_remarks'),
        ]);
        $deletionRequest->user()->update([
            'is_active' => false,
            'deactivated_at' => now(),
            'deactivated_by' => $admin->id,
        ]);

        $this->notifyResident($deletionRequest, 'Account Deletion Request Approved', "Your account has been deactivated according to the barangay's account retention policy.");
        AuditLogger::record('deletion_request_reviewed', 'account_deletion_requests', $deletionRequest->id, null, ['reviewed_by' => $admin->id, 'status' => AccountDeletionRequest::STATUS_APPROVED]);
        AuditLogger::record('deletion_request_approved', 'account_deletion_requests', $deletionRequest->id, null, ['reviewed_by' => $admin->id]);
        AuditLogger::record('account_deactivated', 'users', $deletionRequest->user_id, ['is_active' => true], ['is_active' => false, 'deactivated_by' => $admin->id]);

        return back()->with('success', 'The account deletion request was approved and the resident account was deactivated.');
    }

    public function reject(Request $request, AccountDeletionRequest $deletionRequest): RedirectResponse
    {
        $this->ensureOwnBarangay($request, $deletionRequest);

        if ($deletionRequest->status !== AccountDeletionRequest::STATUS_PENDING) {
            return back()->with('error', 'This deletion request has already been reviewed.');
        }

        $validated = $request->validate(['admin_remarks' => ['nullable', 'string', 'max:2000']]);
        $admin = $request->user();
        $deletionRequest->update([
            'status' => AccountDeletionRequest::STATUS_REJECTED,
            'reviewed_by' => $admin->id,
            'reviewed_at' => now(),
            'admin_remarks' => $validated['admin_remarks'] ?? null,
        ]);

        $message = 'Your account deletion request has been reviewed and rejected. Your account remains active.';
        if ($deletionRequest->admin_remarks) {
            $message .= " Administrator remarks: {$deletionRequest->admin_remarks}";
        }
        $this->notifyResident($deletionRequest, 'Account Deletion Request Rejected', $message);
        AuditLogger::record('deletion_request_reviewed', 'account_deletion_requests', $deletionRequest->id, null, ['reviewed_by' => $admin->id, 'status' => AccountDeletionRequest::STATUS_REJECTED]);
        AuditLogger::record('deletion_request_rejected', 'account_deletion_requests', $deletionRequest->id, null, ['reviewed_by' => $admin->id, 'remarks' => $deletionRequest->admin_remarks]);

        return back()->with('success', 'The account deletion request was rejected.');
    }

    private function ensureOwnBarangay(Request $request, AccountDeletionRequest $deletionRequest): void
    {
        $admin = $request->user();
        abort_unless($admin->isSuperAdmin() || $deletionRequest->barangay_id === $admin->barangay_id, 403);
    }

    private function notifyResident(AccountDeletionRequest $deletionRequest, string $title, string $message): void
    {
        AppNotification::create([
            'user_id' => $deletionRequest->user_id,
            'resident_id' => $deletionRequest->resident_id,
            'related_user_id' => $deletionRequest->reviewed_by,
            'type' => 'account_deletion',
            'action_url' => route('account-deletion.create'),
            'title' => $title,
            'message' => $message,
            'is_read' => false,
        ]);
    }
}
