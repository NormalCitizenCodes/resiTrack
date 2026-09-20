<?php

namespace Tests\Feature\Auth;

use App\Models\Barangay;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
