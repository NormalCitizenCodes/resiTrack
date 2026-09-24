<?php

namespace Tests\Feature\Auth;

use App\Models\Barangay;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_redirect_sends_the_user_to_google(): void
    {
        Socialite::fake('google');

        $this->get(route('auth.google.redirect'))
            ->assertRedirectContains('socialite.fake/google');
    }

    public function test_a_brand_new_google_account_is_sent_to_the_barangay_completion_step(): void
    {
        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-123',
            'name' => 'New Resident',
            'email' => 'newresident@example.com',
        ]));

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('register.google-complete'));

        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['email' => 'newresident@example.com']);
    }

    public function test_completing_the_barangay_step_creates_a_verified_resident_and_logs_in(): void
    {
        $barangay = Barangay::factory()->create();
        $bhw = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $barangay->id]);

        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-123',
            'name' => 'New Resident',
            'email' => 'newresident@example.com',
        ]));

        $this->get(route('auth.google.callback'));

        $this->post(route('register.google-complete.store'), [
            'barangay_id' => $barangay->id,
        ])->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticated();

        $user = User::where('email', 'newresident@example.com')->firstOrFail();
        $this->assertSame('google-123', $user->google_id);
        $this->assertSame($barangay->id, $user->barangay_id);
        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertNotNull($user->registration_id);
        $this->assertNull($user->resident_id);

        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $bhw->id,
            'related_user_id' => $user->id,
            'title' => '🔔 New Resident Account Created',
        ]);
    }

    public function test_an_existing_account_is_logged_in_directly_by_matching_email(): void
    {
        $barangay = Barangay::factory()->create();
        $existing = User::factory()->create([
            'role' => User::ROLE_RESIDENT,
            'barangay_id' => $barangay->id,
            'email' => 'already@example.com',
        ]);

        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-999',
            'name' => 'Already Here',
            'email' => 'already@example.com',
        ]));

        $this->get(route('auth.google.callback'))
            ->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticatedAs($existing);
        $this->assertSame('google-999', $existing->fresh()->google_id);
    }

    public function test_a_deactivated_account_is_rejected_via_google_the_same_as_password_login(): void
    {
        $barangay = Barangay::factory()->create();
        User::factory()->create([
            'role' => User::ROLE_RESIDENT,
            'barangay_id' => $barangay->id,
            'email' => 'deactivated@example.com',
            'is_active' => false,
        ]);

        Socialite::fake('google', SocialiteUser::fake([
            'id' => 'google-777',
            'name' => 'Deactivated',
            'email' => 'deactivated@example.com',
        ]));

        $this->get(route('auth.google.callback'))
            ->assertSessionHasErrors('email');

        $this->assertGuest();
    }
}
