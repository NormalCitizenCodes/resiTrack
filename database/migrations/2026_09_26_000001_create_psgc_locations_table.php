<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The PSA's Philippine Standard Geographic Code, flattened to four levels:
     * region (r), province (p), city or municipality (c), barangay (b). Cities
     * that sit under no province (Metro Manila, a few independent cities) hang
     * directly off their region. Filled by `php artisan psgc:import`, not here,
     * so migrating a fresh test database stays fast.
     */
    public function up(): void
    {
        Schema::create('psgc_locations', function (Blueprint $table) {
            $table->string('code', 9)->primary();
            $table->string('name');
            $table->char('level', 1);
            $table->string('parent_code', 9)->nullable()->index();
        });

        Schema::table('barangays', function (Blueprint $table) {
            $table->string('psgc_code', 9)->nullable()->after('region');
        });
    }

    public function down(): void
    {
        Schema::table('barangays', function (Blueprint $table) {
            $table->dropColumn('psgc_code');
        });

        Schema::dropIfExists('psgc_locations');
    }
};
