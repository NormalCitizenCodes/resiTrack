<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();
    }

    public function test_the_sidebar_state_is_restored_from_the_sidebar_state_cookie()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->withUnencryptedCookie('sidebar_state', 'false')->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('sidebarOpen', false));

        $this->actingAs($user)->withUnencryptedCookie('sidebar_state', 'true')->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('sidebarOpen', true));

        $this->actingAs($user)->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('sidebarOpen', true));
    }
}
