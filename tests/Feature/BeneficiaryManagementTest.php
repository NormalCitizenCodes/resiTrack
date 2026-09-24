<?php

use App\Models\Barangay;
use App\Models\Beneficiary;
use App\Models\PartnerAgency;
use App\Models\Program;
use App\Models\Resident;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->barangay = Barangay::where('name', 'Barangay 22')->first();
    $this->otherBarangay = Barangay::where('name', 'Barangay 23')->first();
    $this->agency = PartnerAgency::where('agency_type', 'DSWD')->first();
    $this->otherAgency = PartnerAgency::where('agency_type', 'PESO')->first();
});

function beneficiaryProgram(PartnerAgency $agency, ?Barangay $barangay, User $postedBy): Program
{
    return Program::create([
        'agency_id' => $agency->id,
        'barangay_id' => $barangay?->id,
        'posted_by' => $postedBy->id,
        'title' => 'Test Program '.uniqid(),
        'slots_available' => 10,
        'slots_filled' => 0,
        'status' => 'active',
    ]);
}

it('lets an agency see beneficiaries across its own programs only', function () {
    $agencyUser = User::factory()->create(['role' => User::ROLE_PARTNER_AGENCY, 'agency_id' => $this->agency->id]);
    $program = beneficiaryProgram($this->agency, null, $agencyUser);
    $resident = Resident::factory()->create(['barangay_id' => $this->barangay->id]);
    $beneficiary = Beneficiary::create([
        'program_id' => $program->id,
        'resident_id' => $resident->id,
        'status' => 'active',
        'date_added' => now(),
    ]);

    // A beneficiary under a different agency entirely - must not appear.
    $otherAgencyUser = User::factory()->create(['role' => User::ROLE_PARTNER_AGENCY, 'agency_id' => $this->otherAgency->id]);
    $otherProgram = beneficiaryProgram($this->otherAgency, null, $otherAgencyUser);
    Beneficiary::create([
        'program_id' => $otherProgram->id,
        'resident_id' => Resident::factory()->create(['barangay_id' => $this->barangay->id])->id,
        'status' => 'active',
        'date_added' => now(),
    ]);

    $this->actingAs($agencyUser)
        ->get('/beneficiaries')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('beneficiaries/index')
            ->has('beneficiaries.data', 1)
            ->where('beneficiaries.data.0.id', $beneficiary->id));
});

it('keeps a barangay-scoped agency accounts beneficiary list to its own barangay', function () {
    $scopedAgencyUser = User::factory()->create([
        'role' => User::ROLE_PARTNER_AGENCY,
        'agency_id' => $this->agency->id,
        'barangay_id' => $this->barangay->id,
    ]);
    $ownProgram = beneficiaryProgram($this->agency, $this->barangay, $scopedAgencyUser);
    $ownBeneficiary = Beneficiary::create([
        'program_id' => $ownProgram->id,
        'resident_id' => Resident::factory()->create(['barangay_id' => $this->barangay->id])->id,
        'status' => 'active',
        'date_added' => now(),
    ]);

    $otherProgram = beneficiaryProgram($this->agency, $this->otherBarangay, $scopedAgencyUser);
    Beneficiary::create([
        'program_id' => $otherProgram->id,
        'resident_id' => Resident::factory()->create(['barangay_id' => $this->otherBarangay->id])->id,
        'status' => 'active',
        'date_added' => now(),
    ]);

    $this->actingAs($scopedAgencyUser)
        ->get('/beneficiaries')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('beneficiaries.data', 1)
            ->where('beneficiaries.data.0.id', $ownBeneficiary->id));
});

it('lets a super admin see beneficiaries across every agency', function () {
    $superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN, 'barangay_id' => null]);
    $agencyUser = User::factory()->create(['role' => User::ROLE_PARTNER_AGENCY, 'agency_id' => $this->agency->id]);
    $program = beneficiaryProgram($this->agency, null, $agencyUser);
    Beneficiary::create([
        'program_id' => $program->id,
        'resident_id' => Resident::factory()->create(['barangay_id' => $this->barangay->id])->id,
        'status' => 'active',
        'date_added' => now(),
    ]);

    $this->actingAs($superAdmin)
        ->get('/beneficiaries')
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('beneficiaries.data', 1));
});

it('denies barangay staff and residents from viewing the beneficiaries roster', function () {
    $bhw = User::factory()->create(['role' => User::ROLE_BHW, 'barangay_id' => $this->barangay->id]);
    $resident = User::factory()->create(['role' => User::ROLE_RESIDENT]);

    $this->actingAs($bhw)->get('/beneficiaries')->assertForbidden();
    $this->actingAs($resident)->get('/beneficiaries')->assertForbidden();
});
