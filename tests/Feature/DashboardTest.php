<?php

namespace Tests\Feature;

use App\Models\Barangay;
use App\Models\PartnerAgency;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
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

    public function test_super_admin_sees_a_city_wide_barangay_summary_with_sector_breakdown(): void
    {
        $this->seed(ReferenceDataSeeder::class);
        $superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN, 'barangay_id' => null]);

        $this->actingAs($superAdmin)->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('scope', 'City-wide')
                ->has('barangays', Barangay::count())
                ->has('barangays.0.sector_counts'));
    }

    public function test_partner_agency_also_sees_the_city_wide_barangay_summary_but_its_own_stats_stay_scoped(): void
    {
        $this->seed(ReferenceDataSeeder::class);
        $barangay = Barangay::first();
        $agency = PartnerAgency::first();
        $agencyUser = User::factory()->create([
            'role' => User::ROLE_PARTNER_AGENCY,
            'agency_id' => $agency->id,
            'barangay_id' => $barangay->id,
        ]);

        $this->actingAs($agencyUser)->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('scope', $barangay->name)
                ->has('barangays', Barangay::count()));
    }

    public function test_barangay_admin_and_bhw_do_not_get_the_city_wide_barangay_summary(): void
    {
        $this->seed(ReferenceDataSeeder::class);
        $barangay = Barangay::first();

        foreach ([User::ROLE_BARANGAY_ADMIN, User::ROLE_BHW] as $role) {
            $staff = User::factory()->create(['role' => $role, 'barangay_id' => $barangay->id]);

            $this->actingAs($staff)->get(route('dashboard'))
                ->assertInertia(fn ($page) => $page
                    ->where('scope', $barangay->name)
                    ->has('barangays', 0));
        }
    }
}
