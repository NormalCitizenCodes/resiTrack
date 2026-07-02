<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('residents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('household_id')->nullable()->constrained('households')->nullOnDelete();
            $table->foreignId('barangay_id')->constrained('barangays')->cascadeOnDelete();

            // Identity
            // NOTE: intentionally NOT unique. Duplicate detection relies on being
            // able to store two records that share a PhilSys number so the match
            // can be flagged as a DuplicateAlert for staff to reconcile. A DB
            // unique constraint would reject the second insert and defeat the
            // whole duplicate-detection workflow (Objective 1).
            $table->string('philsys_card_no')->nullable();
            $table->string('last_name');
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('suffix')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('place_of_birth')->nullable();
            $table->string('sex')->nullable();          // male, female
            $table->string('civil_status')->nullable(); // single, married, widowed, separated
            $table->string('religion')->nullable();
            $table->string('citizenship')->nullable()->default('Filipino');

            // Contact & socio-economic
            $table->string('contact_number')->nullable();
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->string('occupation')->nullable();
            $table->string('employment_status')->nullable(); // employed, unemployed, self_employed
            $table->string('education_level')->nullable();   // elementary, highschool, college, vocational, none
            $table->string('education_status')->nullable();  // enrolled, not_enrolled, graduated
            $table->decimal('monthly_income', 12, 2)->nullable();

            // Vulnerability flags (derived by rule-based classification)
            $table->boolean('is_pwd')->default(false);
            $table->boolean('is_solo_parent')->default(false);
            $table->boolean('is_osy')->default(false);
            $table->boolean('is_senior_citizen')->default(false);
            $table->boolean('is_pregnant')->default(false);

            // Status & transfer tracking
            $table->boolean('is_active')->default(true);
            $table->boolean('is_duplicate_flagged')->default(false);
            $table->foreignId('transferred_to_barangay')->nullable()->constrained('barangays')->nullOnDelete();
            $table->date('transfer_date')->nullable();
            $table->string('transfer_status')->nullable(); // pending, confirmed

            $table->timestamp('registered_at')->nullable();
            $table->timestamps();

            $table->index(['last_name', 'first_name']);
            $table->index('philsys_card_no');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('residents');
    }
};
