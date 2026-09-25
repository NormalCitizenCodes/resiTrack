<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Emergency and service numbers residents can tap to call. A null
 * barangay_id is city-wide (managed by the super admin); otherwise the
 * barangay admin manages their own barangay's list.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hotlines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('barangay_id')->nullable()->constrained('barangays')->cascadeOnDelete();
            $table->string('name');
            $table->string('number', 40);
            $table->string('category')->default('other'); // emergency, police, fire, medical, disaster, barangay, other
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hotlines');
    }
};
