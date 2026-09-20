import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes';

type Registration = {
    id: number;
    name: string;
    email: string | null;
    created_at: string;
    barangay?: { id: number; name: string } | null;
};

export default function ResidentRegistrationShow({ registration }: { registration: Registration }) {
    return (
        <>
            <Head title={registration.name} />
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">{registration.name}</h1>
                        <p className="text-sm text-muted-foreground">Online resident account awaiting in-person verification.</p>
                    </div>
                    <Badge variant="outline">Pending Profiling</Badge>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Account details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                        <div>
                            <dt className="text-xs text-muted-foreground">Full name</dt>
                            <dd className="text-sm font-medium">{registration.name}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-muted-foreground">Email</dt>
                            <dd className="text-sm font-medium">{registration.email ?? '-'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-muted-foreground">Barangay</dt>
                            <dd className="text-sm font-medium">{registration.barangay?.name ?? '-'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-muted-foreground">Account created</dt>
                            <dd className="text-sm font-medium">{new Date(registration.created_at).toLocaleString()}</dd>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="space-y-3 py-6 text-sm">
                        <p>
                            Verify that this person is the resident who created the account before starting official profiling. Do not generate a Resident ID until profiling is complete.
                        </p>
                        <div className="flex gap-2">
                            <Button asChild variant="outline">
                                <Link href="/resident-registrations">Back to pending accounts</Link>
                            </Button>
                            <Button asChild>
                                <Link href={`/residents/create?linked_user=${registration.id}`}>Start official profiling</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

ResidentRegistrationShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Pending Resident Accounts', href: '/resident-registrations' },
        { title: 'View', href: '#' },
    ],
};
