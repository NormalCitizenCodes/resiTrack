<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProgramRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null
            && $this->user()->hasRole('partner_agency', 'super_admin');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $user = $this->user();

        return [
            'title' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:2000'],
            'eligibility_criteria' => ['nullable', 'string', 'max:2000'],
            'slots_available' => ['required', 'integer', 'min:0', 'max:100000'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['required', Rule::in(['active', 'inactive', 'expired'])],
            'barangay_id' => $user?->isSuperAdmin()
                ? ['nullable', 'integer', 'exists:barangays,id']
                : ($user?->role === 'partner_agency'
                    ? ($user->barangay_id
                        ? ['nullable', 'integer', Rule::in([$user->barangay_id])]
                        : ['nullable', 'integer', 'exists:barangays,id'])
                    : ['nullable', 'integer', 'exists:barangays,id']),
            'sector_ids' => ['array'],
            'sector_ids.*' => ['integer', 'exists:vulnerability_sectors,id'],
        ];
    }
}
