<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The household leader: the one member the family chooses to represent it (called to
 * meetings and giveaways). Staff only record the family's choice. Nullable on purpose:
 * a household starts without one, and it is cleared if the person moves out, is
 * deactivated or is removed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('households', function (Blueprint $table) {
            $table->foreignId('leader_resident_id')->nullable()->after('zone_id')->constrained('residents')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('households', function (Blueprint $table) {
            $table->dropConstrainedForeignId('leader_resident_id');
        });
    }
};
