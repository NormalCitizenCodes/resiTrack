<?php

namespace Database\Seeders;

use App\Models\Announcement;
use App\Models\Barangay;
use App\Models\Household;
use App\Models\User;
use App\Models\VulnerabilitySector;
use App\Models\WellbeingLevel;
use App\Services\NotificationService;
use Illuminate\Database\Seeder;

/**
 * Seeds the community-feature tables so the Wellbeing, Announcements and
 * Notifications features are demo-able immediately on first login.
 */
class CommunityFeaturesSeeder extends Seeder
{
    public function run(): void
    {
        $barangay = Barangay::where('name', 'Barangay 22')->first();
        $secretary = User::where('email', 'secretary@resitrack.test')->first();
        $bhw = User::where('email', 'bhw@resitrack.test')->first();

        if (! $barangay || ! $secretary) {
            return;
        }

        $this->seedWellbeingAssessments($barangay, $bhw ?? $secretary);
        $this->seedAnnouncements($barangay, $secretary);
    }

    private function seedWellbeingAssessments(Barangay $barangay, User $assessor): void
    {
        $levels = WellbeingLevel::orderBy('id')->get();
        if ($levels->isEmpty()) {
            return;
        }

        Household::where('barangay_id', $barangay->id)
            ->take(3)
            ->get()
            ->each(function (Household $household, int $index) use ($levels, $assessor) {
                $level = $levels[$index % $levels->count()];

                $household->wellbeingAssessments()->create([
                    'level_id' => $level->id,
                    'assessed_by' => $assessor->id,
                    'assessment_date' => now()->subDays(10 - $index)->toDateString(),
                    'remarks' => 'Initial wellbeing assessment during profiling.',
                ]);
            });
    }

    private function seedAnnouncements(Barangay $barangay, User $author): void
    {
        // Broadcast to the whole barangay (no sectors attached).
        $broadcast = Announcement::create([
            'posted_by' => $author->id,
            'barangay_id' => $barangay->id,
            'title' => 'Barangay Assembly this Saturday',
            'content' => 'All residents are invited to the quarterly barangay assembly at the covered court, 9:00 AM.',
            'posted_at' => now()->subDays(2),
            'expires_at' => now()->addDays(14),
        ]);
        NotificationService::notifyAnnouncement($broadcast);

        // Targeted at senior citizens and PWDs - demonstrates multi-sector targeting.
        $senior = VulnerabilitySector::where('code', 'SENIOR')->first();
        $pwd = VulnerabilitySector::where('code', 'PWD')->first();
        if ($senior) {
            $targeted = Announcement::create([
                'posted_by' => $author->id,
                'barangay_id' => $barangay->id,
                'title' => 'Social Pension payout schedule',
                'content' => 'Qualified senior citizens and PWDs may claim their social pension / assistance at the barangay hall next week.',
                'posted_at' => now()->subDay(),
                'expires_at' => now()->addDays(10),
            ]);
            $targeted->sectors()->attach(array_filter([$senior->id, $pwd?->id]));
            NotificationService::notifyAnnouncement($targeted);
        }
    }
}
