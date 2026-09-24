<?php

namespace App\Services;

use App\Models\AccountDeletionRequest;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Rejects a deactivated account the same way regardless of login method
 * (password via Fortify, or Google sign-in).
 */
class AccountStatusGuard
{
    public static function assertActive(User $user, string $field): void
    {
        if ($user->is_active) {
            return;
        }

        $message = 'Account Deactivated. Your account has been deactivated and you can no longer log in.';

        if ($user->role === User::ROLE_RESIDENT && AccountDeletionRequest::query()
            ->where('user_id', $user->id)
            ->where('status', AccountDeletionRequest::STATUS_APPROVED)
            ->exists()) {
            $message = 'Account Deactivated. Your Resident Account has been deactivated following an approved account deletion request.';
        }

        $message .= ' If you believe this was done by mistake or you need to reactivate your account, please visit your Barangay Hall and approach a Barangay Secretary, Barangay Administrator, or authorized BHW for assistance. Please provide your full name and registered email address so the barangay staff can locate your account and verify your information. What should I do? 1. Visit your Barangay Hall. 2. Approach a Barangay Secretary, Barangay Administrator, or authorized BHW. 3. Tell them that your Resident Account has been deactivated. 4. The barangay staff will verify your identity and account. 5. After verification, the Barangay Admin/Secretary may reactivate your account if appropriate.';

        throw ValidationException::withMessages([
            $field => $message,
        ]);
    }
}
