import { Head } from '@inertiajs/react';
import { HouseholdForm } from '@/components/household-form';
import type { HouseholdRecord } from '@/components/household-form';
import { dashboard } from '@/routes';

type Zone = { id: number; zone_name: string };

export default function HouseholdEdit({ household, zones }: { household: HouseholdRecord & { id: number }; zones: Zone[] }) {
    const name = household.household_number ?? `Household #${household.id}`;

    return (
        <>
            <Head title={`Edit ${name}`} />
            <div className="mx-auto w-full max-w-4xl px-4 pt-4">
                <h1 className="text-xl font-semibold tracking-tight">Edit {name}</h1>
                <p className="text-sm text-muted-foreground">Correct the household's details. The Activity Log records what changed and who changed it.</p>
            </div>
            <HouseholdForm household={household} zones={zones} submitLabel="Save changes" cancelHref={`/households/${household.id}`} />
        </>
    );
}

HouseholdEdit.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Households', href: '/households' },
        { title: 'Edit', href: '#' },
    ],
};
