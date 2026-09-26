<?php

namespace App\Http\Controllers;

use App\Models\AccountDeletionRequest;
use App\Models\AccountReactivationRequest;
use App\Models\AppNotification;
use App\Models\Concern;
use App\Models\DocumentRequest;
use App\Models\Program;
use App\Models\ProgramApplication;
use App\Models\ProgramSchedule;
use App\Models\Resident;
use App\Models\User;
use App\Services\DashboardStatsService;
use App\Services\OnboardingService;
use App\Services\ProgramEligibilityService;
use App\Services\ResidentDashboardService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardStatsService $stats,
        private readonly ResidentDashboardService $residentStats,
        private readonly OnboardingService $onboarding,
        private readonly ProgramEligibilityService $eligibility,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        if ($user->role === User::ROLE_RESIDENT) {
            return $this->residentDashboard($user);
        }

        // A partner agency account is tied to exactly one barangay, same as staff
        // (see PartnerAgencyController::storeAccount) - its own stat cards below
        // stay scoped exactly as they already do, this is not a city-wide account.
        $barangayId = $user->isSuperAdmin() ? null : $user->barangay_id;

        // The city-wide "By Barangay" summary (and heatmap) is a separate, additional
        // view: super admin already sees it; a partner agency now also gets it, to
        // help decide where to target future programs, without changing the scope
        // of its own stats above.
        $showCityWideSummary = $user->isSuperAdmin() || $user->role === User::ROLE_PARTNER_AGENCY;

        return Inertia::render('dashboard', [
            'stats' => $this->stats->forBarangay($barangayId),
            'scope' => $user->isSuperAdmin() ? 'City-wide' : ($user->barangay?->name ?? 'Barangay'),
            'barangays' => $showCityWideSummary ? $this->stats->barangaySummaries() : [],
            'attention' => $user->isBarangayStaff() ? $this->attentionItems($user, $barangayId) : [],
            'onboarding' => $this->onboarding->checklistFor($user),
        ]);
    }

    /**
     * What is waiting on this staff member, scoped exactly like the pages the
     * links lead to: BHWs verify resident accounts, admins review account
     * requests, everyone sees pending duplicate alerts.
     *
     * @return array<int, array{key: string, label: string, count: int, oldest_days: int|null, href: string}>
     */
    private function attentionItems(User $user, ?int $barangayId): array
    {
        $duplicates = $this->stats->pendingDuplicates($barangayId);

        $items = [
            [
                'key' => 'duplicates',
                'label' => 'Pending duplicate alerts',
                'count' => $duplicates,
                'oldest_days' => $duplicates > 0 ? $this->daysSince($this->stats->oldestPendingDuplicate($barangayId)) : null,
                'href' => '/duplicate-alerts',
            ],
        ];

        if ($user->role === User::ROLE_BHW) {
            $items[] = ['key' => 'registrations', 'label' => 'Resident accounts to verify', 'href' => '/resident-registrations', ...$this->waiting(
                User::query()
                    ->where('role', User::ROLE_RESIDENT)
                    ->whereNull('resident_id')
                    ->whereNotNull('registration_id')
                    ->where('barangay_id', $barangayId),
            )];
        }

        if (! $user->isSuperAdmin()) {
            $items[] = ['key' => 'documents', 'label' => 'Certificate requests to prepare', 'href' => '/document-requests', ...$this->waiting(
                DocumentRequest::where('barangay_id', $barangayId)->where('status', DocumentRequest::STATUS_PENDING),
            )];
            $items[] = ['key' => 'concerns', 'label' => 'New reports from residents', 'href' => '/resident-concerns', ...$this->waiting(
                Concern::where('barangay_id', $barangayId)->where('status', 'open'),
            )];
        }

        if ($user->role !== User::ROLE_BHW) {
            $items[] = ['key' => 'deletions', 'label' => 'Account deletion requests', 'href' => '/account-deletion-requests', ...$this->waiting(
                AccountDeletionRequest::query()
                    ->where('status', AccountDeletionRequest::STATUS_PENDING)
                    ->when($barangayId, fn ($query) => $query->where('barangay_id', $barangayId)),
            )];
            $items[] = ['key' => 'reactivations', 'label' => 'Account reactivation requests', 'href' => '/account-reactivation-requests', ...$this->waiting(
                AccountReactivationRequest::query()
                    ->where('status', AccountReactivationRequest::STATUS_PENDING)
                    ->when($barangayId, fn ($query) => $query->where('barangay_id', $barangayId)),
            )];
        }

        return $items;
    }

    /**
     * How many are waiting and for how many days the longest-waiting one has been.
     *
     * @param  Builder<covariant Model>  $query
     * @return array{count: int, oldest_days: int|null}
     */
    private function waiting(Builder $query): array
    {
        $count = (clone $query)->count();

        return [
            'count' => $count,
            'oldest_days' => $count > 0 ? $this->daysSince((clone $query)->min('created_at')) : null,
        ];
    }

    private function daysSince(mixed $moment): ?int
    {
        return is_string($moment) ? max(0, (int) Carbon::parse($moment)->startOfDay()->diffInDays(Carbon::today())) : null;
    }

    /**
     * Open programs this resident qualifies for and has not applied to yet, so
     * the first thing on their dashboard is something they can act on. Uses the
     * same eligibility rule as the Apply button (barangay, then sector overlap),
     * skips programs whose slots are all taken, and shows at most a handful.
     *
     * @return array{total: int, items: array<int, array<string, mixed>>}
     */
    private function matchedPrograms(Resident $resident): array
    {
        $resident->loadMissing('sectors:id,code,sector_name');

        $programs = Program::query()
            ->where('status', 'active')
            ->where(fn ($query) => $query->whereNull('end_date')->orWhereDate('end_date', '>=', today()))
            ->where(fn ($query) => $query->whereNull('barangay_id')->orWhere('barangay_id', $resident->barangay_id))
            ->whereDoesntHave('applications', fn ($applications) => $applications->where('resident_id', $resident->id))
            ->with(['agency:id,agency_name', 'sectors:id,code,sector_name'])
            ->latest()
            ->limit(30)
            ->get()
            ->filter(fn (Program $program) => $this->eligibility->residentQualifies($program, $resident))
            ->filter(fn (Program $program) => $program->slots_available === 0 || $program->slots_filled < $program->slots_available);

        return [
            'total' => $programs->count(),
            'items' => $programs->take(3)->map(fn (Program $program) => $this->programCard($program))->values()->all(),
        ];
    }

    /**
     * What the resident dashboard shows for one matched program.
     *
     * @return array<string, mixed>
     */
    private function programCard(Program $program): array
    {
        $slotsLeft = $program->slots_available > 0 ? $program->slots_available - $program->slots_filled : null;

        return [
            'id' => $program->id,
            'title' => $program->title,
            'agency' => $program->agency?->getAttribute('agency_name'),
            'slots_left' => $slotsLeft,
            'end_date' => $program->end_date ? Carbon::parse($program->end_date)->toDateString() : null,
            'sectors' => $program->sectors
                ->map(fn (Model $sector) => ['code' => $sector->getAttribute('code'), 'name' => $sector->getAttribute('sector_name')])
                ->values()
                ->all(),
        ];
    }

    /**
     * A resident's own dashboard: a feed (their notifications, richer than the
     * bell dropdown) plus a profile-completeness nudge and sector breakdown -
     * distinct from the staff aggregate-stats view above.
     */
    /**
     * Payout and service days coming up for programs this resident is an
     * active beneficiary of, soonest first, so a claim date is never missed.
     *
     * @return array<int, array<string, mixed>>
     */
    private function upcomingSchedules(Resident $resident): array
    {
        $programIds = $resident->beneficiaries()->where('status', 'active')->pluck('program_id');

        return ProgramSchedule::query()
            ->whereIn('program_id', $programIds)
            ->where('starts_at', '>=', today())
            ->with('program:id,title')
            ->orderBy('starts_at')
            ->limit(5)
            ->get()
            ->map(fn (ProgramSchedule $schedule) => ProgramController::scheduleData($schedule) + [
                'program_title' => $schedule->program?->getAttribute('title'),
            ])
            ->all();
    }

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
            'matchedPrograms' => $resident ? $this->matchedPrograms($resident) : [],
            'upcomingSchedules' => $resident ? $this->upcomingSchedules($resident) : [],
            'feed' => AppNotification::where('user_id', $user->id)
                ->latest()
                ->limit(15)
                ->get(),
            'deletionRequest' => AccountDeletionRequest::where('user_id', $user->id)->latest()->first(),
        ]);
    }
}
