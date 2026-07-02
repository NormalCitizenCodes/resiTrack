import { Head } from '@inertiajs/react';
import { ProgramForm } from '@/components/program-form';
import { dashboard } from '@/routes';
import type { Barangay, Program, VulnerabilitySector } from '@/types';

export default function ProgramEdit({
    program,
    sectors,
    barangays,
}: {
    program: Program;
    sectors: VulnerabilitySector[];
    barangays: Barangay[];
}) {
    return (
        <>
            <Head title={`Edit ${program.title}`} />
            <div className="mx-auto w-full max-w-4xl flex-1 p-4">
                <div className="mb-4">
                    <h1 className="text-xl font-semibold tracking-tight">Edit Program</h1>
                    <p className="text-sm text-muted-foreground">Update the details of “{program.title}”.</p>
                </div>
                <ProgramForm
                    mode="edit"
                    action={`/programs/${program.id}`}
                    sectors={sectors}
                    barangays={barangays}
                    program={program}
                    submitLabel="Save Changes"
                />
            </div>
        </>
    );
}

ProgramEdit.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Programs', href: '/programs' },
        { title: 'Edit', href: '#' },
    ],
};
