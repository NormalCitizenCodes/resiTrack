<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Fortify\Features;
use Tests\TestCase;

class VerificationNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->skipUnlessFortifyHas(Features::emailVerification());
    }

    public function test_sends_verification_notification(): void
    {
        Notification::fake();

        // Only a self-registered resident (registration_id set) is actually
        // gated by verification - see App\Models\User::hasVerifiedEmail().
        $user = User::factory()->unverified()->create([
            'role' => User::ROLE_RESIDENT,
            'registration_id' => 'REG-000001',
        ]);

        // This falls back to a plain redirect('back') with a flash status (see
        // Fortify's EmailVerificationNotificationController) - the redirect target
        // itself depends on the referer header, so the flash status is what
        // actually confirms the resend happened, not the redirect URL.
        $this->actingAs($user)
            ->post(route('verification.send'))
            ->assertSessionHas('status', 'verification-link-sent');

        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_does_not_send_verification_notification_if_email_is_verified(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('verification.send'))
            ->assertRedirect(route('dashboard', absolute: false));

        Notification::assertNothingSent();
    }
}
