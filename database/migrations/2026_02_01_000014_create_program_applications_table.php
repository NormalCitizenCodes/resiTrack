<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('program_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained('programs')->cascadeOnDelete();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->string('status')->default('pending'); // pending, approved, rejected
            $table->timestamp('applied_at')->nullable();
            $table->timestamps();

            $table->unique(['program_id', 'resident_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('program_applications');
    }
};
