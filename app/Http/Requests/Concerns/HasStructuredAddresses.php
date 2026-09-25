<?php

namespace App\Http\Requests\Concerns;

use App\Services\PsgcAddress;
use Illuminate\Support\ValidatedInput;
use Illuminate\Validation\Validator;

/**
 * Validation and composition for PSGC-picked addresses on a form request.
 *
 * Each address "part" is a prefix that owns four code fields (region,
 * province, city, barangay) and, optionally, a street and zip. The readable
 * text column it feeds is built server-side from the codes.
 */
trait HasStructuredAddresses
{
    /**
     * prefix => [text column it feeds, has street and zip, must reach the barangay]
     *
     * @return array<string, array{column: string, street: bool, barangay: bool}>
     */
    abstract protected function addressParts(): array;

    /**
     * @return array<string, array<int, string>>
     */
    protected function addressRules(): array
    {
        $rules = [];

        foreach ($this->addressParts() as $prefix => $part) {
            foreach (['region', 'province', 'city', 'barangay'] as $level) {
                $rules["{$prefix}_{$level}_code"] = ['nullable', 'string', 'size:9'];
            }

            if ($part['street']) {
                $rules["{$prefix}_street"] = ['nullable', 'string', 'max:150'];
                $rules["{$prefix}_zip"] = ['nullable', 'digits:4'];
            }
        }

        return $rules;
    }

    protected function validateAddressChains(Validator $validator): void
    {
        // In after(): the validator empties its error bag when it starts running.
        $validator->after(function (Validator $validator) {
            $addresses = app(PsgcAddress::class);

            foreach ($this->addressParts() as $prefix => $part) {
                $message = $addresses->validate($this->codesFor($prefix), $part['barangay']);

                if ($message !== null) {
                    $validator->errors()->add("{$prefix}_city_code", $message);
                }
            }
        });
    }

    /**
     * The validated data with each picked address turned into its readable
     * line, overriding whatever text the browser sent for that column.
     *
     * @param  array<int, string>|int|string|null  $key
     */
    public function validated($key = null, $default = null)
    {
        $data = parent::validated();
        $addresses = app(PsgcAddress::class);

        foreach ($this->addressParts() as $prefix => $part) {
            $codes = $this->codesFor($prefix);

            if ($addresses->isPicked($codes)) {
                $data[$part['column']] = $addresses->compose(
                    $codes,
                    $part['street'] ? $this->input("{$prefix}_street") : null,
                    $part['street'] ? $this->input("{$prefix}_zip") : null,
                );
            }
        }

        return $key === null ? $data : data_get($data, $key, $default);
    }

    /**
     * Callers that read through safe() get the composed lines too.
     *
     * @param  array<int, string>|null  $keys
     */
    public function safe(?array $keys = null)
    {
        $input = new ValidatedInput($this->validated());

        return is_array($keys) ? $input->only($keys) : $input;
    }

    /**
     * @return array{region: ?string, province: ?string, city: ?string, barangay: ?string}
     */
    private function codesFor(string $prefix): array
    {
        return [
            'region' => $this->input("{$prefix}_region_code"),
            'province' => $this->input("{$prefix}_province_code"),
            'city' => $this->input("{$prefix}_city_code"),
            'barangay' => $this->input("{$prefix}_barangay_code"),
        ];
    }
}
