<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Something a resident reports to their barangay: a broken streetlight,
 * uncollected garbage, or a mistake in their own record or household.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('concerns', function (Blueprint $table) {
            $table->id();
            $table->string('reference_no')->nullable()->unique();
            $table->foreignId('resident_id')->constrained('residents')->cascadeOnDelete();
            $table->foreignId('barangay_id')->constrained('barangays')->cascadeOnDelete();
            $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('category'); // streetlight, garbage, drainage, road, safety, noise, record_correction, other
            $table->text('description');
            $table->string('location')->nullable();
            $table->string('status')->default('open'); // open, in_progress, resolved, closed
            $table->text('response')->nullable();
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['barangay_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('concerns');
    }
};
