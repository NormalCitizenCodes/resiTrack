<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Models\AccountDeletionRequest;
use App\Models\User;
use App\Models\Barangay;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::createUsersUsing(CreateNewUser::class);

        // Default Fortify auth only checks email/password — deactivated staff
        // (see StaffController) must be rejected here too, not just once logged in.
        Fortify::authenticateUsing(function (Request $request) {
            $identifier = trim((string) $request->input(Fortify::username()));
            $residentIdentifier = strtoupper((string) $identifier);
            $user = User::where(function ($query) use ($identifier, $residentIdentifier) {
                if (str_contains($identifier, '@')) {
                    $query->where('email', $identifier);
                } else {
                    $query->whereHas('resident', fn ($resident) => $resident->where('resident_id', $residentIdentifier));
                }
            })
                ->first();

            if (! $user || ! Hash::check($request->password, $user->password)) {
                return null;
            }

            if (! $user->is_active) {
                $message = 'Account Deactivated. Your account has been deactivated and you can no longer log in.';

                if ($user->role === User::ROLE_RESIDENT && AccountDeletionRequest::query()
                    ->where('user_id', $user->id)
                    ->where('status', AccountDeletionRequest::STATUS_APPROVED)
                    ->exists()) {
                    $message = 'Account Deactivated. Your Resident Account has been deactivated following an approved account deletion request.';
                }

                $message .= ' If you believe this was done by mistake or you need to reactivate your account, please visit your Barangay Hall and approach a Barangay Secretary, Barangay Administrator, or authorized BHW for assistance. Please provide your full name and registered email address so the barangay staff can locate your account and verify your information. What should I do? 1. Visit your Barangay Hall. 2. Approach a Barangay Secretary, Barangay Administrator, or authorized BHW. 3. Tell them that your Resident Account has been deactivated. 4. The barangay staff will verify your identity and account. 5. After verification, the Barangay Admin/Secretary may reactivate your account if appropriate.';

                throw ValidationException::withMessages([
                    Fortify::username() => $message,
                ]);
            }

            return $user;
        });
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            'canResetPassword' => Features::enabled(Features::resetPasswords()),
            'status' => $request->session()->get('status'),
            'error' => $request->session()->get('error'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('auth/reset-password', [
            'email' => $request->email,
            'token' => $request->route('token'),
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('auth/register', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
            'barangays' => Barangay::orderBy('name')->get(['id', 'name']),
        ]));

        Fortify::twoFactorChallengeView(fn () => Inertia::render('auth/two-factor-challenge'));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * Configure rate limiting.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });

        RateLimiter::for('passkeys', function (Request $request) {
            return Limit::perMinute(10)->by(
                ($request->input('credential.id') ?: $request->session()->getId()).'|'.$request->ip(),
            );
        });
    }
}
