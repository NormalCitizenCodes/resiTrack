<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // super_admin, barangay_admin, bhw, partner_agency, resident
            $table->string('role')->default('resident')->after('email');
            $table->string('first_name')->nullable()->after('role');
            $table->string('last_name')->nullable()->after('first_name');

            // Organisational links (no DB-level FK: SQLite cannot add constraints via ALTER)
            $table->unsignedBigInteger('barangay_id')->nullable()->after('last_name');
            $table->unsignedBigInteger('agency_id')->nullable()->after('barangay_id');
            $table->unsignedBigInteger('resident_id')->nullable()->after('agency_id');

            $table->boolean('is_active')->default(true)->after('resident_id');
            $table->timestamp('last_login_at')->nullable()->after('is_active');

            $table->index('role');
            $table->index('barangay_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role']);
            $table->dropIndex(['barangay_id']);
            $table->dropColumn([
                'role', 'first_name', 'last_name',
                'barangay_id', 'agency_id', 'resident_id',
                'is_active', 'last_login_at',
            ]);
        });
    }
};
