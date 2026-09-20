<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('duplicate_alerts', function (Blueprint $table) {
            $table->timestamp('escalated_at')->nullable();
            $table->foreignId('escalated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('escalation_note')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('duplicate_alerts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('escalated_by');
            $table->dropColumn(['escalated_at', 'escalation_note']);
        });
    }
};
