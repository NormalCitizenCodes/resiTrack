import { Head } from '@inertiajs/react';
import { ResidentForm } from '@/components/resident-form';
import { dashboard } from '@/routes';
import type { Household } from '@/types';

export default function ResidentCreate({ households }: { households: Household[] }) {
    return (
        <>
            <Head title="Register Resident" />
            <div className="mx-auto w-full max-w-5xl flex-1 p-4">
                <div className="mb-4">
                    <h1 className="text-xl font-semibold tracking-tight">Register Resident (RBI Form B)</h1>
                    <p className="text-sm text-muted-foreground">
                        Add an individual to the Record of Barangay Inhabitants. Vulnerability sectors are
                        classified automatically on save.
                    </p>
                </div>
                <ResidentForm mode="create" action="/residents" households={households} submitLabel="Save Resident" />
            </div>
        </>
    );
}

ResidentCreate.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Residents', href: '/residents' },
        { title: 'Register', href: '/residents/create' },
    ],
};
