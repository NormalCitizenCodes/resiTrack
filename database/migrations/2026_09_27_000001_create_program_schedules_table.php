<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * When and where approved residents claim a program's benefit (a payout, a
 * distribution, a medical mission day). Shown to the program's approved
 * applicants and beneficiaries only.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('program_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained('programs')->cascadeOnDelete();
            $table->string('title');
            $table->dateTime('starts_at');
            $table->string('location');
            $table->string('what_to_bring')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['program_id', 'starts_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('program_schedules');
    }
};
