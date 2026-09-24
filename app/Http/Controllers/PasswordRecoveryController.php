<?php

namespace App\Http\Controllers;

use App\Models\AppNotification;
use App\Models\PasswordRecoveryRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PasswordRecoveryController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $recoveryRequests = PasswordRecoveryRequest::query()
            ->with(['user:id,name,email', 'resident:id,first_name,last_name', 'barangay:id,name'])
            ->where('barangay_id', $user->barangay_id)
            ->latest()
            ->get();

        return Inertia::render('account-recovery/index', [
            'recoveryRequests' => $recoveryRequests,
            'highlight' => $request->integer('highlight') ?: null,
            // Set for one request right after approve() redirects here, so the
            // password form can expand inline under that row instead of
            // navigating to a separate page.
            'recoveryToken' => $request->session()->get('recoveryToken'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate(['email' => ['required', 'string', 'email']]);

        $email = $request->string('email')->toString();
        $resident = User::query()
            ->where('email', $email)
            ->where('role', User::ROLE_RESIDENT)
            ->first();

        if (! $resident) {
            throw ValidationException::withMessages([
                'email' => 'No account is registered with this email address. Please visit the Barangay Office or ask a BHW to register for an account.',
            ]);
        }

        $recoveryRequest = PasswordRecoveryRequest::create([
            'user_id' => $resident->id,
            'resident_id' => $resident->resident_id,
            'barangay_id' => $resident->barangay_id,
            'status' => PasswordRecoveryRequest::STATUS_PENDING,
        ]);

        User::query()
            ->where('role', User::ROLE_BHW)
            ->where('barangay_id', $resident->barangay_id)
            ->each(fn (User $bhw) => AppNotification::create([
                'user_id' => $bhw->id,
                'resident_id' => $resident->resident_id,
                'type' => 'password_recovery',
                'action_url' => route('account-recovery.index', ['highlight' => $recoveryRequest->id]),
                'title' => 'New account recovery request',
                'message' => "{$resident->name} needs password recovery assistance.",
                'is_read' => false,
            ]));

        return back()->with('status', 'Account Found. Please visit the Barangay Office and ask a Barangay Health Worker (BHW) for account recovery assistance. The BHW will verify your identity and approve your password recovery request.');
    }

    public function approve(Request $request, PasswordRecoveryRequest $recoveryRequest): RedirectResponse
    {
        $this->ensureOwnBarangay($request, $recoveryRequest);

        if ($recoveryRequest->status !== PasswordRecoveryRequest::STATUS_PENDING) {
            return back()->with('error', 'This recovery request has already been reviewed.');
        }

        $token = Str::random(64);
        $recoveryRequest->update([
            'status' => PasswordRecoveryRequest::STATUS_APPROVED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'recovery_token_hash' => hash('sha256', $token),
            'token_expires_at' => now()->addMinutes(15),
        ]);

        return redirect()
            ->route('account-recovery.index', ['highlight' => $recoveryRequest->id])
            ->with('recoveryToken', $token);
    }

    public function reject(Request $request, PasswordRecoveryRequest $recoveryRequest): RedirectResponse
    {
        $this->ensureOwnBarangay($request, $recoveryRequest);

        if ($recoveryRequest->status !== PasswordRecoveryRequest::STATUS_PENDING) {
            return back()->with('error', 'This recovery request has already been reviewed.');
        }

        $recoveryRequest->update([
            'status' => PasswordRecoveryRequest::STATUS_REJECTED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return back()->with('success', 'Recovery request rejected. The resident cannot change their password.');
    }

    public function password(string $token): Response
    {
        $recoveryRequest = $this->requestForToken($token);

        return Inertia::render('account-recovery/password', [
            'token' => $token,
            'email' => $recoveryRequest->user->email,
        ]);
    }

    public function updatePassword(Request $request, string $token): RedirectResponse
    {
        $recoveryRequest = $this->requestForToken($token);

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $recoveryRequest->user->update(['password' => Hash::make($validated['password'])]);
        $recoveryRequest->update([
            'recovery_token_hash' => null,
            'token_expires_at' => null,
        ]);

        return redirect()->route('login')->with('status', 'Password Changed Successfully. Your password has been successfully changed. You can now log in using your new password.');
    }

    private function requestForToken(string $token): PasswordRecoveryRequest
    {
        $recoveryRequest = PasswordRecoveryRequest::query()
            ->with('user:id,email')
            ->where('status', PasswordRecoveryRequest::STATUS_APPROVED)
            ->where('token_expires_at', '>', now())
            ->get()
            ->first(fn (PasswordRecoveryRequest $request): bool => hash_equals($request->recovery_token_hash ?? '', hash('sha256', $token)));

        if (! $recoveryRequest) {
            abort(404, 'This recovery request is invalid or has expired.');
        }

        return $recoveryRequest;
    }

    private function ensureOwnBarangay(Request $request, PasswordRecoveryRequest $recoveryRequest): void
    {
        if ($request->user()->barangay_id !== $recoveryRequest->barangay_id) {
            abort(403, 'This recovery request belongs to another barangay.');
        }
    }
}
