<?php

namespace App\Console\Commands;

use App\Models\Barangay;
use App\Models\PsgcLocation;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportPsgc extends Command
{
    protected $signature = 'psgc:import {--if-empty : Do nothing when the table already has data (safe to run on every deploy)}';

    protected $description = 'Load the PSA Philippine Standard Geographic Code (regions to barangays) and link the app\'s own barangays to it';

    public function handle(): int
    {
        if ($this->option('if-empty') && PsgcLocation::query()->exists()) {
            $this->components->info('PSGC already imported, skipping.');

            $this->linkBarangays();

            return self::SUCCESS;
        }

        $path = database_path('data/psgc.json.gz');
        $json = is_file($path) ? gzdecode((string) file_get_contents($path)) : false;
        $rows = $json === false ? null : json_decode($json, true);

        if (! is_array($rows)) {
            $this->components->error("Could not read {$path}.");

            return self::FAILURE;
        }

        // Small chunks: SQLite caps bound parameters per statement.
        DB::transaction(function () use ($rows) {
            foreach (array_chunk($rows, 200) as $chunk) {
                PsgcLocation::upsert(
                    array_map(fn (array $row) => ['code' => $row[0], 'name' => $row[1], 'level' => $row[2], 'parent_code' => $row[3]], $chunk),
                    ['code'],
                    ['name', 'level', 'parent_code'],
                );
            }
        });

        $this->components->info('Imported '.number_format(count($rows)).' places.');
        $this->linkBarangays();

        return self::SUCCESS;
    }

    /**
     * Match the app's own barangays (name + city + province) to PSGC codes, so
     * forms can start on the staff member's barangay. Best effort: anything
     * that does not match uniquely is left unlinked.
     */
    private function linkBarangays(): void
    {
        $linked = 0;

        Barangay::query()->whereNull('psgc_code')->each(function (Barangay $barangay) use (&$linked) {
            $cities = PsgcLocation::query()->where('level', PsgcLocation::CITY)->get()
                ->filter(fn (PsgcLocation $city) => $this->normalize($city->name) === $this->normalize($barangay->city_municipality));

            if ($cities->count() > 1) {
                $cities = $cities->filter(function (PsgcLocation $city) use ($barangay) {
                    $province = PsgcLocation::find($city->parent_code);

                    return $province !== null && $this->normalize($province->name) === $this->normalize($barangay->province);
                });
            }

            if ($cities->count() !== 1) {
                return;
            }

            $matches = PsgcLocation::query()
                ->where('level', PsgcLocation::BARANGAY)
                ->where('parent_code', $cities->first()->code)
                ->get()
                ->filter(fn (PsgcLocation $place) => $this->normalize($place->name) === $this->normalize($barangay->name));

            if ($matches->count() === 1) {
                $barangay->update(['psgc_code' => $matches->first()->code]);
                $linked++;
            }
        });

        $this->components->info("Linked {$linked} barangay(s) to their PSGC code.");
    }

    /** "City of Cagayan De Oro" and "Cagayan de Oro City" compare equal; so do "Barangay 22" and "Barangay 22 (Pob.)". */
    private function normalize(?string $name): string
    {
        $name = strtolower((string) $name);
        $name = preg_replace('/\([^)]*\)/', '', $name);
        $name = preg_replace('/\b(city of|municipality of|city)\b/', '', (string) $name);

        return (string) preg_replace('/[^a-z0-9]/', '', (string) $name);
    }
}
