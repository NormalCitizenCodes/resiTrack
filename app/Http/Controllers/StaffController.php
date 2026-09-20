<?php

namespace App\Http\Controllers;

use App\Models\Barangay;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Staff account management - creating and deactivating bhw (and, for a
 * super admin, barangay_admin) logins. Deliberately excluded from bhw: this
 * is the one capability that actually distinguishes barangay_admin from bhw,
 * since every other route in the app treats the two roles identically.
 */
class StaffController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $staff = User::query()
            ->whereIn('role', [User::ROLE_BARANGAY_ADMIN, User::ROLE_BHW])
            ->with('barangay:id,name')
            ->when(! $user->isSuperAdmin(), fn ($q) => $q->where('barangay_id', $user->barangay_id))
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'role', 'barangay_id', 'is_active', 'last_login_at']);

        return Inertia::render('staff/index', [
            'staff' => $staff,
            'isSuperAdmin' => $user->isSuperAdmin(),
        ]);
    }

    public function create(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('staff/create', [
            'barangays' => $user->isSuperAdmin() ? Barangay::orderBy('name')->get(['id', 'name']) : [],
            'assignedBarangay' => $user->isSuperAdmin() ? null : $user->barangay?->only(['id', 'name']),
            'isSuperAdmin' => $user->isSuperAdmin(),
            'canCreateAdmin' => $user->isSuperAdmin(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        $allowedRoles = $user->isSuperAdmin()
            ? [User::ROLE_BARANGAY_ADMIN, User::ROLE_BHW]
            : [User::ROLE_BHW];

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in($allowedRoles)],
            'barangay_id' => $user->isSuperAdmin()
                ? ['required', 'integer', 'exists:barangays,id']
                : ['prohibited'],
        ]);

        $staff = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'barangay_id' => $user->isSuperAdmin() ? $validated['barangay_id'] : $user->barangay_id,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        AuditLogger::record('create', 'users', $staff->id, null, ['name' => $staff->name, 'role' => $staff->role]);

        return redirect()->route('staff.index')->with('success', "{$staff->name} was added.");
    }

    public function toggleActive(Request $request, User $staff): RedirectResponse
    {
        $user = $request->user();

        if (! $user->isSuperAdmin() && $staff->barangay_id !== $user->barangay_id) {
            abort(403, 'This staff member belongs to another barangay.');
        }

        if (! in_array($staff->role, [User::ROLE_BARANGAY_ADMIN, User::ROLE_BHW], true)) {
            abort(403, 'This account cannot be managed here.');
        }

        if ($staff->id === $user->id) {
            return back()->with('error', 'You cannot deactivate your own account.');
        }

        $staff->update(['is_active' => ! $staff->is_active]);

        AuditLogger::record(
            $staff->is_active ? 'reactivate' : 'deactivate',
            'users',
            $staff->id,
            null,
            ['name' => $staff->name],
        );

        return back()->with('success', $staff->is_active ? "{$staff->name} was reactivated." : "{$staff->name} was deactivated.");
    }
}
