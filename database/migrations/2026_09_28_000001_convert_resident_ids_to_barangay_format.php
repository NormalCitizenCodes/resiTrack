<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Resident IDs change from RES-2026-000123 (a system-wide number) to RES0182600045:
 * RES, the barangay's three-digit code, the two-digit year, and a five-digit number
 * counted within the barangay in registration order. See Resident::nextOfficialId.
 *
 * The person, the account, the household and every other record are untouched; only
 * the public ID text changes. Anyone whose ID had been handed out will be told it
 * changed, and printed ID cards (whose QR holds the old ID) need reprinting.
 */
return new class extends Migration
{
    public function up(): void
    {
        $codes = DB::table('barangays')->get(['id', 'psgc_code'])->mapWithKeys(function ($barangay) {
            $psgc = (string) $barangay->psgc_code;

            return [$barangay->id => strlen($psgc) >= 3 ? substr($psgc, -3) : sprintf('%03d', $barangay->id % 1000)];
        });

        $next = [];

        DB::transaction(function () use ($codes, &$next) {
            DB::table('residents')
                ->whereNotNull('resident_id')
                ->where('resident_id', 'like', 'RES-%')
                ->select(['id', 'barangay_id', 'registered_at', 'created_at'])
                ->chunkById(500, function ($residents) use ($codes, &$next) {
                    foreach ($residents as $resident) {
                        $code = $codes[$resident->barangay_id] ?? sprintf('%03d', $resident->barangay_id % 1000);
                        $next[$code] = ($next[$code] ?? 0) + 1;
                        $year = Carbon::parse($resident->registered_at ?? $resident->created_at ?? now())->format('y');

                        DB::table('residents')->where('id', $resident->id)->update([
                            'resident_id' => sprintf('RES%s%s%05d', $code, $year, $next[$code]),
                        ]);
                    }
                });
        });
    }

    public function down(): void
    {
        DB::table('residents')
            ->where('resident_id', 'like', 'RES%')
            ->where('resident_id', 'not like', 'RES-%')
            ->select(['id', 'registered_at', 'created_at'])
            ->chunkById(500, function ($residents) {
                foreach ($residents as $resident) {
                    DB::table('residents')->where('id', $resident->id)->update([
                        'resident_id' => sprintf('RES-%d-%06d', Carbon::parse($resident->registered_at ?? $resident->created_at ?? now())->year, $resident->id),
                    ]);
                }
            });
    }
};
