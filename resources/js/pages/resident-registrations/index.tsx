import { Head, router } from '@inertiajs/react';
import { ClipboardCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboard } from '@/routes';

type Registration = {
    id: number;
    name: string;
    email: string;
    registration_id: string;
    created_at: string;
    barangay?: { id: number; name: string } | null;
};

export default function ResidentRegistrations({ registrations }: { registrations: Registration[] }) {
    const approve = (registration: Registration) => {
        if (confirm(`Verify ${registration.name} and create the official resident record?`)) {
            router.post(`/resident-registrations/${registration.id}/approve`);
        }
    };

    return (
        <>
            <Head title="Resident Registrations" />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Online Resident Registrations</h1>
                    <p className="text-sm text-muted-foreground">
                        Review residents who registered online. Verify their identity at the Barangay Hall before creating the official profile.
                    </p>
                </div>

                {registrations.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                            <ClipboardCheck className="size-8" />
                            <p>No online registrations are waiting for verification.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="rounded-xl border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Registration ID</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Barangay</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {registrations.map((registration) => (
                                    <TableRow key={registration.id}>
                                        <TableCell className="font-medium">{registration.registration_id}</TableCell>
                                        <TableCell>{registration.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{registration.email}</TableCell>
                                        <TableCell className="text-muted-foreground">{registration.barangay?.name ?? '—'}</TableCell>
                                        <TableCell><Badge variant="outline">Awaiting BHW verification</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button size="sm" onClick={() => approve(registration)}>Verify and complete</Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </>
    );
}

ResidentRegistrations.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Resident Registrations', href: '/resident-registrations' },
    ],
};
