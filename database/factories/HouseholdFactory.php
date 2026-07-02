<?php

namespace Database\Factories;

use App\Models\Barangay;
use App\Models\Household;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Household>
 */
class HouseholdFactory extends Factory
{
    protected $model = Household::class;

    public function definition(): array
    {
        return [
            'barangay_id' => Barangay::factory(),
            'household_number' => 'HH-'.fake()->unique()->numberBetween(1000, 9999),
            'address' => fake()->buildingNumber().' '.fake()->streetName().', Barangay 22',
            'house_materials' => fake()->randomElement(['concrete', 'semi-concrete', 'light materials']),
            'house_ownership' => fake()->randomElement(['owned', 'rented', 'shared']),
            'water_source' => fake()->randomElement(['pipe', 'well', 'others']),
            'electricity_source' => fake()->randomElement(['metered', 'shared', 'none']),
            'waste_management' => fake()->randomElement(['collected', 'burned', 'others']),
            'toilet_facility' => fake()->randomElement(['private', 'shared', 'none']),
            'member_count' => fake()->numberBetween(1, 8),
            'monthly_income' => fake()->numberBetween(3000, 30000),
            'is_4ps_beneficiary' => fake()->boolean(30),
        ];
    }
}
