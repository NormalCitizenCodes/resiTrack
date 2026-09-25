<?php

namespace App\Http\Controllers;

use App\Models\Household;
use App\Models\Resident;
use Illuminate\Http\Request;
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
            ])
            ->all();

        return Inertia::render('my-household', [
            'hasResidentRecord' => true,
            'household' => [
                'household_id' => $household->getAttribute('household_id') ?? $household->household_number,
                'address' => $household->address,
                'zone' => $household->zone?->getAttribute('zone_name'),
                'is_4ps_beneficiary' => $household->is_4ps_beneficiary,
            ],
            'members' => $members,
        ]);
    }
}
