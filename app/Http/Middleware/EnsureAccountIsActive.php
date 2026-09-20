<?php

namespace App\Http\Middleware;

use Closure;
use App\Models\AccountDeletionRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Deactivating a staff account (see StaffController) must actually end their
 * access, not just block new logins - this catches an already-open session
 * the moment their next request comes in.
 */
class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_active) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            $message = 'Account Deactivated. Your account has been deactivated and you can no longer log in.';

            if ($user->role === User::ROLE_RESIDENT && AccountDeletionRequest::query()
                ->where('user_id', $user->id)
                ->where('status', AccountDeletionRequest::STATUS_APPROVED)
                ->exists()) {
                $message = 'Account Deactivated. Your Resident Account has been deactivated following an approved account deletion request.';
            }

            $message .= ' If you believe this was done by mistake or you need to reactivate your account, please visit your Barangay Hall and approach a Barangay Secretary, Barangay Administrator, or authorized BHW for assistance. Please provide your full name and registered email address so the barangay staff can locate your account and verify your information.';

            return redirect()->route('login')->with('error', $message);
        }

        return $next($request);
    }
}
