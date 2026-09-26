<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A claim: a beneficiary actually received what a program gives, on a claim day. Beneficiaries
 * say who is entitled; claims say who came. A claim belongs to a scheduled claim day when the
 * agency has set one, so a recurring program can be claimed once per day.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('program_claims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained('programs')->cascadeOnDelete();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->foreignId('schedule_id')->nullable()->constrained('program_schedules')->nullOnDelete();
            $table->date('claim_date');
            $table->dateTime('claimed_at');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('note', 200)->nullable();
            $table->timestamps();

            // One claim per person per scheduled claim day. (Claims with no schedule are held to one a day in the app.)
            $table->unique(['program_id', 'resident_id', 'schedule_id']);
            $table->index(['program_id', 'claim_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('program_claims');
    }
};
