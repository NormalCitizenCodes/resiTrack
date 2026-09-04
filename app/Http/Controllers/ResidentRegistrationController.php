<?php

namespace App\Http\Controllers;

use App\Models\Resident;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ResidentRegistrationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $registrations = User::query()
            ->where('role', User::ROLE_RESIDENT)
            ->whereNull('resident_id')
            ->whereNotNull('registration_id')
            ->with('barangay:id,name')
            ->when(! $user->isSuperAdmin(), fn ($query) => $query->where('barangay_id', $user->barangay_id))
            ->orderBy('created_at')
            ->get(['id', 'name', 'email', 'registration_id', 'barangay_id', 'created_at']);

        return Inertia::render('resident-registrations/index', [
            'registrations' => $registrations,
        ]);
    }

    public function approve(Request $request, User $registration): RedirectResponse
    {
        $user = $request->user();

        abort_unless(
            $registration->role === User::ROLE_RESIDENT
                && $registration->resident_id === null
                && $registration->registration_id !== null,
            404,
        );

        if (! $user->isSuperAdmin() && $registration->barangay_id !== $user->barangay_id) {
            abort(403, 'This registration belongs to another barangay.');
        }

        $resident = DB::transaction(function () use ($registration) {
            $registration->refresh();

            if ($registration->resident_id !== null) {
                return Resident::findOrFail($registration->resident_id);
            }

            [$firstName, $lastName] = $this->splitName($registration->name);
            $resident = Resident::create([
                'barangay_id' => $registration->barangay_id,
                'resident_id' => $registration->registration_id,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $registration->email,
                'citizenship' => 'Filipino',
                'registered_at' => now(),
            ]);

            $registration->update(['resident_id' => $resident->id]);

            AuditLogger::record('approve', 'resident_registrations', $registration->id, null, [
                'resident_id' => $resident->id,
                'registration_id' => $registration->registration_id,
            ]);

            return $resident;
        });

        return redirect()
            ->route('residents.edit', $resident)
            ->with('success', "{$registration->name}'s account was verified. Complete the resident profile.");
    }

    /** @return array{string, string} */
    private function splitName(string $name): array
    {
        $parts = preg_split('/\s+/', trim($name), 2) ?: [$name];

        return [$parts[0], $parts[1] ?? $parts[0]];
    }
}
