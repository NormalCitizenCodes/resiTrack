<?php

namespace Tests\Feature\Auth;

use App\Models\AppNotification;
use App\Models\Barangay;
use App\Models\PasswordRecoveryRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Fortify\Features;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->skipUnlessFortifyHas(Features::resetPasswords());
    }

    public function test_reset_password_link_screen_can_be_rendered()
    {
        $response = $this->get(route('password.request'));

        $response->assertOk();
    }

    public function test_resident_email_is_directed_to_barangay_recovery_assistance(): void
    {
        $resident = User::factory()->create(['role' => User::ROLE_RESIDENT]);

        $this->from(route('password.request'))
            ->post(route('password.email'), ['email' => $resident->email])
            ->assertRedirect(route('password.request'))
            ->assertSessionHas('status', fn (string $status): bool => str_contains($status, 'Barangay Office') && str_contains($status, 'BHW'));
    }

    public function test_unknown_email_is_directed_to_barangay_for_registration(): void
    {
        $response = $this->from(route('password.request'))
            ->post(route('password.email'), ['email' => 'not-registered@example.com']);

        $response->assertRedirect(route('password.request'))
            ->assertSessionHasErrors('email', 'No account is registered with this email address. Please visit the Barangay Office or ask a BHW to register for an account.');
    }

    public function test_bhw_can_approve_recovery_and_resident_can_set_a_new_password(): void
    {
        $barangay = Barangay::factory()->create();
        $bhw = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $barangay->id]);
        $resident = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $barangay->id]);

        $this->post(route('password.email'), ['email' => $resident->email]);

        $recoveryRequest = PasswordRecoveryRequest::firstOrFail();
        expect($recoveryRequest->status)->toBe(PasswordRecoveryRequest::STATUS_PENDING);
        expect(AppNotification::where('user_id', $bhw->id)->where('type', 'password_recovery')->exists())->toBeTrue();

        $response = $this->actingAs($bhw)->post(route('account-recovery.approve', $recoveryRequest));
        $response->assertRedirect();

        $recoveryRequest->refresh();
        expect($recoveryRequest->status)->toBe(PasswordRecoveryRequest::STATUS_APPROVED);

        $token = basename(parse_url($response->headers->get('Location'), PHP_URL_PATH));

        $this->actingAs($bhw)
            ->post(route('account-recovery.password.update', ['token' => $token]), [
                'password' => 'new-password-123',
                'password_confirmation' => 'new-password-123',
            ])
            ->assertRedirect(route('login'));

        expect(Hash::check('new-password-123', $resident->refresh()->password))->toBeTrue();
        expect($recoveryRequest->refresh()->recovery_token_hash)->toBeNull();
    }

    public function test_password_cannot_be_reset_with_invalid_token(): void
    {
        $user = User::factory()->create();

        $response = $this->post(route('password.update'), [
            'token' => 'invalid-token',
            'email' => $user->email,
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
        ]);

        $response->assertSessionHasErrors('email');
    }
}
