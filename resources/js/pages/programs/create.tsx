import { Head } from '@inertiajs/react';
import { ProgramForm } from '@/components/program-form';
import { dashboard } from '@/routes';
import type { Barangay, VulnerabilitySector } from '@/types';

export default function ProgramCreate({
    sectors,
    barangays,
}: {
    sectors: VulnerabilitySector[];
    barangays: Barangay[];
}) {
    return (
        <>
            <Head title="New Program" />
            <div className="mx-auto w-full max-w-4xl flex-1 p-4">
                <div className="mb-4">
                    <h1 className="text-xl font-semibold tracking-tight">New Program</h1>
                    <p className="text-sm text-muted-foreground">
                        Publish a social service program and target the vulnerable sectors it serves.
                    </p>
                </div>
                <ProgramForm
                    mode="create"
                    action="/programs"
                    sectors={sectors}
                    barangays={barangays}
                    submitLabel="Publish Program"
                />
            </div>
        </>
    );
}

ProgramCreate.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Programs', href: '/programs' },
        { title: 'New', href: '/programs/create' },
    ],
};
