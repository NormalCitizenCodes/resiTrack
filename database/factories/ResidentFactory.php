<?php

namespace Database\Factories;

use App\Models\Barangay;
use App\Models\Resident;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Resident>
 */
class ResidentFactory extends Factory
{
    protected $model = Resident::class;

    public function definition(): array
    {
        $sex = fake()->randomElement(['male', 'female']);

        return [
            'barangay_id' => Barangay::factory(),
            'last_name' => fake()->lastName(),
            'first_name' => fake()->firstName($sex === 'male' ? 'male' : 'female'),
            'middle_name' => fake()->optional()->lastName(),
            'date_of_birth' => fake()->dateTimeBetween('-85 years', '-5 years')->format('Y-m-d'),
            'place_of_birth' => 'Cagayan de Oro City',
            'sex' => $sex,
            'civil_status' => fake()->randomElement(['single', 'married', 'widowed', 'separated']),
            'religion' => fake()->randomElement(['Roman Catholic', 'Islam', 'Iglesia ni Cristo', 'Protestant']),
            'citizenship' => 'Filipino',
            'contact_number' => '09'.fake()->numerify('#########'),
            'email' => fake()->optional()->safeEmail(),
            'occupation' => fake()->optional()->jobTitle(),
            'employment_status' => fake()->randomElement(['employed', 'unemployed', 'self_employed']),
            'education_level' => fake()->randomElement(['elementary', 'highschool', 'college', 'vocational', 'none']),
            'education_status' => fake()->randomElement(['enrolled', 'not_enrolled', 'graduated']),
            'monthly_income' => fake()->optional()->numberBetween(0, 25000),
            'is_pwd' => false,
            'is_solo_parent' => false,
            'is_pregnant' => false,
            'is_active' => true,
            'registered_at' => now(),
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (Resident $resident) {
            if (blank($resident->resident_id)) {
                $resident->assignOfficialId();
            }
        });
    }

    public function senior(): static
    {
        return $this->state(fn () => [
            'date_of_birth' => fake()->dateTimeBetween('-85 years', '-61 years')->format('Y-m-d'),
        ]);
    }

    public function pwd(): static
    {
        return $this->state(fn () => ['is_pwd' => true]);
    }

    public function osy(): static
    {
        return $this->state(fn () => [
            'date_of_birth' => fake()->dateTimeBetween('-24 years', '-15 years')->format('Y-m-d'),
            'education_status' => 'not_enrolled',
        ]);
    }

    public function soloParent(): static
    {
        return $this->state(fn () => [
            'is_solo_parent' => true,
            'civil_status' => fake()->randomElement(['widowed', 'separated', 'single']),
        ]);
    }

    public function pregnant(): static
    {
        return $this->state(fn () => [
            'sex' => 'female',
            'is_pregnant' => true,
            'pregnancy_expected_month' => now()->startOfMonth()->addMonths(3)->toDateString(),
            'pregnancy_source' => 'staff',
            'date_of_birth' => fake()->dateTimeBetween('-44 years', '-18 years')->format('Y-m-d'),
        ]);
    }
}
