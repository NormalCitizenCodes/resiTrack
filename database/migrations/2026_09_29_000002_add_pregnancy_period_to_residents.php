<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pregnancy is the one vulnerable sector that ends by itself. `pregnancy_expected_month` is the
 * first day of the month the baby is due; the Pregnant tag is removed 30 days after that month
 * ends (see PregnancyStatus). `pregnancy_source` says who reported it: 'staff' or 'self'.
 * Residents already marked pregnant before this have no month and stay until someone adds one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('residents', function (Blueprint $table) {
            $table->date('pregnancy_expected_month')->nullable()->after('is_pregnant');
            $table->string('pregnancy_source', 10)->nullable()->after('pregnancy_expected_month');
        });
    }

    public function down(): void
    {
        Schema::table('residents', function (Blueprint $table) {
            $table->dropColumn(['pregnancy_expected_month', 'pregnancy_source']);
        });
    }
};
