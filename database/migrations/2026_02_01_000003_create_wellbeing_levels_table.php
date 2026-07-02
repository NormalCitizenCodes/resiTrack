<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wellbeing_levels', function (Blueprint $table) {
            $table->id();
            // level_1_survival, level_2_subsistence, level_3_self_sufficient
            $table->string('level_code')->unique();
            $table->string('label');
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wellbeing_levels');
    }
};
