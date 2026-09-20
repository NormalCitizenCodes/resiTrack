<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\AccountDeletionRequest;
use App\Models\ProgramApplication;
use App\Models\Resident;
use App\Models\User;
use App\Services\DashboardStatsService;
use App\Services\ResidentDashboardService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardStatsService $stats,
        private readonly ResidentDashboardService $residentStats,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        if ($user->role === User::ROLE_RESIDENT) {
            return $this->residentDashboard($user);
        }

        // Barangay staff see their own barangay; a super admin sees the whole city.
        $barangayId = $user->isSuperAdmin() ? null : $user->barangay_id;

        return Inertia::render('dashboard', [
            'stats' => $this->stats->forBarangay($barangayId),
            'scope' => $user->isSuperAdmin() ? 'City-wide' : ($user->barangay?->name ?? 'Barangay'),
            'barangays' => $user->isSuperAdmin() ? $this->stats->barangaySummaries() : [],
        ]);
    }

    /**
     * A resident's own dashboard: a feed (their notifications, richer than the
     * bell dropdown) plus a profile-completeness nudge and sector breakdown —
     * distinct from the staff aggregate-stats view above.
     */
    private function residentDashboard(User $user): Response
    {
        $resident = $user->resident_id
            ? Resident::with('sectors:id,code,sector_name')->find($user->resident_id)
            : null;

        return Inertia::render('dashboard-resident', [
            'resident' => $resident,
            ...$resident ? $this->residentStats->forResident($resident) : ['completeness' => null, 'sectors' => []],
            'recentApplications' => $resident
                ? ProgramApplication::where('resident_id', $resident->id)
                    ->with('program:id,title,status')
                    ->latest('applied_at')
                    ->limit(5)
                    ->get()
                : [],
            'feed' => AppNotification::where('user_id', $user->id)
                ->latest()
                ->limit(15)
                ->get(),
            'deletionRequest' => AccountDeletionRequest::where('user_id', $user->id)->latest()->first(),
        ]);
    }
}
