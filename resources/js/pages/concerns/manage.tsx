import { Head, Link, useForm } from '@inertiajs/react';
import { MapPin, MessageSquareWarning, Phone } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { DataPagination } from '@/components/data-pagination';
import InputError from '@/components/input-error';
import { CONCERN_TONE, StatusPill } from '@/components/status-pill';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRelativeDate } from '@/hooks/use-relative-date';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { Paginated } from '@/types';

type Concern = {
    id: number;
    reference_no: string;
    category: string;
    description: string;
    location: string | null;
    status: string;
    response: string | null;
    created_at: string;
    resident: { id: number; resident_id: string | null; full_name: string; contact_number: string | null } | null;
    handled_by: { id: number; name: string } | null;
};

const FILTERS = [
    { key: 'active', label: 'Open and in progress' },
    { key: 'open', label: 'New' },
    { key: 'in_progress', label: 'In progress' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'closed', label: 'Closed' },
];

const STATUS_LABEL: Record<string, string> = {
    open: 'New',
    in_progress: 'In progress',
    resolved: 'Resolved',
    closed: 'Closed',
};

function ConcernCard({ concern, categoryLabel }: { concern: Concern; categoryLabel: string }) {
    const formatDate = useRelativeDate();
    const { data, setData, patch, processing, errors, isDirty } = useForm({
        status: concern.status,
        response: concern.response ?? '',
    });

    const save: FormEventHandler = (event) => {
        event.preventDefault();
        patch(`/resident-concerns/${concern.id}`, { preserveScroll: true });
    };

    return (
        <Card className={cn('py-0', concern.status === 'open' && 'border-warning/50')}>
            <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <p className="font-semibold">{categoryLabel}</p>
                        <p className="text-sm">
                            {concern.resident ? (
                                <Link href={`/residents/${concern.resident.id}`} className="font-medium underline-offset-4 hover:underline">
                                    {concern.resident.full_name}
                                </Link>
                            ) : (
                                'Removed resident'
                            )}
                            {concern.resident?.contact_number && (
                                <a href={`tel:${concern.resident.contact_number.replace(/[^0-9+]/g, '')}`} className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                    <Phone className="size-3" aria-hidden="true" /> {concern.resident.contact_number}
                                </a>
                            )}
                        </p>
                    </div>
                    <StatusPill tone={CONCERN_TONE[concern.status] ?? 'waiting'}>{STATUS_LABEL[concern.status] ?? concern.status}</StatusPill>
                </div>

                <p className="text-sm whitespace-pre-line">{concern.description}</p>
                {concern.location && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="size-3.5" aria-hidden="true" /> {concern.location}
                    </p>
                )}
                <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{concern.reference_no}</span> · {formatDate(concern.created_at)}
                    {concern.handled_by && ` · last updated by ${concern.handled_by.name}`}
                </p>

                <form onSubmit={save} className="grid gap-2 rounded-md border bg-muted/30 p-3 sm:grid-cols-[12rem_1fr]">
                    <Select value={data.status} onValueChange={(value) => setData('status', value)}>
                        <SelectTrigger className="w-full bg-card" aria-label="Status">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(STATUS_LABEL).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div>
                        <textarea
                            aria-label="Reply to the resident"
                            rows={2}
                            value={data.response}
                            placeholder="Reply to the resident (required when resolving or closing)"
                            onChange={(event) => setData('response', event.target.value)}
                            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        />
                        <InputError message={errors.response || errors.status} />
                    </div>
                    <div className="sm:col-span-2">
                        <Button type="submit" size="sm" disabled={processing || !isDirty}>
                            Save and notify resident
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export default function ManageConcerns({
    concerns,
    status,
    categoryLabels,
}: {
    concerns: Paginated<Concern>;
    status: string;
    categoryLabels: Record<string, string>;
}) {
    return (
        <>
            <Head title="Resident Reports" />
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Resident Reports</h1>
                    <p className="text-sm text-muted-foreground">
                        Problems and record corrections sent in by residents. Every status change or reply is sent to them as a notification.
                    </p>
                </div>

                <nav aria-label="Filter by status" className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
                    {FILTERS.map((filter) => (
                        <Link
                            key={filter.key}
                            href={`/resident-concerns?status=${filter.key}`}
                            preserveScroll
                            aria-current={status === filter.key ? 'page' : undefined}
                            className={cn(
                                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                                status === filter.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {filter.label}
                        </Link>
                    ))}
                </nav>

                {concerns.data.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                            <MessageSquareWarning className="size-8" aria-hidden="true" />
                            Nothing here.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-2">
                        {concerns.data.map((concern) => (
                            // Keyed on the saved values too, so after a save the form restarts from them.
                            <ConcernCard key={`${concern.id}-${concern.status}-${concern.response ?? ''}`} concern={concern} categoryLabel={categoryLabels[concern.category] ?? concern.category} />
                        ))}
                    </div>
                )}

                <DataPagination meta={concerns} />
            </div>
        </>
    );
}

ManageConcerns.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Resident Reports', href: '/resident-concerns' },
    ],
};
