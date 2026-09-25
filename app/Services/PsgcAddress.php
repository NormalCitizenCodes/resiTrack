<?php

namespace App\Services;

use App\Models\Barangay;
use App\Models\PsgcLocation;

/**
 * Checks and formats addresses picked from the PSGC lists. The readable line
 * is always built here from the codes, never accepted from the browser, so a
 * stored address cannot disagree with the places it points at.
 */
class PsgcAddress
{
    /**
     * @param  array{region?: ?string, province?: ?string, city?: ?string, barangay?: ?string}  $codes
     */
    public function isPicked(array $codes): bool
    {
        return filled($codes['region'] ?? null) || filled($codes['province'] ?? null) || filled($codes['city'] ?? null) || filled($codes['barangay'] ?? null);
    }

    /**
     * Returns an error message when the chain is incomplete or the places do
     * not belong together (a barangay outside the chosen city, and so on),
     * null when it is fine or nothing was picked.
     *
     * @param  array{region?: ?string, province?: ?string, city?: ?string, barangay?: ?string}  $codes
     */
    public function validate(array $codes, bool $needsBarangay): ?string
    {
        if (! $this->isPicked($codes)) {
            return null;
        }

        $region = $codes['region'] ?? null;
        $province = $codes['province'] ?? null;
        $city = $codes['city'] ?? null;
        $barangay = $codes['barangay'] ?? null;

        if (! filled($region) || ! filled($city)) {
            return 'Pick at least a region and a city or municipality.';
        }

        if ($needsBarangay && ! filled($barangay)) {
            return 'Pick a barangay.';
        }

        $places = PsgcLocation::query()->whereIn('code', array_filter([$region, $province, $city, $barangay], 'filled'))->get()->keyBy('code');

        $mismatch = 'That combination of places does not exist. Please pick them again.';
        $cityParent = filled($province) ? $province : $region;

        if (! $this->isPlace($places->get($region), PsgcLocation::REGION)
            || (filled($province) && ! $this->isPlace($places->get($province), PsgcLocation::PROVINCE, $region))
            || ! $this->isPlace($places->get($city), PsgcLocation::CITY, $cityParent)
            || (filled($barangay) && ! $this->isPlace($places->get($barangay), PsgcLocation::BARANGAY, $city))) {
            return $mismatch;
        }

        return null;
    }

    private function isPlace(?PsgcLocation $place, string $level, ?string $parent = null): bool
    {
        return $place !== null && $place->level === $level && ($parent === null || $place->parent_code === $parent);
    }

    /**
     * "Street, Barangay, City, Province, ZIP" (the region stands in for the
     * province where there is none, as in Metro Manila).
     *
     * @param  array{region?: ?string, province?: ?string, city?: ?string, barangay?: ?string}  $codes
     */
    public function compose(array $codes, ?string $street = null, ?string $zip = null): ?string
    {
        $names = PsgcLocation::query()
            ->whereIn('code', array_filter($codes, 'filled'))
            ->pluck('name', 'code');

        $parts = [
            $street,
            $names[$codes['barangay'] ?? ''] ?? null,
            $names[$codes['city'] ?? ''] ?? null,
            $names[$codes['province'] ?? ''] ?? ($names[$codes['region'] ?? ''] ?? null),
            $zip,
        ];

        $line = collect($parts)->filter(fn ($part) => filled($part))->map(fn ($part) => trim((string) $part))->implode(', ');

        return $line === '' ? null : $line;
    }

    /**
     * The picker's starting point for a staff member: their own barangay's
     * region, province, city and barangay, when the barangay is linked.
     *
     * @return array{region: ?string, province: ?string, city: ?string, barangay: ?string}|null
     */
    public function defaultsFor(?Barangay $barangay): ?array
    {
        if ($barangay === null || ! filled($barangay->psgc_code)) {
            return null;
        }

        $barangayPlace = PsgcLocation::find($barangay->psgc_code);
        $city = $barangayPlace?->parent_code ? PsgcLocation::find($barangayPlace->parent_code) : null;
        $parent = $city?->parent_code ? PsgcLocation::find($city->parent_code) : null;

        if ($barangayPlace === null || $city === null || $parent === null) {
            return null;
        }

        $hasProvince = $parent->level === PsgcLocation::PROVINCE;

        return [
            'region' => $hasProvince ? $parent->parent_code : $parent->code,
            'province' => $hasProvince ? $parent->code : null,
            'city' => $city->code,
            'barangay' => $barangayPlace->code,
        ];
    }
}
