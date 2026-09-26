<?php

namespace App\Console\Commands;

use Database\Seeders\AuditLogSeeder;
use Database\Seeders\CommunityFeaturesSeeder;
use Database\Seeders\DemoStorySeeder;
use Database\Seeders\LoadTestSeeder;
use Database\Seeders\ProgramSeeder;
use Database\Seeders\ReferenceDataSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Builds a throwaway database full of realistic data, in its OWN SQLite file,
 * so it can never touch the working database or the live site.
 *
 *   php artisan data:seed demo        a small, hand-made set for screenshots and the defense demo
 *   php artisan data:seed loadtest    about 1,000 residents, to see how the system copes at scale
 *
 * Then run the app against it: see "Demo and load-test data" in the README. Use PHP's
 * own server, because `php artisan serve` drops the DB_DATABASE override.
 */
class SeedDataset extends Command
{
    protected $signature = 'data:seed {kind : demo or loadtest} {--residents=1000 : about how many residents the loadtest set gets}';

    protected $description = 'Create a demo or load-test database in its own SQLite file (never the working or live database)';

    public function handle(): int
    {
        if (app()->isProduction()) {
            $this->components->error('This only runs on a development machine.');

            return self::FAILURE;
        }

        $kind = (string) $this->argument('kind');

        if (! in_array($kind, ['demo', 'loadtest'], true)) {
            $this->components->error('Choose "demo" or "loadtest".');

            return self::FAILURE;
        }

        $path = database_path("{$kind}.sqlite");
        @unlink($path);
        touch($path);

        // Point everything at the new file for the rest of this command only.
        config([
            'database.connections.dataset' => ['driver' => 'sqlite', 'database' => $path, 'prefix' => '', 'foreign_key_constraints' => true],
            'database.default' => 'dataset',
            // Seeding hashes a password per account; a cheap hash keeps that fast. Local only.
            'hashing.bcrypt.rounds' => 4,
            'dataset.residents' => max(50, (int) $this->option('residents')),
        ]);
        DB::purge('dataset');

        $started = microtime(true);

        $this->components->info("Creating {$path}");
        $this->call('migrate:fresh', ['--force' => true, '--database' => 'dataset']);
        $this->call('psgc:import');

        $seeders = $kind === 'demo'
            ? [ReferenceDataSeeder::class, UserSeeder::class, ProgramSeeder::class, AuditLogSeeder::class, CommunityFeaturesSeeder::class, DemoStorySeeder::class]
            : [ReferenceDataSeeder::class, UserSeeder::class, ProgramSeeder::class, LoadTestSeeder::class];

        foreach ($seeders as $seeder) {
            $this->components->task(class_basename($seeder), fn () => $this->call('db:seed', ['--class' => $seeder, '--force' => true, '--no-interaction' => true]) === 0);
        }

        $this->newLine();
        $this->table(['Table', 'Rows'], collect([
            'users', 'residents', 'households', 'resident_sectors', 'duplicate_alerts', 'programs', 'program_applications', 'beneficiaries',
            'program_schedules', 'announcements', 'app_notifications', 'document_requests', 'concerns', 'household_wellbeing_assessments',
            'account_deletion_requests', 'account_reactivation_requests', 'password_recovery_requests', 'audit_logs',
        ])->map(fn (string $table) => [$table, number_format(DB::table($table)->count())])->all());

        $this->newLine();
        $this->components->info(sprintf('Done in %.1f seconds. Run the app against it:', microtime(true) - $started));
        $this->line("  \$env:DB_DATABASE = \"\$PWD\\database\\{$kind}.sqlite\"");
        $this->line('  cd public; php -S 127.0.0.1:8000 ..\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php');
        $this->line('  (Not `php artisan serve`: it drops the database override.)');
        $this->line('  Staff and agency logins: email as password. Residents: "password".');

        return self::SUCCESS;
    }
}
