import { Head } from '@inertiajs/react';
import { ResidentForm } from '@/components/resident-form';
import { dashboard } from '@/routes';
import type { Household, Resident } from '@/types';

export default function ResidentEdit({ resident, households }: { resident: Resident; households: Household[] }) {
    return (
        <>
            <Head title={`Edit ${resident.full_name}`} />
            <div className="mx-auto w-full max-w-5xl flex-1 p-4">
                <div className="mb-4">
                    <h1 className="text-xl font-semibold tracking-tight">Edit Resident</h1>
                    <p className="text-sm text-muted-foreground">
                        Update {resident.full_name}. Sectors are re-classified automatically on save.
                    </p>
                </div>
                <ResidentForm
                    mode="edit"
                    action={`/residents/${resident.id}`}
                    households={households}
                    resident={resident}
                    submitLabel="Update Resident"
                />
            </div>
        </>
    );
}

ResidentEdit.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Residents', href: '/residents' },
        { title: 'Edit', href: '#' },
    ],
};
