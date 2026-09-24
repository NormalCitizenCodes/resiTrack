<?php

namespace Tests\Feature\Auth;

use App\Models\Barangay;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Laravel\Fortify\Features;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->skipUnlessFortifyHas(Features::registration());
    }

    public function test_registration_screen_can_be_rendered()
    {
        $response = $this->get(route('register'));

        $response->assertOk();
    }

    public function test_new_users_can_register()
    {
        $barangay = Barangay::factory()->create();
        $otherBarangay = Barangay::factory()->create();
        $bhw = User::factory()->create([
            'role' => User::ROLE_BHW,
            'barangay_id' => $barangay->id,
        ]);
        $otherBhw = User::factory()->create([
            'role' => User::ROLE_BHW,
            'barangay_id' => $otherBarangay->id,
        ]);

        $response = $this->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'barangay_id' => $barangay->id,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));

        $user = User::where('email', 'test@example.com')->firstOrFail();
        $this->assertNotNull($user->registration_id);
        $this->assertNull($user->resident_id);
        $this->assertDatabaseMissing('residents', ['email' => 'test@example.com']);
        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $bhw->id,
            'resident_id' => null,
            'related_user_id' => $user->id,
            'type' => 'system',
            'title' => '🔔 New Resident Account Created',
        ]);
        $this->assertDatabaseMissing('app_notifications', ['user_id' => $otherBhw->id]);
    }

    public function test_registration_rejects_a_duplicate_email_with_a_login_prompt(): void
    {
        $barangay = Barangay::factory()->create();
        User::factory()->create([
            'email' => 'taken@example.com',
            'role' => User::ROLE_RESIDENT,
            'barangay_id' => $barangay->id,
        ]);

        $this->post(route('register.store'), [
            'name' => 'Someone Else',
            'email' => 'taken@example.com',
            'barangay_id' => $barangay->id,
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertSessionHasErrors([
            'email' => 'An account with this email already exists. Please log in with your email and password.',
        ]);
    }

    public function test_a_newly_registered_resident_must_verify_email_before_reaching_the_dashboard(): void
    {
        $barangay = Barangay::factory()->create();

        $this->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'barangay_id' => $barangay->id,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $user = User::where('email', 'test@example.com')->firstOrFail();
        $this->assertFalse($user->hasVerifiedEmail());

        $this->get(route('dashboard'))->assertRedirect(route('verification.notice'));
    }

    public function test_registering_queues_a_verification_email(): void
    {
        Notification::fake();

        $barangay = Barangay::factory()->create();

        $this->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'barangay_id' => $barangay->id,
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $user = User::where('email', 'test@example.com')->firstOrFail();
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_clicking_the_verification_link_unlocks_the_dashboard(): void
    {
        $barangay = Barangay::factory()->create();
        $user = User::factory()->create([
            'role' => User::ROLE_RESIDENT,
            'barangay_id' => $barangay->id,
            'registration_id' => 'REG-000123',
            'email_verified_at' => null,
        ]);

        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)],
        );

        $this->actingAs($user)->get($url)->assertRedirect();

        $this->assertTrue($user->fresh()->hasVerifiedEmail());
        $this->actingAs($user)->get(route('dashboard'))->assertOk();
    }

    public function test_staff_and_agency_accounts_are_not_gated_by_email_verification(): void
    {
        $barangay = Barangay::factory()->create();
        $bhw = User::factory()->create([
            'role' => User::ROLE_BHW,
            'barangay_id' => $barangay->id,
            'email_verified_at' => null,
        ]);

        $this->assertTrue($bhw->hasVerifiedEmail());
        $this->actingAs($bhw)->get(route('dashboard'))->assertOk();
    }

    public function test_registration_is_rate_limited_per_ip(): void
    {
        $barangay = Barangay::factory()->create();

        for ($i = 0; $i < 5; $i++) {
            $this->post(route('register.store'), [
                'name' => "Test User {$i}",
                'email' => "ratelimit{$i}@example.com",
                'barangay_id' => $barangay->id,
                'password' => 'password',
                'password_confirmation' => 'password',
            ])->assertSessionDoesntHaveErrors('email');

            // register.store sits behind guest middleware, and registering
            // auto-logs the new account in - without this, every subsequent
            // attempt in this loop would just get redirected away before ever
            // reaching the throttle check.
            $this->post(route('logout'));
        }

        $this->post(route('register.store'), [
            'name' => 'One Too Many',
            'email' => 'ratelimit-blocked@example.com',
            'barangay_id' => $barangay->id,
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertSessionHasErrors('email');

        $this->assertDatabaseMissing('users', ['email' => 'ratelimit-blocked@example.com']);
    }
}
