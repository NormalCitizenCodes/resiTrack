<?php

namespace App\Http\Controllers;

use App\Models\Household;
use App\Models\Resident;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Putting an already registered resident into a household, moving one from another, or taking
 * one out. Staff of the household's own barangay only (the route keeps the super admin out).
 */
class HouseholdMemberController extends Controller
{
    /**
     * Type-ahead for "Add an existing resident". By default only people with no household yet;
     * `include_assigned` also lists those living in another household, so they can be moved.
     */
    public function search(Request $request, Household $household): JsonResponse
    {
        $this->authorizeWrite($request, $household);

        $term = $request->string('q')->trim()->value();

        $residents = Resident::query()
            ->with(['household.leader:id,last_name', 'household.residents:id,household_id,last_name'])
            ->where('barangay_id', $household->barangay_id)
            ->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('household_id')->orWhere('household_id', '!=', $household->id))
            ->when(! $request->boolean('include_assigned'), fn ($q) => $q->whereNull('household_id'))
            ->when($term !== '', function ($q) use ($term) {
                $q->where(function ($inner) use ($term) {
                    $inner->where('first_name', 'like', "%{$term}%")
                        ->orWhere('last_name', 'like', "%{$term}%")
                        ->orWhere('resident_id', 'like', '%'.(Resident::normalizeOfficialId($term) ?: $term).'%');
                });
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->limit(15)
            ->get();

        return response()->json($residents->map(fn (Resident $resident) => [
            'id' => $resident->id,
            'full_name' => $resident->full_name,
            'resident_id' => $resident->resident_id,
            'age' => $resident->age,
            'sex' => $resident->sex,
            'address' => $resident->address,
            'household' => $resident->household ? $resident->household->pickerOption() : null,
        ])->values());
    }

    public function store(Request $request, Household $household): RedirectResponse
    {
        $this->authorizeWrite($request, $household);

        $validated = $request->validate([
            'resident_id' => ['required', 'integer'],
            'move' => ['sometimes', 'boolean'],
        ]);

        $resident = Resident::query()
            ->where('barangay_id', $household->barangay_id)
            ->find((int) $validated['resident_id']);

        if ($resident === null) {
            throw ValidationException::withMessages(['resident_id' => 'Pick a resident of this barangay.']);
        }

        if (! $resident->is_active) {
            throw ValidationException::withMessages(['resident_id' => "{$resident->full_name} is deactivated. Reactivate the record first."]);
        }

        if ($resident->household_id === $household->id) {
            throw ValidationException::withMessages(['resident_id' => "{$resident->full_name} is already in this household."]);
        }

        $previous = $resident->household_id !== null ? Household::query()->find($resident->household_id) : null;

        if ($previous !== null && ! $request->boolean('move')) {
            throw ValidationException::withMessages(['resident_id' => "{$resident->full_name} already lives in another household. Confirm the move to continue."]);
        }

        // The Resident `updated` hook takes leadership away from someone who leaves the household they led.
        $resident->update(['household_id' => $household->id]);

        AuditLogger::record('update', 'households', $household->id, null, [
            'household_number' => $household->household_number,
            'changed' => $previous
                ? "{$resident->full_name} moved in from household ".($previous->household_number ?? "#{$previous->id}")
                : "{$resident->full_name} added as a member",
        ]);

        if ($previous !== null) {
            AuditLogger::record('update', 'households', $previous->id, null, [
                'household_number' => $previous->household_number,
                'changed' => "{$resident->full_name} moved to household ".($household->household_number ?? "#{$household->id}"),
            ]);
        }

        return back()->with('success', "{$resident->full_name} is now a member of this household.");
    }

    public function destroy(Request $request, Household $household, Resident $resident): RedirectResponse
    {
        $this->authorizeWrite($request, $household);

        abort_unless($resident->household_id === $household->id, 404);

        $resident->update(['household_id' => null]);

        AuditLogger::record('update', 'households', $household->id, null, [
            'household_number' => $household->household_number,
            'changed' => "{$resident->full_name} removed from the household",
        ]);

        return back()->with('success', "{$resident->full_name} was taken out of this household.");
    }

    private function authorizeWrite(Request $request, Household $household): void
    {
        abort_unless($household->barangay_id === $request->user()->barangay_id, 403, 'This household belongs to another barangay.');
    }
}
