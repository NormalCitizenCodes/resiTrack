<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('households', function (Blueprint $table) {
            $table->id();
            $table->foreignId('barangay_id')->constrained('barangays')->cascadeOnDelete();
            $table->foreignId('zone_id')->nullable()->constrained('barangay_zones')->nullOnDelete();
            $table->string('household_number')->nullable();
            $table->string('address')->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->string('house_materials')->nullable();
            $table->string('house_ownership')->nullable();    // owned, rented, shared
            $table->string('water_source')->nullable();       // pipe, well, others
            $table->string('electricity_source')->nullable(); // metered, shared, none
            $table->string('waste_management')->nullable();   // collected, burned, others
            $table->string('toilet_facility')->nullable();    // private, shared, none
            $table->unsignedInteger('member_count')->default(0);
            $table->decimal('monthly_income', 12, 2)->nullable();
            $table->boolean('is_4ps_beneficiary')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('households');
    }
};
