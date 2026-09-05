<?php

use App\Models\Resident;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('residents', function (Blueprint $table) {
            $table->foreignId('profiled_by_user_id')->nullable()->after('registered_at')->constrained('users')->nullOnDelete();
            $table->timestamp('profiled_at')->nullable()->after('profiled_by_user_id');
        });

        Schema::table('app_notifications', function (Blueprint $table) {
            $table->foreignId('related_user_id')->nullable()->after('resident_id')->constrained('users')->nullOnDelete();
        });

        Resident::query()->orderBy('id')->each(function (Resident $resident): void {
            $year = ($resident->registered_at ?? $resident->created_at)?->year ?? now()->year;
            $officialId = sprintf('RES-%d-%06d', $year, $resident->id);

            if ($resident->resident_id !== $officialId) {
                $resident->update(['resident_id' => $officialId]);
            }

            if ($resident->profiled_at === null) {
                $resident->update(['profiled_at' => $resident->registered_at ?? $resident->created_at]);
            }
        });
    }

    public function down(): void
    {
        Schema::table('app_notifications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('related_user_id');
        });

        Schema::table('residents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('profiled_by_user_id');
            $table->dropColumn('profiled_at');
        });
    }
};
