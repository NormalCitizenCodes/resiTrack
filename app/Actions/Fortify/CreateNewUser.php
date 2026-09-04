<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            ...$this->profileRules(),
            'barangay_id' => ['required', 'integer', 'exists:barangays,id'],
            'password' => $this->passwordRules(),
        ])->validate();

        $user = User::create([
            'name' => $input['name'],
            'email' => $input['email'],
            'password' => $input['password'],
            'barangay_id' => $input['barangay_id'],
        ]);

        $user->update([
            'registration_id' => 'REG-'.str_pad((string) $user->id, 6, '0', STR_PAD_LEFT),
        ]);

        NotificationService::notifyNewResidentRegistration($user);

        return $user;
    }
}
