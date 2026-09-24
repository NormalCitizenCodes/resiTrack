<?php

namespace App\Http\Middleware;

use App\Models\AppNotification;
use App\Models\ProgramApplication;
use App\Models\User;
use App\Services\DashboardStatsService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                'barangay' => $user?->barangay,
                'agency' => $user?->agency,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'residentRegistration' => $request->session()->get('residentRegistration'),
            ],
            'unreadNotifications' => $user
                ? AppNotification::where('user_id', $user->id)->where('is_read', false)->count()
                : 0,
            'navCounts' => fn () => $this->navCounts($user),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'language' => in_array($request->cookie('app_lang') ?? $request->cookie('resident_lang'), ['en', 'fil', 'ceb'], true)
                ? ($request->cookie('app_lang') ?? $request->cookie('resident_lang'))
                : 'en',
        ];
    }

    /**
     * Badge counts for the sidebar, scoped to the user's barangay (staff) or
     * agency (partner agency). Evaluated lazily, so requests that never render
     * the sidebar skip the queries.
     *
     * @return array{duplicates?: int, registrations?: int, pendingApplications?: int}
     */
    private function navCounts(?User $user): array
    {
        if ($user === null) {
            return [];
        }

        if ($user->isBarangayStaff()) {
            $barangayId = $user->isSuperAdmin() ? null : $user->barangay_id;

            $counts = ['duplicates' => app(DashboardStatsService::class)->pendingDuplicates($barangayId)];

            if ($user->role === User::ROLE_BHW) {
                $counts['registrations'] = User::query()
                    ->where('role', User::ROLE_RESIDENT)
                    ->whereNull('resident_id')
                    ->whereNotNull('registration_id')
                    ->where('barangay_id', $barangayId)
                    ->count();
            }

            return $counts;
        }

        if ($user->role === User::ROLE_PARTNER_AGENCY) {
            return [
                'pendingApplications' => ProgramApplication::query()
                    ->whereHas('program', fn ($q) => $q
                        ->where('agency_id', $user->agency_id)
                        ->when($user->barangay_id !== null, fn ($q) => $q
                            ->where(fn ($inner) => $inner->whereNull('barangay_id')->orWhere('barangay_id', $user->barangay_id))))
                    ->where('status', 'pending')
                    ->count(),
            ];
        }

        return [];
    }
}
