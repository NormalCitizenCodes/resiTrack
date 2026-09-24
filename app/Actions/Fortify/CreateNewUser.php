<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use App\Services\GuestFormThrottle;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;
use Throwable;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        // Fortify's own /register route has no rate limiting at all by default
        // (unlike login/2FA/passkeys, which it throttles out of the box). Each
        // registration fans out real notifications to every BHW in the
        // barangay and a real email, so an unthrottled script here is a
        // genuine spam/quota-burn vector, not just a nuisance.
        GuestFormThrottle::assertNotExceeded('register', 'email');

        Validator::make($input, [
            ...$this->profileRules(),
            'barangay_id' => ['required', 'integer', 'exists:barangays,id'],
            'password' => $this->passwordRules(),
        ], [
            'email.unique' => 'An account with this email already exists. Please log in with your email and password.',
        ])->validate();

        $user = User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => $input['password'],
            'barangay_id' => $input['barangay_id'],
        ]);

        $user->update([
            'registration_id' => 'REG-'.str_pad((string) $user->id, 6, '0', STR_PAD_LEFT),
        ]);

        NotificationService::notifyNewResidentRegistration($user);

        // A mail transport failure (e.g. a sandboxed provider rejecting the
        // recipient) must not take down registration itself - the account
        // already exists at this point. The resident can still use the
        // "resend verification email" button once delivery is actually working.
        try {
            $user->sendEmailVerificationNotification();
        } catch (Throwable $e) {
            Log::error('Failed to send the registration verification email.', [
                'user_id' => $user->id,
                'exception' => $e->getMessage(),
            ]);
        }

        return $user;
    }
}
