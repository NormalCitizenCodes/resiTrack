<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Null barangay_id means city-wide (the previous, only behavior) - same
 * "absence = broadcast" convention already used for announcement_sectors.
 * Without this, a program meant for one barangay's relief fund shows up as
 * "eligible" to every other barangay too, which undercuts the equitable
 * distribution the whole system is for.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('programs', function (Blueprint $table) {
            $table->foreignId('barangay_id')->nullable()->after('agency_id')->constrained('barangays')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('programs', function (Blueprint $table) {
            $table->dropForeign(['barangay_id']);
            $table->dropColumn('barangay_id');
        });
    }
};
