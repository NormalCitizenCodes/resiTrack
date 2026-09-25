<?php

use App\Models\Barangay;
use App\Models\Household;
use App\Models\PartnerAgency;
use App\Models\Program;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->own = Barangay::where('name', 'Barangay 22')->first();
    $this->other = Barangay::where('name', 'Barangay 23')->first();
});

it('gives each role its own checklist, ticked off by real data in its own barangay only', function () {
    $bhw = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->own->id]);

    $this->actingAs($bhw)->get('/dashboard')->assertInertia(fn ($page) => $page
        ->where('onboarding.total', 4)
        ->where('onboarding.done', 0)
        ->where('onboarding.steps.0.key', 'register_household'));

    // A household in another barangay must not tick this BHW's step.
    Household::create(['barangay_id' => $this->other->id, 'address' => 'Elsewhere']);
    $this->actingAs($bhw)->get('/dashboard')->assertInertia(fn ($page) => $page->where('onboarding.done', 0));

    Household::create(['barangay_id' => $this->own->id, 'address' => 'Purok 1']);
    $this->actingAs($bhw)->get('/dashboard')->assertInertia(fn ($page) => $page
        ->where('onboarding.done', 1)
        ->where('onboarding.steps.0.done', true));
});

it('shows admins, the super admin and agencies their own steps', function () {
    $admin = User::factory()->create(['role' => User::ROLE_BARANGAY_ADMIN, 'barangay_id' => $this->own->id]);
    $super = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN, 'barangay_id' => null]);
    $agencyUser = User::factory()->create(['role' => User::ROLE_PARTNER_AGENCY, 'agency_id' => PartnerAgency::first()->id, 'barangay_id' => $this->own->id]);

    $this->actingAs($admin)->get('/dashboard')->assertInertia(fn ($page) => $page->where('onboarding.total', 5)->where('onboarding.steps.0.key', 'add_bhw'));

    // The seeded agencies already exist, so that step starts ticked.
    $this->actingAs($super)->get('/dashboard')->assertInertia(fn ($page) => $page->where('onboarding.steps.1.key', 'add_agency_org')->where('onboarding.steps.1.done', true));

    $this->actingAs($agencyUser)->get('/dashboard')->assertInertia(fn ($page) => $page->where('onboarding.steps.1.key', 'publish_program')->where('onboarding.steps.1.done', false));

    Program::create(['agency_id' => $agencyUser->agency_id, 'posted_by' => $agencyUser->id, 'title' => 'Aid', 'slots_available' => 5, 'slots_filled' => 0, 'status' => 'active']);
    $this->actingAs($agencyUser)->get('/dashboard')->assertInertia(fn ($page) => $page->where('onboarding.steps.1.done', true));
});

it('lets a user hide the checklist and bring it back from Help', function () {
    $bhw = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->own->id]);

    $this->actingAs($bhw)->post('/onboarding/dismiss')->assertRedirect();
    expect($bhw->fresh()->onboarding_dismissed_at)->not->toBeNull();
    $this->actingAs($bhw)->get('/dashboard')->assertInertia(fn ($page) => $page->where('onboarding', null));
    $this->actingAs($bhw)->get('/help')->assertOk()->assertInertia(fn ($page) => $page->component('help')->where('checklistHidden', true));

    $this->actingAs($bhw)->post('/onboarding/restore')->assertRedirect('/dashboard');
    expect($bhw->fresh()->onboarding_dismissed_at)->toBeNull();
});

it('opens the Help page for every role and keeps it behind a login', function () {
    $this->get('/help')->assertRedirect('/login');

    foreach ([User::ROLE_SUPER_ADMIN, User::ROLE_BARANGAY_ADMIN, User::ROLE_BHW, User::ROLE_PARTNER_AGENCY, User::ROLE_RESIDENT] as $role) {
        $user = User::factory()->create(['role' => $role, 'barangay_id' => $role === User::ROLE_SUPER_ADMIN ? null : $this->own->id]);
        $this->actingAs($user)->get('/help')->assertOk()->assertInertia(fn ($page) => $page->component('help'));
    }
});

it('serves robots.txt, a sitemap of the public pages, and preview metadata', function () {
    $this->get('/robots.txt')->assertOk()->assertSee('Sitemap: '.url('sitemap.xml'), false);

    $this->get('/sitemap.xml')->assertOk()
        ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
        ->assertSee('<loc>'.url('/faq').'</loc>', false)
        ->assertDontSee('dashboard');

    $this->get('/')->assertOk()
        ->assertSee('<meta property="og:image" content="'.url('images/og-image.png').'">', false)
        ->assertSee('name="description"', false)
        ->assertDontSee('noindex', false);

    $user = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->own->id]);
    $this->actingAs($user)->get('/dashboard')->assertSee('<meta name="robots" content="noindex, nofollow">', false);
});

it('keeps the chosen language across full page loads', function () {
    // The switcher writes app_lang from the browser, so the server must accept it unencrypted.
    $resident = User::factory()->create(['role' => User::ROLE_RESIDENT, 'barangay_id' => $this->own->id]);

    $this->actingAs($resident)->withUnencryptedCookie('app_lang', 'ceb')->get('/help')
        ->assertInertia(fn ($page) => $page->where('language', 'ceb'));
});
