import { Head, router } from '@inertiajs/react';
import { Check, Clock3, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { dashboard } from '@/routes';

type RecoveryRequest = {
    id: number;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    user: { name: string; email: string };
    resident?: { first_name: string; last_name: string } | null;
    barangay?: { name: string } | null;
};

export default function AccountRecovery({ recoveryRequests, highlight }: { recoveryRequests: RecoveryRequest[]; highlight?: number | null }) {
    const review = (request: RecoveryRequest, action: 'approve' | 'reject') => {
        router.post(`/account-recovery/${request.id}/${action}`, {}, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Account Recovery Requests" />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">BHW dashboard</p>
                    <h1 className="mt-2 text-2xl font-semibold tracking-tight">Account Recovery Requests</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Verify the resident in person before approving password recovery.</p>
                </div>
                {recoveryRequests.length === 0 ? (
                    <Card><CardContent className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground"><Clock3 className="size-8" /><p>No recovery requests yet.</p></CardContent></Card>
                ) : (
                    <div className="grid gap-3">
                        {recoveryRequests.map((request) => (
                            <Card key={request.id} id={`recovery-request-${request.id}`} className={request.id === highlight ? 'border-primary ring-2 ring-primary/30' : undefined}>
                                <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                                    <div className="space-y-1">
                                        <p className="font-semibold">{request.resident ? `${request.resident.first_name} ${request.resident.last_name}` : request.user.name}</p>
                                        <p className="text-sm text-muted-foreground">{request.user.email}</p>
                                        <p className="text-xs text-muted-foreground">Requested {new Date(request.created_at).toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant={request.status === 'pending' ? 'secondary' : 'outline'}>{request.status}</Badge>
                                        {request.status === 'pending' && <><Button size="sm" onClick={() => review(request, 'approve')}><Check className="size-4" />Approve Recovery</Button><Button size="sm" variant="outline" onClick={() => review(request, 'reject')}><X className="size-4" />Reject Request</Button></>}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

AccountRecovery.layout = { breadcrumbs: [{ title: 'Dashboard', href: dashboard() }, { title: 'Account Recovery', href: '/account-recovery' }] };
