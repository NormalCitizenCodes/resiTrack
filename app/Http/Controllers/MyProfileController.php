<?php

namespace App\Http\Controllers;

use App\Models\Resident;
use App\Services\AuditLogger;
use App\Services\PregnancyStatus;
use App\Services\SectorClassificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Self-service editing of a resident's own record, scoped to the acting
 * user's linked resident_id (not barangay-wide like ResidentController).
 *
 * Deliberately a small field subset: contact/socio-economic data only.
 * Identity fields (name, DOB, PhilSys) and certified vulnerability flags
 * (is_pwd, is_solo_parent) require staff/document verification and stay
 * behind ResidentController's staff-only routes. Pregnancy is the one
 * exception: it ends by itself (see PregnancyStatus), so the resident may
 * report it, marked as self-reported.
 */
class MyProfileController extends Controller
{
    public function __construct(
        private readonly SectorClassificationService $classifier,
        private readonly PregnancyStatus $pregnancy,
    ) {}

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

        // A pregnancy is the one sector a resident may report themselves: it ends by itself, so it
        // needs no certificate. It is marked self-reported so staff and programs can tell.
        $pregnancyNote = $this->applyPregnancy($request, $resident);

        $resident->save();

        // Socio-economic edits (education/employment status) and a pregnancy can change which
        // sectors this resident belongs to, e.g. OSY - same as staff updates.
        $this->classifier->classify($resident);

        AuditLogger::record('update', 'residents', $resident->id, null, array_filter([
            'name' => $resident->full_name,
            'source' => 'self_service',
            'pregnancy' => $pregnancyNote,
        ]));

        return redirect()->route('my-profile.edit')->with('success', 'Your profile was updated.');
    }

    /**
     * Applies the resident's own pregnancy report (a tick and an expected month), if the form sent one.
     * Returns a short note for the Activity Log when something changed.
     */
    private function applyPregnancy(Request $request, Resident $resident): ?string
    {
        if (! $request->has('is_pregnant')) {
            return null;
        }

        $pregnant = $request->boolean('is_pregnant');
        $month = $request->string('pregnancy_expected_month')->value() ?: null;

        Validator::make(['pregnancy_expected_month' => $month], ['pregnancy_expected_month' => ['nullable', 'date_format:Y-m']])
            ->after(fn ($validator) => $this->pregnancy->validate($validator, $pregnant, $month, $resident->sex, $resident->date_of_birth))
            ->validate();

        $wasPregnant = $resident->is_pregnant;
        $wasMonth = $resident->pregnancy_expected_month?->format('Y-m');

        $this->pregnancy->apply($resident, $pregnant, $month, 'self');

        if ($pregnant && (! $wasPregnant || $wasMonth !== $month)) {
            return 'declared, expected '.$resident->pregnancy_expected_month?->format('F Y');
        }

        return ! $pregnant && $wasPregnant ? 'ended, reported by the resident' : null;
    }

    private function residentFor(Request $request): ?Resident
    {
        $residentId = $request->user()->resident_id;

        return $residentId ? Resident::with('sectors:id,code,sector_name')->find($residentId) : null;
    }
}
