<?php

namespace App\Services;

use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * A shared per-IP rate limit for the app's guest-accessible forms
 * (registration, password recovery, account reactivation). Each of these
 * creates a database row and fans out notifications (registration also sends
 * a real email), so with no limit a script can flood BHWs' notification
 * feeds and burn the mail provider's quota, without ever needing to log in.
 */
class GuestFormThrottle
{
    public static function assertNotExceeded(string $formName, string $field, int $maxAttempts = 5, int $decayMinutes = 60): void
    {
        $key = "{$formName}:".request()->ip();

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            throw ValidationException::withMessages([
                $field => 'Too many attempts. Please try again later, or visit your Barangay Hall for assistance.',
            ]);
        }

        RateLimiter::hit($key, $decayMinutes * 60);
    }
}
