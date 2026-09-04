<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreResidentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null && $this->user()->isBarangayStaff();
    }

    /**
     * Data validation rules enforced at the point of entry (format, range and
     * cross-field consistency checks) so incomplete/inconsistent records are
     * rejected before they reach the database.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $emailRules = ['nullable', 'email', 'max:150'];
        if ($this->boolean('create_account')) {
            $emailRules[] = Rule::unique('users', 'email');
        }

        return [
            'household_id' => ['nullable', 'integer', 'exists:households,id'],
            'create_account' => ['boolean'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed', 'required_if:create_account,1'],
            'philsys_card_no' => ['nullable', 'string', 'max:32', 'regex:/^[0-9\- ]+$/'],
            'last_name' => ['required', 'string', 'max:100'],
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'suffix' => ['nullable', 'string', 'max:20'],
            'date_of_birth' => ['required', 'date', 'before_or_equal:today', 'after:1900-01-01'],
            'place_of_birth' => ['nullable', 'string', 'max:150'],
            'sex' => ['required', Rule::in(['male', 'female'])],
            'civil_status' => ['required', Rule::in(['single', 'married', 'widowed', 'separated'])],
            'religion' => ['nullable', 'string', 'max:100'],
            'citizenship' => ['nullable', 'string', 'max:100'],
            'contact_number' => ['nullable', 'string', 'max:20', 'regex:/^[0-9+\- ]+$/'],
            'email' => $emailRules,
            'address' => ['nullable', 'string', 'max:255'],
            'occupation' => ['nullable', 'string', 'max:150'],
            'employment_status' => ['nullable', Rule::in(['employed', 'unemployed', 'self_employed'])],
            'education_level' => ['nullable', Rule::in(['elementary', 'highschool', 'college', 'vocational', 'none'])],
            'education_status' => ['nullable', Rule::in(['enrolled', 'not_enrolled', 'graduated'])],
            'monthly_income' => ['nullable', 'numeric', 'min:0', 'max:9999999'],

            // Manually-certified vulnerability flags (BHW input).
            'is_pwd' => ['boolean'],
            'is_solo_parent' => ['boolean'],
            'is_pregnant' => ['boolean'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'is_pwd' => $this->boolean('is_pwd'),
            'is_solo_parent' => $this->boolean('is_solo_parent'),
            'is_pregnant' => $this->boolean('is_pregnant'),
        ]);
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Cross-field consistency: only female residents can be marked pregnant.
            if ($this->boolean('is_pregnant') && $this->input('sex') !== 'female') {
                $validator->errors()->add('is_pregnant', 'Only female residents can be marked as pregnant.');
            }
        });
    }
}
