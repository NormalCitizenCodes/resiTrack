import { Head } from '@inertiajs/react';
import { HouseholdForm } from '@/components/household-form';
import type { AddressDefaults } from '@/components/household-form';
import { dashboard } from '@/routes';

type Zone = { id: number; zone_name: string };

export default function HouseholdCreate({ zones, addressDefaults }: { zones: Zone[]; addressDefaults?: AddressDefaults | null }) {
    return (
        <>
            <Head title="Register Household" />
            <div className="mx-auto w-full max-w-4xl px-4 pt-4">
                <h1 className="text-xl font-semibold tracking-tight">Register Household (RBI Form A)</h1>
                <p className="text-sm text-muted-foreground">Record a household in the Record of Barangay Inhabitants.</p>
            </div>
            <HouseholdForm zones={zones} addressDefaults={addressDefaults} submitLabel="Save Household" cancelHref="/households" />
        </>
    );
}

HouseholdCreate.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Households', href: '/households' },
        { title: 'Register', href: '/households/create' },
    ],
};
