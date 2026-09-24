<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
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

        // Fortify doesn't wire this listener itself (see Fortify's own docs), and this
        // app has no EventServiceProvider - without it, User::sendEmailVerificationNotification()
        // never fires after registration.
        Event::listen(Registered::class, SendEmailVerificationNotification::class);
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
