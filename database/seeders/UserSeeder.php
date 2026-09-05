<?php

namespace Database\Seeders;

use App\Models\Barangay;
use App\Models\PartnerAgency;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $barangay = Barangay::where('name', 'Barangay 22')->first();
        $barangay23 = Barangay::where('name', 'Barangay 23')->first();
        $dswd = PartnerAgency::where('agency_type', 'DSWD')->first();

        $users = [
            [
                'name' => 'System Administrator',
                'email' => 'superadmin@resitrack.test',
                'role' => User::ROLE_SUPER_ADMIN,
                'first_name' => 'System',
                'last_name' => 'Administrator',
            ],
            [
                'name' => 'Barangay Secretary',
                'email' => 'secretary@resitrack.test',
                'role' => User::ROLE_BARANGAY_ADMIN,
                'first_name' => 'Maria',
                'last_name' => 'Santos',
                'barangay_id' => $barangay?->id,
            ],
            [
                'name' => 'Health Worker',
                'email' => 'bhw@resitrack.test',
                'role' => User::ROLE_BHW,
                'first_name' => 'Josefa',
                'last_name' => 'Reyes',
                'barangay_id' => $barangay?->id,
            ],
            [
                'name' => 'Barangay 23 Secretary',
                'email' => 'secretary.b23@resitrack.test',
                'role' => User::ROLE_BARANGAY_ADMIN,
                'first_name' => 'Ana',
                'last_name' => 'Garcia',
                'barangay_id' => $barangay23?->id,
            ],
            [
                'name' => 'Barangay 23 Health Worker',
                'email' => 'bhw.b23@resitrack.test',
                'role' => User::ROLE_BHW,
                'first_name' => 'Pedro',
                'last_name' => 'Garcia',
                'barangay_id' => $barangay23?->id,
            ],
            [
                'name' => 'DSWD Officer',
                'email' => 'agency@resitrack.test',
                'role' => User::ROLE_PARTNER_AGENCY,
                'first_name' => 'Ramon',
                'last_name' => 'Cruz',
                'agency_id' => $dswd?->id,
            ],
        ];

        foreach ($users as $data) {
            User::updateOrCreate(
                ['email' => $data['email']],
                [
                    ...$data,
                    'password' => Hash::make($data['email']),
                    'email_verified_at' => now(),
                    'is_active' => true,
                ]
            );
        }
    }
}
