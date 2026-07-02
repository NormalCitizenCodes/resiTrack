<?php

namespace Database\Factories;

use App\Models\Barangay;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Barangay>
 */
class BarangayFactory extends Factory
{
    protected $model = Barangay::class;

    public function definition(): array
    {
        return [
            'name' => 'Barangay '.fake()->unique()->numberBetween(1, 80),
            'city_municipality' => 'Cagayan de Oro City',
            'province' => 'Misamis Oriental',
            'region' => 'Region X (Northern Mindanao)',
        ];
    }
}
