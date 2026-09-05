import { Head, Link, router } from '@inertiajs/react';
import { ClipboardCheck, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboard } from '@/routes';

type Registration = {
    id: number;
    name: string;
    email: string | null;
    created_at: string;
    barangay?: { id: number; name: string } | null;
};

export default function ResidentRegistrations({
    registrations,
    filters,
}: {
    registrations: Registration[];
    filters: { search?: string };
}) {
    const [search, setSearch] = useState(filters.search ?? '');

    useEffect(() => {
        const handler = setTimeout(() => {
            if (search === (filters.search ?? '')) {
                return;
            }

            router.get(
                '/resident-registrations',
                search ? { search } : {},
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 350);

        return () => clearTimeout(handler);
    }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>
            <Head title="Pending Resident Accounts" />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Pending Resident Accounts</h1>
                    <p className="text-sm text-muted-foreground">
                        Search for the resident who created an online account, verify their identity in person at the Barangay Hall, then complete official profiling.
                    </p>
                </div>

                <div className="relative max-w-md">
                    <Search className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by full name or email…"
                        className="pl-8"
                    />
                </div>

                {registrations.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                            <ClipboardCheck className="size-8" />
                            <p>No pending resident accounts are waiting for verification.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="rounded-xl border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Resident</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {registrations.map((registration) => (
                                    <TableRow key={registration.id}>
                                        <TableCell className="font-medium">{registration.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{registration.email ?? '—'}</TableCell>
                                        <TableCell><Badge variant="outline">Pending Profiling</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button asChild size="sm" variant="outline">
                                                    <Link href={`/resident-registrations/${registration.id}`}>View</Link>
                                                </Button>
                                                <Button asChild size="sm">
                                                    <Link href={`/residents/create?linked_user=${registration.id}`}>Profile</Link>
                                                </Button>
                                            </div>
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
        { title: 'Pending Resident Accounts', href: '/resident-registrations' },
    ],
};
