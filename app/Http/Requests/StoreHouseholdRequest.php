<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\HasStructuredAddresses;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreHouseholdRequest extends FormRequest
{
    use HasStructuredAddresses;

    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->isBarangayStaff();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'zone_id' => ['nullable', 'integer', 'exists:barangay_zones,id'],
            'household_number' => ['nullable', 'string', 'max:50'],
            'address' => ['required_without:address_barangay_code', 'nullable', 'string', 'max:255'],
            'house_materials' => ['nullable', 'string', 'max:100'],
            'house_ownership' => ['nullable', Rule::in(['owned', 'rented', 'shared'])],
            'water_source' => ['nullable', Rule::in(['pipe', 'well', 'others'])],
            'electricity_source' => ['nullable', Rule::in(['metered', 'shared', 'none'])],
            'waste_management' => ['nullable', Rule::in(['collected', 'burned', 'others'])],
            'toilet_facility' => ['nullable', Rule::in(['private', 'shared', 'none'])],
            'member_count' => ['nullable', 'integer', 'min:0', 'max:50'],
            'monthly_income' => ['nullable', 'numeric', 'min:0', 'max:9999999'],
            'is_4ps_beneficiary' => ['boolean'],

            ...$this->addressRules(),
        ];
    }

    protected function addressParts(): array
    {
        return ['address' => ['column' => 'address', 'street' => true, 'barangay' => true]];
    }

    public function withValidator($validator): void
    {
        $this->validateAddressChains($validator);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['address.required_without' => 'Pick the household address from the lists.'];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'is_4ps_beneficiary' => $this->boolean('is_4ps_beneficiary'),
        ]);
    }
}
