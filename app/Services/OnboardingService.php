<?php

namespace App\Services;

use App\Models\Announcement;
use App\Models\Household;
use App\Models\PartnerAgency;
use App\Models\Program;
use App\Models\ProgramApplication;
use App\Models\Resident;
use App\Models\User;

/**
 * The dashboard's getting-started checklist for staff and partner agencies.
 * Each step is ticked off by real data (the first household exists, a
 * program is published, and so on), scoped exactly like the pages the steps
 * link to, so the list never claims something the user cannot see. The
 * wording lives in the frontend; this decides which steps apply and which
 * are done.
 */
class OnboardingService
{
    /**
     * @return array{steps: array<int, array{key: string, href: string, done: bool}>, done: int, total: int}|null
     */
    public function checklistFor(User $user): ?array
    {
        if ($user->onboarding_dismissed_at !== null) {
            return null;
        }

        $steps = match ($user->role) {
            User::ROLE_SUPER_ADMIN => $this->superAdmin(),
            User::ROLE_BARANGAY_ADMIN => $this->barangayAdmin($user),
            User::ROLE_BHW => $this->bhw($user),
            User::ROLE_PARTNER_AGENCY => $this->partnerAgency($user),
            default => [],
        };

        if ($steps === []) {
            return null;
        }

        return [
            'steps' => $steps,
            'done' => count(array_filter($steps, fn (array $step) => $step['done'])),
            'total' => count($steps),
        ];
    }

    /**
     * @return array<int, array{key: string, href: string, done: bool}>
     */
    private function superAdmin(): array
    {
        return [
            $this->step('add_barangay_admin', '/staff/create', User::query()->where('role', User::ROLE_BARANGAY_ADMIN)->exists()),
            $this->step('add_agency_org', '/partner-agencies', PartnerAgency::query()->exists()),
            $this->step('add_agency_account', '/partner-agencies', User::query()->where('role', User::ROLE_PARTNER_AGENCY)->exists()),
        ];
    }

    /**
     * @return array<int, array{key: string, href: string, done: bool}>
     */
    private function barangayAdmin(User $user): array
    {
        $barangayId = $user->barangay_id;

        return [
            $this->step('add_bhw', '/staff/create', User::query()->where('role', User::ROLE_BHW)->where('barangay_id', $barangayId)->exists()),
            $this->step('register_household', '/households/create', Household::query()->where('barangay_id', $barangayId)->exists()),
            $this->step('register_resident', '/residents/create', Resident::query()->where('barangay_id', $barangayId)->exists()),
            $this->step('add_agency_account', '/partner-agencies', User::query()->where('role', User::ROLE_PARTNER_AGENCY)->where('barangay_id', $barangayId)->exists()),
            $this->step('post_announcement', '/announcements/create', Announcement::query()->where('barangay_id', $barangayId)->exists()),
        ];
    }

    /**
     * @return array<int, array{key: string, href: string, done: bool}>
     */
    private function bhw(User $user): array
    {
        $barangayId = $user->barangay_id;

        return [
            $this->step('register_household', '/households/create', Household::query()->where('barangay_id', $barangayId)->exists()),
            $this->step('register_resident', '/residents/create', Resident::query()->where('barangay_id', $barangayId)->exists()),
            $this->step('assign_household', '/residents', Resident::query()->where('barangay_id', $barangayId)->whereNotNull('household_id')->exists()),
            $this->step('verify_account', '/resident-registrations', User::query()
                ->where('role', User::ROLE_RESIDENT)
                ->where('barangay_id', $barangayId)
                ->whereNotNull('registration_id')
                ->whereNotNull('resident_id')
                ->exists()),
        ];
    }

    /**
     * @return array<int, array{key: string, href: string, done: bool}>
     */
    private function partnerAgency(User $user): array
    {
        $agency = $user->agency_id ? PartnerAgency::find($user->agency_id) : null;

        $ownPrograms = fn () => Program::query()
            ->where('agency_id', $user->agency_id)
            ->when($user->barangay_id !== null, fn ($query) => $query
                ->where(fn ($inner) => $inner->whereNull('barangay_id')->orWhere('barangay_id', $user->barangay_id)));

        return [
            $this->step('agency_profile', '/agency-profile', $agency !== null && filled($agency->contact_person) && filled($agency->contact_number)),
            $this->step('publish_program', '/programs/create', $ownPrograms()->exists()),
            $this->step('review_application', '/applications/review', ProgramApplication::query()
                ->whereIn('program_id', $ownPrograms()->select('id'))
                ->where('status', '!=', 'pending')
                ->exists()),
        ];
    }

    /**
     * @return array{key: string, href: string, done: bool}
     */
    private function step(string $key, string $href, bool $done): array
    {
        return ['key' => $key, 'href' => $href, 'done' => $done];
    }
}
