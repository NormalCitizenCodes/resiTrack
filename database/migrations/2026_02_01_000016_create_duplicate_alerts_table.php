<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('duplicate_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resident_id_1')->constrained('residents')->cascadeOnDelete();
            $table->foreignId('resident_id_2')->constrained('residents')->cascadeOnDelete();
            $table->float('similarity_score')->default(0);
            // Values: philsys, name_dob, name_address, cross_barangay_transfer.
            // The 5th value (cross_barangay_transfer) intentionally extends the
            // paper's original enum: it distinguishes an incoming transfer (same
            // person found in another barangay) from an in-barangay duplicate,
            // which the paper's scope explicitly requires.
            $table->string('match_basis');
            $table->string('status')->default('pending'); // pending, resolved, dismissed
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('detected_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->unique(['resident_id_1', 'resident_id_2']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('duplicate_alerts');
    }
};
