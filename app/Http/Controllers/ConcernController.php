<?php

namespace App\Http\Controllers;

use App\Models\Concern;
use App\Models\Resident;
use App\Services\AuditLogger;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Residents report community problems or mistakes in their own record;
 * barangay staff respond and track them to resolution. Every status change
 * or reply reaches the resident as a notification.
 */
class ConcernController extends Controller
{
    /** A resident may file this many in any 24 hours; enough for real use, not for flooding. */
    private const DAILY_LIMIT = 5;

    // --- Resident side -------------------------------------------------

    public function index(Request $request): Response
    {
        $residentId = $request->user()->resident_id;
        $category = $request->string('category')->value();

        return Inertia::render('concerns/index', [
            'hasResidentRecord' => $residentId !== null,
            'concerns' => $residentId
                ? Concern::where('resident_id', $residentId)->latest()->limit(30)->get([
                    'id', 'reference_no', 'category', 'description', 'location', 'status', 'response', 'resolved_at', 'created_at',
                ])
                : [],
            'initialCategory' => in_array($category, Concern::CATEGORIES, true) ? $category : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $resident = $request->user()->resident_id ? Resident::find($request->user()->resident_id) : null;
        abort_unless($resident !== null, 404, 'No resident record is linked to your account.');

        $validated = $request->validate([
            'category' => ['required', Rule::in(Concern::CATEGORIES)],
            'description' => ['required', 'string', 'min:10', 'max:1000'],
            'location' => ['nullable', 'string', 'max:180'],
        ]);

        $recent = Concern::where('resident_id', $resident->id)->where('created_at', '>=', now()->subDay())->count();

        if ($recent >= self::DAILY_LIMIT) {
            throw ValidationException::withMessages([
                'description' => 'You have sent several reports today. Please wait a day, or visit the Barangay Hall if it is urgent.',
            ]);
        }

        $concern = Concern::create($validated + [
            'resident_id' => $resident->id,
            'barangay_id' => $resident->barangay_id,
            'reported_by' => $request->user()->id,
            'status' => 'open',
        ]);
        $concern->assignReferenceNo();

        AuditLogger::record('create', 'concerns', $concern->id, null, ['category' => $concern->category, 'reference_no' => $concern->reference_no]);

        return redirect()->route('concerns.index')->with('success', "Report {$concern->reference_no} sent to your barangay.");
    }

    // --- Staff side ----------------------------------------------------

    public function manage(Request $request): Response
    {
        $user = $request->user();
        $status = $request->string('status')->value() ?: 'active';

        $concerns = Concern::query()
            ->where('barangay_id', $user->barangay_id)
            ->when($status === 'active', fn ($q) => $q->whereIn('status', ['open', 'in_progress']))
            ->when(in_array($status, Concern::STATUSES, true), fn ($q) => $q->where('status', $status))
            ->with(['resident:id,resident_id,first_name,middle_name,last_name,suffix,contact_number', 'handledBy:id,name'])
            ->oldest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('concerns/manage', [
            'concerns' => $concerns,
            'status' => $status,
            'categoryLabels' => Concern::CATEGORY_LABELS,
        ]);
    }

    public function update(Request $request, Concern $concern): RedirectResponse
    {
        $user = $request->user();
        abort_unless($concern->barangay_id === $user->barangay_id, 403, 'This report belongs to another barangay.');

        $validated = $request->validate([
            'status' => ['required', Rule::in(Concern::STATUSES)],
            'response' => ['nullable', 'string', 'max:1000', Rule::requiredIf(in_array($request->input('status'), ['resolved', 'closed'], true))],
        ]);

        $old = $concern->only(['status', 'response']);
        $concern->fill([
            'status' => $validated['status'],
            'response' => $validated['response'] ?? $concern->response,
            'handled_by' => $user->id,
            'resolved_at' => in_array($validated['status'], ['resolved', 'closed'], true) ? ($concern->resolved_at ?? now()) : null,
        ])->save();

        AuditLogger::record('update', 'concerns', $concern->id, $old, $concern->only(['status', 'response', 'reference_no', 'category']));

        if ($old['status'] !== $concern->status || $old['response'] !== $concern->response) {
            $statusText = match ($concern->status) {
                'in_progress' => 'is being worked on',
                'resolved' => 'has been resolved',
                'closed' => 'has been closed',
                default => 'was updated',
            };

            NotificationService::notify(
                $concern->reported_by,
                $concern->resident_id,
                'concern',
                "Your report {$concern->reference_no} {$statusText}",
                $concern->response,
                null,
                route('concerns.index'),
            );
        }

        return back()->with('success', "{$concern->reference_no} updated.");
    }
}
