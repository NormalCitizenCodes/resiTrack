<?php

namespace App\Http\Controllers;

use App\Models\Resident;
use App\Services\AuditLogger;
use App\Services\SectorClassificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Self-service editing of a resident's own record, scoped to the acting
 * user's linked resident_id (not barangay-wide like ResidentController).
 *
 * Deliberately a small field subset: contact/socio-economic data only.
 * Identity fields (name, DOB, PhilSys) and certified vulnerability flags
 * (is_pwd, is_solo_parent, is_pregnant) require staff/document verification
 * and stay behind ResidentController's staff-only routes.
 */
class MyProfileController extends Controller
{
    public function __construct(private readonly SectorClassificationService $classifier) {}

    public function edit(Request $request): Response
    {
        return Inertia::render('my-profile', [
            'resident' => $this->residentFor($request),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $resident = $this->residentFor($request);
        abort_unless($resident, 404, 'No resident record is linked to your account.');

        $validated = $request->validate([
            'contact_number' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\- ]+$/'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string', 'max:255'],
            'civil_status' => ['nullable', Rule::in(['single', 'married', 'widowed', 'separated'])],
            'occupation' => ['nullable', 'string', 'max:150'],
            'employment_status' => ['nullable', Rule::in(['employed', 'unemployed', 'self_employed'])],
            'education_level' => ['nullable', Rule::in(['elementary', 'highschool', 'college', 'vocational', 'none'])],
            'education_status' => ['nullable', Rule::in(['enrolled', 'not_enrolled', 'graduated'])],
            'monthly_income' => ['nullable', 'numeric', 'min:0', 'max:9999999'],
        ]);

        $resident->fill($validated);
        $resident->save();

        // Socio-economic edits (education/employment status) can change which
        // sectors this resident belongs to, e.g. OSY - same as staff updates.
        $this->classifier->classify($resident);

        AuditLogger::record('update', 'residents', $resident->id, null, [
            'name' => $resident->full_name,
            'source' => 'self_service',
        ]);

        return redirect()->route('my-profile.edit')->with('success', 'Your profile was updated.');
    }

    private function residentFor(Request $request): ?Resident
    {
        $residentId = $request->user()->resident_id;

        return $residentId ? Resident::with('sectors:id,code,sector_name')->find($residentId) : null;
    }
}
