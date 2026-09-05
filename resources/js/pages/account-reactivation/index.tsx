import { Head, router } from '@inertiajs/react';
import { Check, Clock3, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { dashboard } from '@/routes';

type ReactivationRequest = { id: number; status: 'pending' | 'approved' | 'rejected'; reason: string; admin_remarks: string | null; created_at: string; user: { name: string; email: string | null; deactivated_at: string | null; deletion_requests?: { reason: string; status: string; reviewed_at: string | null }[] }; resident: { resident_id: string; first_name: string; last_name: string } | null; barangay: { name: string } | null };

export default function ReactivationRequests({ requests, highlight }: { requests: ReactivationRequest[]; highlight?: number | null }) {
    const [remarks, setRemarks] = useState<Record<number, string>>({});
    const review = (request: ReactivationRequest, action: 'approve' | 'reject') => {
        if (action === 'approve' && !window.confirm(`Reactivate ${request.user.name}'s Resident Account? This will restore the resident's ability to log in.`)) return;
        if (action === 'reject' && !remarks[request.id]?.trim()) {
            window.alert('Admin remarks are required when rejecting a reactivation request.');
            return;
        }
        router.post(`/account-reactivation-requests/${request.id}/${action}`, { admin_remarks: remarks[request.id] ?? '' }, { preserveScroll: true });
    };

    return <><Head title="Account Reactivation Requests" /><div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Administrator review</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Account Reactivation Requests</h1><p className="mt-1 text-sm text-muted-foreground">Verify the resident's identity before restoring account access.</p></div>{requests.length === 0 ? <Card><CardContent className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground"><Clock3 className="size-8" /><p>No reactivation requests yet.</p></CardContent></Card> : requests.map((request) => <Card key={request.id} id={`reactivation-request-${request.id}`} className={request.id === highlight ? 'border-primary ring-2 ring-primary/30' : undefined}><CardContent className="space-y-4 p-5"><div className="flex flex-col gap-3 md:flex-row md:justify-between"><div className="space-y-1"><p className="font-semibold">{request.resident ? `${request.resident.first_name} ${request.resident.last_name}` : request.user.name}</p><p className="text-sm text-muted-foreground">{request.resident?.resident_id ?? 'No resident record'} · {request.user.email ?? 'No email'} · {request.barangay?.name ?? '—'}</p><p className="text-xs text-muted-foreground">Submitted {new Date(request.created_at).toLocaleString()} · Deactivated {request.user.deactivated_at ? new Date(request.user.deactivated_at).toLocaleString() : '—'}</p></div><Badge variant={request.status === 'pending' ? 'secondary' : request.status === 'rejected' ? 'destructive' : 'outline'}>{request.status}</Badge></div><div className="rounded-md bg-muted/50 p-3 text-sm"><p className="font-medium">Identity Verification</p><p className="mt-1 text-muted-foreground">Please verify the resident's identity before approving account reactivation.</p><p className="mt-3 font-medium">Reason</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{request.reason}</p>{request.user.deletion_requests?.find((deletion) => deletion.status === 'approved') && <><p className="mt-3 font-medium">Original Deactivation Reason</p><p className="mt-1 whitespace-pre-wrap text-muted-foreground">{request.user.deletion_requests.find((deletion) => deletion.status === 'approved')?.reason}</p></>}</div>{request.status === 'pending' && <><textarea value={remarks[request.id] ?? ''} onChange={(event) => setRemarks({ ...remarks, [request.id]: event.target.value })} rows={3} maxLength={2000} placeholder="Admin remarks or verification notes. Required when rejecting." className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" /><div className="flex flex-wrap gap-2"><Button onClick={() => review(request, 'approve')}><Check className="size-4" />Approve Reactivation</Button><Button variant="outline" onClick={() => review(request, 'reject')}><X className="size-4" />Reject Request</Button></div></>}{request.admin_remarks && request.status !== 'pending' && <p className="text-sm text-muted-foreground">Remarks: {request.admin_remarks}</p>}</CardContent></Card>)}</div></>;
}

ReactivationRequests.layout = { breadcrumbs: [{ title: 'Dashboard', href: dashboard() }, { title: 'Account Reactivation Requests', href: '/account-reactivation-requests' }] };
