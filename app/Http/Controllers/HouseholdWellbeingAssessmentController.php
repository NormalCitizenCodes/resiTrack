<?php

namespace App\Http\Controllers;

use App\Models\Household;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class HouseholdWellbeingAssessmentController extends Controller
{
    /**
     * Record a wellbeing-level assessment for a household. Assessments are an
     * append-only history (never edited/deleted), consistent with the audit
     * trail approach used elsewhere.
     */
    public function store(Request $request, Household $household): RedirectResponse
    {
        $user = $request->user();

        if (! $user->isSuperAdmin() && $household->barangay_id !== $user->barangay_id) {
            abort(403, 'This household belongs to another barangay.');
        }

        $validated = $request->validate([
            'level_id' => ['required', 'integer', 'exists:wellbeing_levels,id'],
            'assessment_date' => ['nullable', 'date', 'before_or_equal:today'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);

        $assessment = $household->wellbeingAssessments()->create([
            'level_id' => $validated['level_id'],
            'assessed_by' => $user->id,
            'assessment_date' => $validated['assessment_date'] ?? Carbon::now()->toDateString(),
            'remarks' => $validated['remarks'] ?? null,
        ]);

        AuditLogger::record('create', 'household_wellbeing_assessments', $assessment->id, null, [
            'household_id' => $household->id,
            'level_id' => $assessment->level_id,
        ]);

        return back()->with('success', 'Wellbeing assessment recorded.');
    }
}
