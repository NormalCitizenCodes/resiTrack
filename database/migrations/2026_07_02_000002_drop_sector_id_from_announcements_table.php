<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A single sector_id could only ever target one vulnerability sector per
 * announcement, or broadcast to everyone. Replaced by announcement_sectors
 * (see the prior migration) so an announcement can target several sectors
 * at once - the same many-to-many shape programs already use.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->dropForeign(['sector_id']);
            $table->dropColumn('sector_id');
        });
    }

    public function down(): void
    {
        Schema::table('announcements', function (Blueprint $table) {
            $table->foreignId('sector_id')->nullable()->after('barangay_id')->constrained('vulnerability_sectors')->nullOnDelete();
        });
    }
};
