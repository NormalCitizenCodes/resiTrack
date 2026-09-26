<?php

namespace App\Http\Controllers;

use App\Models\Household;
use App\Models\Resident;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * A resident's read-only view of their own household as the barangay has it
 * on record. Shows members' names, ages and sex only: sectors, income and
 * other profile details stay private to each member. Mistakes are reported
 * as a concern (category record_correction), not edited here.
 */
class MyHouseholdController extends Controller
{
    public function show(Request $request): Response
    {
        $resident = $request->user()->resident_id ? Resident::find($request->user()->resident_id) : null;
        $household = $resident?->household_id
            ? Household::with('zone:id,zone_name')->find($resident->household_id)
            : null;

        if ($resident === null || $household === null) {
            return Inertia::render('my-household', [
                'hasResidentRecord' => $resident !== null,
                'household' => null,
                'members' => [],
            ]);
        }

        $members = Resident::query()
            ->where('household_id', $household->id)
            ->where('is_active', true)
            ->orderBy('date_of_birth')
            ->get(['id', 'first_name', 'middle_name', 'last_name', 'suffix', 'date_of_birth', 'sex'])
            ->map(fn (Resident $member) => [
                'id' => $member->id,
                'full_name' => $member->full_name,
                'age' => $member->age,
                'sex' => $member->sex,
                'is_you' => $member->id === $resident->id,
                'is_leader' => $member->id === $household->leader_resident_id,
            ])
            ->all();

        $leader = collect($members)->firstWhere('is_leader', true);
        $hasAdult = collect($members)->contains(fn (array $member) => $member['age'] !== null && $member['age'] >= Household::LEADER_MIN_AGE);
        $viewerIsAdult = $resident->is_active && $resident->age !== null && $resident->age >= Household::LEADER_MIN_AGE;

        return Inertia::render('my-household', [
            'hasResidentRecord' => true,
            'household' => [
                'household_id' => $household->getAttribute('household_id') ?? $household->household_number,
                'address' => $household->address,
                'zone' => $household->zone?->getAttribute('zone_name'),
                'is_4ps_beneficiary' => $household->is_4ps_beneficiary,
                'leader' => $leader ? ['full_name' => $leader['full_name'], 'is_you' => $leader['is_you']] : null,
                // Only worth nagging about when someone in the household could actually be the leader.
                'needs_leader' => $leader === null && $hasAdult,
                // Anyone in the household who is not under 18 may choose (or change) the leader.
                'can_choose_leader' => $viewerIsAdult,
            ],
            'members' => $members,
        ]);
    }

    /**
     * An adult member (18 or older) chooses who represents their own household. The choice is the
     * family's, so no staff step is needed; the Activity Log records who made it.
     */
    public function setLeader(Request $request): RedirectResponse
    {
        $viewer = $request->user()->resident_id ? Resident::find($request->user()->resident_id) : null;
        $household = $viewer?->household_id ? Household::find($viewer->household_id) : null;

        abort_unless(
            $viewer !== null && $household !== null && $viewer->is_active && $viewer->age !== null && $viewer->age >= Household::LEADER_MIN_AGE,
            403,
            'Only an adult member of the household can choose its leader.',
        );

        $validated = $request->validate(['resident_id' => ['required', 'integer']]);
        $leader = Resident::query()->where('household_id', $household->id)->find((int) $validated['resident_id']);

        if ($leader === null || ! Household::canLead($leader, $household)) {
            throw ValidationException::withMessages(['resident_id' => 'Pick an adult who lives in your household.']);
        }

        $household->update(['leader_resident_id' => $leader->id]);

        AuditLogger::record('update', 'households', $household->id, null, [
            'household_number' => $household->household_number,
            'changed' => 'household leader set to '.$leader->full_name.', chosen by '.$viewer->full_name.' (a household member)',
        ]);

        return back()->with('success', "{$leader->full_name} is now your household leader.");
    }
}
