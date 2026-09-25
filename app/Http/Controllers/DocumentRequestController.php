<?php

namespace App\Http\Controllers;

use App\Models\DocumentRequest;
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
 * Barangay certificate requests. Residents ask online; barangay staff mark
 * the paper ready for pickup, released, or not approved. The certificate is
 * still printed, signed and handed over at the hall.
 */
class DocumentRequestController extends Controller
{
    // --- Resident side -------------------------------------------------

    public function index(Request $request): Response
    {
        $residentId = $request->user()->resident_id;

        return Inertia::render('documents/index', [
            'hasResidentRecord' => $residentId !== null,
            'requests' => $residentId
                ? DocumentRequest::where('resident_id', $residentId)->latest()->limit(30)->get([
                    'id', 'reference_no', 'type', 'purpose', 'status', 'remarks', 'ready_at', 'released_at', 'created_at',
                ])
                : [],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $resident = $this->ownResident($request);

        $validated = $request->validate([
            'type' => ['required', Rule::in(DocumentRequest::TYPES)],
            'purpose' => ['required', 'string', 'min:3', 'max:150'],
        ]);

        // One open request per certificate: a second one only duplicates work.
        $open = DocumentRequest::where('resident_id', $resident->id)
            ->where('type', $validated['type'])
            ->whereIn('status', [DocumentRequest::STATUS_PENDING, DocumentRequest::STATUS_READY])
            ->exists();

        if ($open) {
            throw ValidationException::withMessages([
                'type' => 'You already have an open request for this certificate. Wait until it is released or cancel it first.',
            ]);
        }

        $documentRequest = DocumentRequest::create([
            'resident_id' => $resident->id,
            'barangay_id' => $resident->barangay_id,
            'requested_by' => $request->user()->id,
            'type' => $validated['type'],
            'purpose' => $validated['purpose'],
            'status' => DocumentRequest::STATUS_PENDING,
        ]);
        $documentRequest->assignReferenceNo();

        AuditLogger::record('create', 'document_requests', $documentRequest->id, null, [
            'type' => $documentRequest->type,
            'reference_no' => $documentRequest->reference_no,
            'source' => 'self_service',
        ]);

        return redirect()->route('documents.index')->with('success', "Request {$documentRequest->reference_no} sent. We will let you know when it is ready.");
    }

    public function cancel(Request $request, DocumentRequest $documentRequest): RedirectResponse
    {
        abort_unless($documentRequest->resident_id === $request->user()->resident_id, 404);
        abort_unless($documentRequest->status === DocumentRequest::STATUS_PENDING, 422, 'Only a pending request can be cancelled.');

        AuditLogger::record('delete', 'document_requests', $documentRequest->id, ['reference_no' => $documentRequest->reference_no]);
        $documentRequest->delete();

        return back()->with('success', 'Request cancelled.');
    }

    // --- Staff side ----------------------------------------------------

    public function manage(Request $request): Response
    {
        $user = $request->user();
        $status = $request->string('status')->value() ?: DocumentRequest::STATUS_PENDING;

        $requests = DocumentRequest::query()
            ->where('barangay_id', $user->barangay_id)
            ->when($status !== 'all', fn ($q) => $q->where('status', $status))
            ->with(['resident:id,resident_id,first_name,middle_name,last_name,suffix,barangay_id', 'handledBy:id,name'])
            ->oldest()
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('document-requests/index', [
            'requests' => $requests,
            'status' => $status,
            'counts' => DocumentRequest::query()
                ->where('barangay_id', $user->barangay_id)
                ->selectRaw('status, count(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status'),
            'typeLabels' => DocumentRequest::TYPE_LABELS,
        ]);
    }

    public function update(Request $request, DocumentRequest $documentRequest): RedirectResponse
    {
        $user = $request->user();
        abort_unless($documentRequest->barangay_id === $user->barangay_id, 403, 'This request belongs to another barangay.');

        $validated = $request->validate([
            'action' => ['required', Rule::in(['ready', 'released', 'rejected'])],
            'remarks' => ['nullable', 'string', 'max:500', Rule::requiredIf($request->input('action') === 'rejected')],
        ]);

        $allowed = [
            DocumentRequest::STATUS_PENDING => ['ready', 'rejected'],
            DocumentRequest::STATUS_READY => ['released', 'rejected'],
        ];
        abort_unless(in_array($validated['action'], $allowed[$documentRequest->status] ?? [], true), 422, 'That step does not apply to this request any more.');

        $old = $documentRequest->status;
        $documentRequest->fill([
            'status' => $validated['action'],
            'remarks' => $validated['remarks'] ?? $documentRequest->remarks,
            'handled_by' => $user->id,
        ]);

        if ($validated['action'] === 'ready') {
            $documentRequest->ready_at = now();
        }

        if ($validated['action'] === 'released') {
            $documentRequest->released_at = now();
        }

        $documentRequest->save();

        AuditLogger::record('update', 'document_requests', $documentRequest->id, ['status' => $old], [
            'status' => $documentRequest->status,
            'reference_no' => $documentRequest->reference_no,
            'type' => $documentRequest->type,
        ]);
        $this->notifyResident($documentRequest);

        return back()->with('success', "{$documentRequest->reference_no} marked {$documentRequest->status}.");
    }

    private function notifyResident(DocumentRequest $documentRequest): void
    {
        $account = $documentRequest->requested_by;
        $label = $documentRequest->typeLabel();

        match ($documentRequest->status) {
            DocumentRequest::STATUS_READY => NotificationService::notify(
                $account,
                $documentRequest->resident_id,
                'document_request',
                "Your {$label} is ready",
                "Request {$documentRequest->reference_no} is ready for pickup at the Barangay Hall. Bring a valid ID.".($documentRequest->remarks ? "\n".$documentRequest->remarks : ''),
                null,
                route('documents.index'),
            ),
            DocumentRequest::STATUS_REJECTED => NotificationService::notify(
                $account,
                $documentRequest->resident_id,
                'document_request',
                "Update on your {$label} request",
                "Request {$documentRequest->reference_no} was not approved. Reason: {$documentRequest->remarks}",
                null,
                route('documents.index'),
            ),
            default => null,
        };
    }

    private function ownResident(Request $request): Resident
    {
        $resident = $request->user()->resident_id ? Resident::find($request->user()->resident_id) : null;
        abort_unless($resident !== null, 404, 'No resident record is linked to your account.');
        abort_unless($resident->is_active, 403, 'Your resident record is inactive. Please visit the Barangay Hall.');

        return $resident;
    }
}
