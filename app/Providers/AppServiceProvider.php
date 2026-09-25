<?php

namespace App\Providers;

use App\Services\AuditLogger;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
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
        $this->configureDefaults();
        $this->configureVerificationEmail();
        $this->recordSignIns();
    }

    /**
     * Every sign-in goes into the audit trail, so the Activity Log shows when
     * each staff member (and resident) was last active. The user is passed in
     * explicitly: the guard fires Login before it sets the signed-in user.
     */
    protected function recordSignIns(): void
    {
        Event::listen(Login::class, function (Login $event): void {
            $id = (int) $event->user->getAuthIdentifier();

            AuditLogger::record('login', 'users', $id, null, null, $id);
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }

    /**
     * Brand the verification email instead of using Fortify's generic default copy.
     */
    protected function configureVerificationEmail(): void
    {
        VerifyEmail::toMailUsing(function ($notifiable, string $url) {
            return (new MailMessage)
                ->subject('Verify your resiTrack account')
                ->greeting("Hi {$notifiable->name},")
                ->line('Thanks for signing up for resiTrack. Please verify your email address to continue.')
                ->action('Verify Email Address', $url)
                ->line('If you did not create this account, no further action is required.');
        });
    }
}
