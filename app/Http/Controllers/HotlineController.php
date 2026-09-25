<?php

namespace App\Http\Controllers;

use App\Models\Hotline;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Tap-to-call emergency and service numbers.
 *
 * Only the two national numbers below are built in. Every local number (the
 * barangay hall, city DRRMO, police station, hospital) is entered by the
 * barangay admin, or city-wide by the super admin, because a wrong number
 * in an emergency is worse than no number at all.
 */
class HotlineController extends Controller
{
    private const NATIONAL = [
        ['name' => 'National Emergency Hotline', 'number' => '911', 'category' => 'emergency'],
        ['name' => 'Philippine Red Cross', 'number' => '143', 'category' => 'medical'],
    ];

    public function index(Request $request): Response
    {
        $user = $request->user();

        $local = Hotline::query()
            ->where(fn ($q) => $q
                ->whereNull('barangay_id')
                ->when($user->barangay_id, fn ($q) => $q->orWhere('barangay_id', $user->barangay_id)))
            ->orderByRaw('barangay_id is null')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get(['id', 'barangay_id', 'name', 'number', 'category']);

        return Inertia::render('hotlines', [
            'national' => self::NATIONAL,
            'barangayHotlines' => $local->whereNotNull('barangay_id')->values(),
            'cityHotlines' => $local->whereNull('barangay_id')->values(),
            'barangayName' => $user->barangay?->getAttribute('name'),
            'canManage' => $this->manageScope($user) !== false,
            'manages' => $user->isSuperAdmin() ? 'city' : 'barangay',
            'categories' => Hotline::CATEGORIES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $scope = $this->manageScope($request->user());
        abort_if($scope === false, 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'number' => ['required', 'string', 'max:40', 'regex:/^[0-9+()\-\s\/]+$/'],
            'category' => ['required', Rule::in(Hotline::CATEGORIES)],
        ]);

        $hotline = Hotline::create($validated + [
            'barangay_id' => $scope,
            'created_by' => $request->user()->id,
        ]);

        AuditLogger::record('create', 'hotlines', $hotline->id, null, $validated);

        return back()->with('success', "{$hotline->name} added.");
    }

    public function destroy(Request $request, Hotline $hotline): RedirectResponse
    {
        $scope = $this->manageScope($request->user());
        abort_unless($scope !== false && $hotline->barangay_id === $scope, 403, 'You can only remove numbers your own office added.');

        AuditLogger::record('delete', 'hotlines', $hotline->id, $hotline->only(['name', 'number']));
        $hotline->delete();

        return back()->with('success', 'Number removed.');
    }

    /**
     * Which list this user maintains: null for the city-wide list (super
     * admin), their barangay's id (barangay admin), or false for none.
     */
    private function manageScope(User $user): int|null|false
    {
        return match ($user->role) {
            User::ROLE_SUPER_ADMIN => null,
            User::ROLE_BARANGAY_ADMIN => $user->barangay_id ?? false,
            default => false,
        };
    }
}
