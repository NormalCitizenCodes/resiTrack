<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Backfills a few illustrative audit-trail entries so the Reports dashboard and
 * its "generated reports" history are populated for the demo rather than empty.
 */
class AuditLogSeeder extends Seeder
{
    public function run(): void
    {
        $secretary = User::where('email', 'secretary@resitrack.test')->first();
        $bhw = User::where('email', 'bhw@resitrack.test')->first();

        if (! $secretary) {
            return;
        }

        $entries = [
            ['user' => $bhw, 'action' => 'create', 'table' => 'residents', 'days' => 2],
            ['user' => $bhw, 'action' => 'update', 'table' => 'residents', 'days' => 3],
            ['user' => $secretary, 'action' => 'create', 'table' => 'households', 'days' => 5],
            ['user' => $secretary, 'action' => 'resolve', 'table' => 'duplicate_alerts', 'days' => 6],
            ['user' => $secretary, 'action' => 'generated_report', 'table' => 'sector_dashboard', 'days' => 1,
                'new' => ['scope' => 'Barangay 22', 'format' => 'pdf']],
            ['user' => $secretary, 'action' => 'generated_report', 'table' => 'resident_population', 'days' => 7,
                'new' => ['scope' => 'Barangay 22', 'format' => 'csv']],
        ];

        foreach ($entries as $entry) {
            $when = now()->subDays($entry['days']);

            AuditLog::create([
                'user_id' => $entry['user']?->id ?? $secretary->id,
                'action' => $entry['action'],
                'table_affected' => $entry['table'],
                'new_value' => isset($entry['new']) ? json_encode($entry['new']) : null,
                'performed_at' => $when,
                'created_at' => $when,
                'updated_at' => $when,
            ]);
        }
    }
}
