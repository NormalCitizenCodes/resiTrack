<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sector_criteria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sector_id')->constrained('vulnerability_sectors')->cascadeOnDelete();
            $table->string('criteria_field');    // resident attribute, e.g. date_of_birth, is_pwd, civil_status
            $table->string('criteria_operator'); // >=, <=, ==, !=, is_true, is_false, in
            $table->string('criteria_value');    // comparison value, e.g. 60, true, "Widowed|Separated"
            $table->date('effective_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sector_criteria');
    }
};
