<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Picked places are stored as PSGC codes beside the readable text, so
     * reports can group by city or province instead of parsing free text.
     * The old `address` / `place_of_birth` text columns stay: they hold the
     * composed line for display, or legacy text for records made before this.
     */
    private const PREFIXES = [
        'residents' => ['address' => true, 'birth' => false, 'previous' => true],
        'households' => ['address' => true],
    ];

    public function up(): void
    {
        foreach (self::PREFIXES as $tableName => $prefixes) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName, $prefixes) {
                foreach ($prefixes as $prefix => $hasStreetAndZip) {
                    $table->string("{$prefix}_region_code", 9)->nullable();
                    $table->string("{$prefix}_province_code", 9)->nullable();
                    $table->string("{$prefix}_city_code", 9)->nullable();
                    $table->string("{$prefix}_barangay_code", 9)->nullable();

                    if ($hasStreetAndZip) {
                        $table->string("{$prefix}_street", 150)->nullable();
                        $table->string("{$prefix}_zip", 4)->nullable();
                    }
                }

                if ($tableName === 'residents') {
                    $table->string('previous_address')->nullable();
                }
            });
        }
    }

    public function down(): void
    {
        foreach (self::PREFIXES as $tableName => $prefixes) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName, $prefixes) {
                foreach ($prefixes as $prefix => $hasStreetAndZip) {
                    $table->dropColumn(array_merge(
                        ["{$prefix}_region_code", "{$prefix}_province_code", "{$prefix}_city_code", "{$prefix}_barangay_code"],
                        $hasStreetAndZip ? ["{$prefix}_street", "{$prefix}_zip"] : [],
                    ));
                }

                if ($tableName === 'residents') {
                    $table->dropColumn('previous_address');
                }
            });
        }
    }
};
