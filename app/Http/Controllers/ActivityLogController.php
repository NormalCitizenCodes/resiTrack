<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Barangay;
use App\Models\User;
use App\Services\ActivityLogPresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Who did what, and when: the audit trail as a readable page.
 *
 * A barangay admin sees everything done by people of their own barangay
 * (staff, agency accounts assigned to it, and residents' self-service
 * actions); the super admin sees every barangay and can narrow to one.
 * Entries are scoped by the acting user's barangay, the same rule the
 * Reports page already uses for its "records updated" count.
 */
class ActivityLogController extends Controller
{
    /** Everyone using resiTrack is in Cagayan de Oro, so times read in Philippine time. */
    private const TIMEZONE = 'Asia/Manila';

    private const STAFF_ROLES = [User::ROLE_BARANGAY_ADMIN, User::ROLE_BHW, User::ROLE_PARTNER_AGENCY];

    public function __construct(private readonly ActivityLogPresenter $presenter) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $barangayId = $user->isSuperAdmin()
            ? ($request->integer('barangay') ?: null)
            : $user->barangay_id;

        $who = $request->string('who')->value();
        $category = $request->string('category')->value();
        $from = $this->date($request->string('from')->value());
        $to = $this->date($request->string('to')->value());

        $logs = AuditLog::query()
            ->whereNotIn('action', ActivityLogPresenter::HIDDEN_ACTIONS)
            ->tap(fn (Builder $q) => $this->scope($q, $barangayId))
            ->when($who === 'residents', fn ($q) => $q->whereHas('user', fn ($u) => $u->where('role', User::ROLE_RESIDENT)))
            ->when(ctype_digit($who), fn ($q) => $q->where('user_id', (int) $who))
            ->when(array_key_exists($category, ActivityLogPresenter::CATEGORIES), fn ($q) => ActivityLogPresenter::whereCategory($q, $category))
            ->when($from, fn ($q) => $q->where('performed_at', '>=', $from->copy()->startOfDay()->utc()))
            ->when($to, fn ($q) => $q->where('performed_at', '<=', $to->copy()->endOfDay()->utc()))
            ->with('user:id,name,role,barangay_id', 'user.barangay:id,name')
            ->latest('performed_at')
            ->latest('id')
            ->paginate(30)
            ->withQueryString();

        $today = now(self::TIMEZONE)->startOfDay();

        $logs->through(function (AuditLog $log) use ($today) {
            $at = ($log->performed_at ?? $log->created_at ?? now())->copy()->setTimezone(self::TIMEZONE);
            $day = $at->copy()->startOfDay();

            return [
                'id' => $log->id,
                'day' => $day->toDateString(),
                'day_label' => match (true) {
                    $day->equalTo($today) => 'Today',
                    $day->equalTo($today->copy()->subDay()) => 'Yesterday',
                    default => $at->format('l, F j, Y'),
                },
                'time' => $at->format('g:i A'),
                'category' => ActivityLogPresenter::categoryOf($log),
                'actor' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'role' => $log->user->role,
                    'barangay' => $log->user->barangay?->getAttribute('name'),
                ] : null,
                ...$this->presenter->describe($log),
            ];
        });

        return Inertia::render('activity-log/index', [
            'entries' => $logs,
            'filters' => [
                'who' => $who,
                'category' => $category,
                'from' => $from?->toDateString(),
                'to' => $to?->toDateString(),
                'barangay' => $user->isSuperAdmin() ? $barangayId : null,
            ],
            'people' => $this->people($barangayId, $user->isSuperAdmin()),
            'categories' => ActivityLogPresenter::CATEGORIES,
            'barangays' => $user->isSuperAdmin() ? Barangay::orderBy('name')->get(['id', 'name']) : [],
            'isSuperAdmin' => $user->isSuperAdmin(),
            'scopeName' => $barangayId ? Barangay::whereKey($barangayId)->value('name') : 'All barangays',
            'staffSummary' => $barangayId ? $this->staffSummary($barangayId) : [],
        ]);
    }

    /**
     * @param  Builder<AuditLog>  $query
     */
    private function scope(Builder $query, ?int $barangayId): void
    {
        if ($barangayId !== null) {
            $query->whereHas('user', fn ($u) => $u->where('barangay_id', $barangayId));
        }
    }

    /**
     * The staff and agency accounts the "Who" filter offers.
     *
     * @return array<int, array{id: int, name: string, role: string, barangay: string|null}>
     */
    private function people(?int $barangayId, bool $includeSuperAdmins): array
    {
        return User::query()
            ->whereIn('role', $includeSuperAdmins ? [User::ROLE_SUPER_ADMIN, ...self::STAFF_ROLES] : self::STAFF_ROLES)
            ->when($barangayId !== null, fn ($q) => $q->where('barangay_id', $barangayId))
            ->with('barangay:id,name')
            ->orderBy('role')
            ->orderBy('name')
            ->get(['id', 'name', 'role', 'barangay_id'])
            ->map(fn (User $person) => [
                'id' => $person->id,
                'name' => $person->name,
                'role' => $person->role,
                'barangay' => $person->barangay?->getAttribute('name'),
            ])
            ->all();
    }

    /**
     * One line per staff member of the barangay: how much they did in the
     * last 30 days (sign-ins not counted) and when they last signed in.
     *
     * @return array<int, array{id: int, name: string, role: string, is_active: bool, actions: int, last_sign_in: string|null}>
     */
    private function staffSummary(int $barangayId): array
    {
        $since = now()->subDays(30);

        return User::query()
            ->whereIn('role', self::STAFF_ROLES)
            ->where('barangay_id', $barangayId)
            ->withCount(['auditLogs as actions' => fn ($q) => $q
                ->where('action', '!=', 'login')
                ->whereNotIn('action', ActivityLogPresenter::HIDDEN_ACTIONS)
                ->where('performed_at', '>=', $since)])
            ->withMax(['auditLogs as last_sign_in' => fn ($q) => $q->where('action', 'login')], 'performed_at')
            ->orderBy('role')
            ->orderBy('name')
            ->get(['id', 'name', 'role', 'is_active'])
            ->map(fn (User $person) => [
                'id' => $person->id,
                'name' => $person->name,
                'role' => $person->role,
                'is_active' => (bool) $person->is_active,
                'actions' => (int) $person->getAttribute('actions'),
                'last_sign_in' => $person->getAttribute('last_sign_in')
                    ? Carbon::parse($person->getAttribute('last_sign_in'), 'UTC')->setTimezone(self::TIMEZONE)->format('M j, g:i A')
                    : null,
            ])
            ->all();
    }

    private function date(string $value): ?Carbon
    {
        if (! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }

        return Carbon::createFromFormat('Y-m-d', $value, self::TIMEZONE) ?: null;
    }
}
