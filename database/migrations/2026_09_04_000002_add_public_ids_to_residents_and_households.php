<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('residents', function (Blueprint $table) {
            $table->string('resident_id', 20)->nullable()->unique()->after('id');
        });

        Schema::table('households', function (Blueprint $table) {
            $table->string('household_id', 20)->nullable()->unique()->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('residents', fn (Blueprint $table) => $table->dropUnique(['resident_id']));
        Schema::table('residents', fn (Blueprint $table) => $table->dropColumn('resident_id'));
        Schema::table('households', fn (Blueprint $table) => $table->dropUnique(['household_id']));
        Schema::table('households', fn (Blueprint $table) => $table->dropColumn('household_id'));
    }
};