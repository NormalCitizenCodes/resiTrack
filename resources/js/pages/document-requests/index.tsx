import { Head, Link, router, useForm } from '@inertiajs/react';
import { Check, FileText, PackageCheck, X } from 'lucide-react';
import { useState } from 'react';
import { DataPagination } from '@/components/data-pagination';
import InputError from '@/components/input-error';
import { DOCUMENT_TONE, StatusPill } from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRelativeDate } from '@/hooks/use-relative-date';
import { formatResidentId } from '@/lib/resident-id';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { Paginated } from '@/types';

type Request = {
    id: number;
    reference_no: string;
    type: string;
    purpose: string;
    status: string;
    remarks: string | null;
    created_at: string;
    resident: { id: number; resident_id: string | null; first_name: string; middle_name: string | null; last_name: string; suffix: string | null; full_name: string } | null;
    handled_by: { id: number; name: string } | null;
};

const FILTERS = [
    { key: 'pending', label: 'To prepare' },
    { key: 'ready', label: 'Ready for pickup' },
    { key: 'released', label: 'Released' },
    { key: 'rejected', label: 'Not approved' },
    { key: 'all', label: 'All' },
];

const STATUS_LABEL: Record<string, string> = {
    pending: 'To prepare',
    ready: 'Ready for pickup',
    released: 'Released',
    rejected: 'Not approved',
};

function RequestCard({ request, typeLabel }: { request: Request; typeLabel: string }) {
    const [rejecting, setRejecting] = useState(false);
    const form = useForm({ action: '', remarks: '' });
    const formatDate = useRelativeDate();

    const act = (action: 'ready' | 'released') => {
        router.patch(`/document-requests/${request.id}`, { action }, { preserveScroll: true });
    };

    const reject = (event: React.FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({ ...data, action: 'rejected' }));
        form.patch(`/document-requests/${request.id}`, { preserveScroll: true, onSuccess: () => setRejecting(false) });
    };

    return (
        <Card className="py-0">
            <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="font-semibold">{typeLabel}</p>
                        <p className="text-sm">
                            {request.resident ? (
                                <Link href={`/residents/${request.resident.id}`} className="font-medium underline-offset-4 hover:underline">
                                    {request.resident.full_name}
                                </Link>
                            ) : (
                                'Removed resident'
                            )}
                            {request.resident?.resident_id && <span className="ml-2 font-mono text-xs text-muted-foreground">{formatResidentId(request.resident.resident_id)}</span>}
                        </p>
                    </div>
                    <StatusPill tone={DOCUMENT_TONE[request.status] ?? 'waiting'}>{STATUS_LABEL[request.status] ?? request.status}</StatusPill>
                </div>

                <p className="text-sm">
                    <span className="text-muted-foreground">Purpose:</span> {request.purpose}
                </p>
                {request.remarks && <p className="rounded-md bg-muted px-3 py-2 text-sm">{request.remarks}</p>}

                <div className="flex flex-wrap items-center gap-2">
                    <p className="mr-auto text-xs text-muted-foreground">
                        <span className="font-mono">{request.reference_no}</span> · {formatDate(request.created_at)}
                        {request.handled_by && ` · by ${request.handled_by.name}`}
                    </p>
                    {request.status === 'pending' && (
                        <Button size="sm" onClick={() => act('ready')}>
                            <Check className="size-4" /> Mark ready for pickup
                        </Button>
                    )}
                    {request.status === 'ready' && (
                        <Button size="sm" onClick={() => act('released')}>
                            <PackageCheck className="size-4" /> Mark released
                        </Button>
                    )}
                    {(request.status === 'pending' || request.status === 'ready') && !rejecting && (
                        <Button size="sm" variant="ghost" onClick={() => setRejecting(true)}>
                            <X className="size-4" /> Decline
                        </Button>
                    )}
                </div>

                {rejecting && (
                    <form onSubmit={reject} className="space-y-2 rounded-md border p-3">
                        <label htmlFor={`remarks-${request.id}`} className="text-sm font-medium">
                            Reason (the resident will see this)
                        </label>
                        <textarea
                            id={`remarks-${request.id}`}
                            rows={2}
                            value={form.data.remarks}
                            onChange={(event) => form.setData('remarks', event.target.value)}
                            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        />
                        <InputError message={form.errors.remarks} />
                        <div className="flex gap-2">
                            <Button type="submit" size="sm" variant="destructive" disabled={form.processing}>
                                Decline request
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setRejecting(false)}>
                                Keep it
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}

export default function DocumentRequests({
    requests,
    status,
    counts,
    typeLabels,
}: {
    requests: Paginated<Request>;
    status: string;
    counts: Record<string, number>;
    typeLabels: Record<string, string>;
}) {
    return (
        <>
            <Head title="Certificate Requests" />
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Certificate Requests</h1>
                    <p className="text-sm text-muted-foreground">
                        Residents request certificates online. Prepare and sign the paper, mark it ready so they are notified, and mark it
                        released once picked up.
                    </p>
                </div>

                <nav aria-label="Filter by status" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
                    {FILTERS.map((filter) => (
                        <Link
                            key={filter.key}
                            href={`/document-requests?status=${filter.key}`}
                            preserveScroll
                            aria-current={status === filter.key ? 'page' : undefined}
                            className={cn(
                                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                                status === filter.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {filter.label}
                            {filter.key !== 'all' && (counts[filter.key] ?? 0) > 0 && (
                                <span className="rounded-full bg-primary/10 px-1.5 text-xs text-primary tabular-nums">{counts[filter.key]}</span>
                            )}
                        </Link>
                    ))}
                </nav>

                {requests.data.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                            <FileText className="size-8" aria-hidden="true" />
                            Nothing here.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {requests.data.map((request) => (
                            <RequestCard key={request.id} request={request} typeLabel={typeLabels[request.type] ?? request.type} />
                        ))}
                    </div>
                )}

                <DataPagination meta={requests} />
            </div>
        </>
    );
}

DocumentRequests.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Certificate Requests', href: '/document-requests' },
    ],
};
