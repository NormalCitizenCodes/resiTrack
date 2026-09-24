<?php

namespace App\Http\Controllers;

use App\Models\Barangay;
use App\Models\User;
use App\Services\AccountStatusGuard;
use App\Services\NotificationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirectResponse;

class GoogleAuthController extends Controller
{
    public function redirect(): SymfonyRedirectResponse
    {
        return Socialite::driver('google')->redirect();
    }

    /**
     * An existing account (matched by google_id, or by email - Google has
     * already verified that email, so linking on it here is safe) logs straight
     * in. A brand new resident is sent to one extra step, since Google can't
     * supply the barangay_id registration otherwise requires.
     *
     * Deliberately not ->stateless(): this route runs in the normal 'web'
     * session middleware, so Socialite's default state-parameter CSRF check
     * on the OAuth callback applies, same as everywhere else in the app.
     */
    public function callback(Request $request): RedirectResponse
    {
        $googleUser = Socialite::driver('google')->user();

        $user = User::where('google_id', $googleUser->getId())->first()
            ?? User::where('email', $googleUser->getEmail())->first();

        if ($user) {
            if ($user->google_id === null) {
                $user->update(['google_id' => $googleUser->getId()]);
            }

            AccountStatusGuard::assertActive($user, 'email');

            Auth::login($user);
            $request->session()->regenerate();

            return redirect()->intended(route('dashboard', absolute: false));
        }

        $request->session()->put('google_signup', [
            'id' => $googleUser->getId(),
            'name' => $googleUser->getName() ?: $googleUser->getNickname() ?: $googleUser->getEmail(),
            'email' => $googleUser->getEmail(),
        ]);

        return redirect()->route('register.google-complete');
    }

    public function create(Request $request): Response|RedirectResponse
    {
        $profile = $request->session()->get('google_signup');

        if (! $profile) {
            return redirect()->route('register');
        }

        return Inertia::render('auth/register-google-complete', [
            'name' => $profile['name'],
            'email' => $profile['email'],
            'barangays' => Barangay::orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function complete(Request $request): RedirectResponse
    {
        $profile = $request->session()->get('google_signup');

        abort_unless($profile, 419);

        $validated = $request->validate([
            'barangay_id' => ['required', 'integer', 'exists:barangays,id'],
        ]);

        if (User::where('email', $profile['email'])->exists()) {
            throw ValidationException::withMessages([
                'barangay_id' => 'An account with this email already exists. Please log in instead.',
            ]);
        }

        $user = User::create([
            'name' => $profile['name'],
            'email' => $profile['email'],
            'google_id' => $profile['id'],
            'barangay_id' => $validated['barangay_id'],
            // Never used to log in (Google is the only path in), but the
            // password column isn't nullable and doesn't need to be for this.
            'password' => Hash::make(Str::random(40)),
        ]);

        // email_verified_at is deliberately not mass-fillable (it shouldn't be settable
        // through any ordinary request payload elsewhere in the app) - Google has
        // already verified this address, so it's set directly here instead.
        $user->forceFill(['email_verified_at' => now()])->save();

        $user->update([
            'registration_id' => 'REG-'.str_pad((string) $user->id, 6, '0', STR_PAD_LEFT),
        ]);

        NotificationService::notifyNewResidentRegistration($user);

        $request->session()->forget('google_signup');

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('dashboard');
    }
}
