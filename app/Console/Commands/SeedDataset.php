<?php

namespace App\Console\Commands;

use App\Models\VulnerabilitySector;
use Database\Seeders\AuditLogSeeder;
use Database\Seeders\CommunityFeaturesSeeder;
use Database\Seeders\DemoStorySeeder;
use Database\Seeders\LoadTestSeeder;
use Database\Seeders\ProgramSeeder;
use Database\Seeders\ReferenceDataSeeder;
use Database\Seeders\UserSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Realistic data for development, never for production.
 *
 *   php artisan data:seed loadtest --here   about 1,000 residents ADDED to the database you are
 *                                           running now (backed up first; existing rows stay)
 *   php artisan data:seed loadtest          the same, built into its own throwaway SQLite file
 *   php artisan data:seed demo              a small hand-made set, also in its own file
 *
 * A separate file can never touch the working database or the live site. To run the app
 * against one, see "Demo and load-test data" in the README: use PHP's own server, because
 * `php artisan serve` drops the DB_DATABASE override.
 */
class SeedDataset extends Command
{
    protected $signature = 'data:seed {kind : demo or loadtest} {--residents=1000 : about how many residents the loadtest set gets} {--here : add the load-test data to the CURRENT database instead of a new file (backs it up first)}';

    protected $description = 'Add realistic demo or load-test data, to the current local database (--here) or to its own SQLite file';

    private const TABLES = [
        'users', 'residents', 'households', 'resident_sectors', 'duplicate_alerts', 'programs', 'program_applications', 'beneficiaries',
        'program_schedules', 'announcements', 'app_notifications', 'document_requests', 'concerns', 'household_wellbeing_assessments',
        'account_deletion_requests', 'account_reactivation_requests', 'password_recovery_requests', 'audit_logs',
    ];

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

        if ($this->option('here')) {
            return $this->loadHere($kind);
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

            // The barangays exist only now, so this is the moment they can be linked to their PSGC codes.
            if ($seeder === ReferenceDataSeeder::class) {
                $this->call('psgc:import', ['--if-empty' => true]);
            }
        }

        $this->report();
        $this->components->info(sprintf('Done in %.1f seconds. Run the app against it:', microtime(true) - $started));
        $this->line("  \$env:DB_DATABASE = \"\$PWD\\database\\{$kind}.sqlite\"");
        $this->line('  cd public; php -S 127.0.0.1:8000 ..\vendor\laravel\framework\src\Illuminate\Foundation\resources\server.php');
        $this->line('  (Not `php artisan serve`: it drops the database override.)');
        $this->line('  Staff and agency logins: email as password. Residents: "password".');

        return self::SUCCESS;
    }

    /**
     * Adds the load-test data to the database the app is using right now. Nothing is
     * removed: the file is copied first, and the seeder only adds rows (and refuses to
     * run twice).
     */
    private function loadHere(string $kind): int
    {
        if ($kind !== 'loadtest') {
            $this->components->error('Only the load-test data can be added to the current database. The demo set builds its own file.');

            return self::FAILURE;
        }

        $connection = (string) config('database.default');
        $path = (string) config("database.connections.{$connection}.database");

        if (config("database.connections.{$connection}.driver") !== 'sqlite' || ! is_file($path)) {
            $this->components->error('This only works on a local SQLite database file.');

            return self::FAILURE;
        }

        if (! VulnerabilitySector::query()->exists()) {
            $this->components->error('This database has no reference data yet. Run `php artisan migrate --seed` first.');

            return self::FAILURE;
        }

        $backup = database_path('backup-'.now()->format('Ymd-His').'.sqlite');
        copy($path, $backup);
        $this->components->info("Backed up {$path} to {$backup}");

        config(['hashing.bcrypt.rounds' => 4, 'dataset.residents' => max(50, (int) $this->option('residents'))]);

        $started = microtime(true);
        $this->call('migrate', ['--force' => true]);
        $this->call('psgc:import', ['--if-empty' => true]);

        try {
            $this->components->task('LoadTestSeeder', fn () => $this->call('db:seed', ['--class' => LoadTestSeeder::class, '--force' => true, '--no-interaction' => true]) === 0);
        } catch (Throwable $e) {
            $this->components->error($e->getMessage());
            $this->line("  Nothing was added. The backup is at {$backup}.");

            return self::FAILURE;
        }

        $this->report();
        $this->components->info(sprintf('Done in %.1f seconds. Refresh the app: the numbers are already there.', microtime(true) - $started));
        $this->line('  Staff and agency logins end in @loadtest.test (email as password). Residents: resident1 to resident200, password "password".');
        $this->line("  To undo: stop the app and copy {$backup} back over {$path}.");

        return self::SUCCESS;
    }

    private function report(): void
    {
        $this->newLine();
        $this->table(['Table', 'Rows'], collect(self::TABLES)->map(fn (string $table) => [$table, number_format(DB::table($table)->count())])->all());
        $this->newLine();
    }
}
