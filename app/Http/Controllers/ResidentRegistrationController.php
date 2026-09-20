<?php

namespace App\Http\Controllers;

use App\Models\Resident;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ResidentRegistrationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $search = $request->string('search')->trim()->value();

        $registrations = User::query()
            ->where('role', User::ROLE_RESIDENT)
            ->whereNull('resident_id')
            ->whereNotNull('registration_id')
            ->with('barangay:id,name')
            ->when(! $user->isSuperAdmin(), fn ($query) => $query->where('barangay_id', $user->barangay_id))
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('registration_id', 'like', "%{$search}%")
                        ->orWhere('first_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%");
                });
            })
            ->orderBy('created_at')
            ->get(['id', 'name', 'email', 'registration_id', 'barangay_id', 'created_at']);

        return Inertia::render('resident-registrations/index', [
            'registrations' => $registrations,
            'filters' => ['search' => $search],
        ]);
    }

    public function show(Request $request, User $registration): Response
    {
        $this->authorizePendingRegistration($request, $registration);

        $registration->load('barangay:id,name');

        return Inertia::render('resident-registrations/show', [
            'registration' => $registration,
        ]);
    }

    private function authorizePendingRegistration(Request $request, User $registration): void
    {
        abort_unless($registration->isPendingProfiling(), 404);

        $user = $request->user();

        if (! $user->isSuperAdmin() && $registration->barangay_id !== $user->barangay_id) {
            abort(403, 'This registration belongs to another barangay.');
        }
    }
}
