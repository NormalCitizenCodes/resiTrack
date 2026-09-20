<?php

namespace App\Http\Controllers;

use App\Models\DuplicateAlert;
use App\Models\Resident;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DuplicateAlertController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $status = $request->string('status')->value() ?: 'pending';

        $alerts = DuplicateAlert::query()
            ->with([
                'residentOne:id,first_name,last_name,middle_name,date_of_birth,philsys_card_no,barangay_id,is_active',
                'residentOne.barangay:id,name',
                'residentTwo:id,first_name,last_name,middle_name,date_of_birth,philsys_card_no,barangay_id,is_active',
                'residentTwo.barangay:id,name',
                'escalator:id,name',
            ])
            ->when(
                $status === 'escalated',
                fn ($q) => $q->where('status', 'pending')->whereNotNull('escalated_at'),
                fn ($q) => $q->where('status', $status),
            )
            ->inBarangay($user->isSuperAdmin() ? null : $user->barangay_id)
            ->orderByDesc('similarity_score')
            ->orderByDesc('detected_at')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('duplicate-alerts/index', [
            'alerts' => $alerts,
            'counts' => [
                'pending' => $this->countByStatus($request, 'pending'),
                'escalated' => $this->countByStatus($request, 'escalated'),
                'resolved' => $this->countByStatus($request, 'resolved'),
                'dismissed' => $this->countByStatus($request, 'dismissed'),
            ],
            'filters' => ['status' => $status],
        ]);
    }

    /**
     * Mark the two records as the same person: keep one, deactivate the other.
     */
    public function resolve(Request $request, DuplicateAlert $alert): RedirectResponse
    {
        $this->authorizeReview($request, $alert);

        $validated = $request->validate([
            'keep_resident_id' => ['required', 'integer', 'in:'.$alert->resident_id_1.','.$alert->resident_id_2],
        ]);

        $keepId = (int) $validated['keep_resident_id'];
        $removeId = $keepId === $alert->resident_id_1 ? $alert->resident_id_2 : $alert->resident_id_1;

        Resident::whereKey($removeId)->update(['is_active' => false, 'is_duplicate_flagged' => false]);
        Resident::whereKey($keepId)->update(['is_duplicate_flagged' => false]);

        $alert->update([
            'status' => 'resolved',
            'resolved_by' => $request->user()->id,
            'resolved_at' => Carbon::now(),
        ]);

        AuditLogger::record('resolve', 'duplicate_alerts', $alert->id, null, ['kept_resident_id' => $keepId]);

        return back()->with('success', 'Duplicate resolved. The redundant record was deactivated.');
    }

    /**
     * Mark as a false positive: the two records are genuinely different people.
     */
    public function dismiss(Request $request, DuplicateAlert $alert): RedirectResponse
    {
        $this->authorizeReview($request, $alert);

        $alert->update([
            'status' => 'dismissed',
            'resolved_by' => $request->user()->id,
            'resolved_at' => Carbon::now(),
        ]);

        AuditLogger::record('dismiss', 'duplicate_alerts', $alert->id);

        // Clear the flag on both records if they have no other open alerts.
        foreach ([$alert->resident_id_1, $alert->resident_id_2] as $residentId) {
            $stillFlagged = DuplicateAlert::where('status', 'pending')
                ->where(fn ($q) => $q->where('resident_id_1', $residentId)->orWhere('resident_id_2', $residentId))
                ->exists();

            if (! $stillFlagged) {
                Resident::whereKey($residentId)->update(['is_duplicate_flagged' => false]);
            }
        }

        return back()->with('success', 'Alert dismissed as a false positive.');
    }

    /**
     * A BHW hands a case they can't settle to the barangay admin.
     */
    public function escalate(Request $request, DuplicateAlert $alert): RedirectResponse
    {
        $user = $request->user();
        $this->authorizeBarangay($request, $alert);

        abort_unless($alert->status === 'pending', 422, 'Only pending alerts can be escalated.');
        abort_if($alert->escalated_at !== null, 422, 'This alert was already escalated.');

        $validated = $request->validate(['note' => ['nullable', 'string', 'max:1000']]);

        $alert->update([
            'escalated_at' => Carbon::now(),
            'escalated_by' => $user->id,
            'escalation_note' => $validated['note'] ?? null,
        ]);

        AuditLogger::record('escalate', 'duplicate_alerts', $alert->id, null, ['note' => $validated['note'] ?? null]);

        User::query()
            ->where('role', User::ROLE_BARANGAY_ADMIN)
            ->where('barangay_id', $user->barangay_id)
            ->where('is_active', true)
            ->pluck('id')
            ->each(fn (int $adminId) => NotificationService::notify(
                $adminId,
                null,
                'duplicate_alert',
                'Duplicate alert escalated',
                "{$user->name} escalated a possible duplicate for your review.",
                $user->id,
                '/duplicate-alerts?status=escalated',
            ));

        return back()->with('success', 'Alert escalated to the barangay admin.');
    }

    /**
     * Staff may only act on alerts in their own barangay, and once an alert is
     * escalated only a barangay admin may settle it.
     */
    private function authorizeReview(Request $request, DuplicateAlert $alert): void
    {
        $this->authorizeBarangay($request, $alert);

        abort_if(
            $alert->escalated_at !== null && ! $request->user()->hasRole(User::ROLE_BARANGAY_ADMIN),
            403,
            'This alert was escalated and must be reviewed by the barangay admin.',
        );
    }

    private function authorizeBarangay(Request $request, DuplicateAlert $alert): void
    {
        $user = $request->user();

        abort_unless(
            $user->isSuperAdmin()
                || DuplicateAlert::whereKey($alert->id)->inBarangay($user->barangay_id)->exists(),
            403,
            'This alert belongs to another barangay.',
        );
    }

    private function countByStatus(Request $request, string $status): int
    {
        $user = $request->user();

        return DuplicateAlert::query()
            ->when(
                $status === 'escalated',
                fn ($q) => $q->where('status', 'pending')->whereNotNull('escalated_at'),
                fn ($q) => $q->where('status', $status),
            )
            ->inBarangay($user->isSuperAdmin() ? null : $user->barangay_id)
            ->count();
    }
}
