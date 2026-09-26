import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeftRight, Copy, Users } from 'lucide-react';
import { useState } from 'react';
import { confirmDialog } from '@/components/confirm-dialog';
import { DataPagination } from '@/components/data-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { DuplicateAlert, Paginated, Resident } from '@/types';

type AlertRow = DuplicateAlert & {
    resident_one?: Resident & { barangay?: { name: string } };
    resident_two?: Resident & { barangay?: { name: string } };
    escalated_at: string | null;
    escalation_note: string | null;
    escalator?: { name: string } | null;
};

type Props = {
    alerts: Paginated<AlertRow>;
    counts: { pending: number; escalated: number; resolved: number; dismissed: number };
    filters: { status: string };
};

const MATCH_LABEL: Record<string, string> = {
    philsys: 'Identical PhilSys number',
    name_dob: 'Same name & date of birth',
    name_address: 'Same name & address',
    cross_barangay_transfer: 'Possible cross-barangay transfer',
};

type Person = Resident & { barangay?: { name: string } };

type Cluster = { alerts: AlertRow[]; people: Person[] };

/**
 * Alerts that share a resident are the same story (A matches B, B matches C),
 * so they are shown together. Groups follow the alerts' own order, and only
 * cover the alerts on the current page.
 */
function clusterAlerts(alerts: AlertRow[]): Cluster[] {
    const parent = new Map<number, number>();
    const find = (id: number): number => {
        const up = parent.get(id) ?? id;

        if (up === id) {
            return id;
        }

        const root = find(up);
        parent.set(id, root);

        return root;
    };

    alerts.forEach((alert) => {
        parent.set(find(alert.resident_id_1), find(alert.resident_id_2));
    });

    const groups = new Map<number, Cluster>();

    alerts.forEach((alert) => {
        const root = find(alert.resident_id_1);
        const group = groups.get(root) ?? { alerts: [], people: [] };

        group.alerts.push(alert);

        [alert.resident_one, alert.resident_two].forEach((person) => {
            if (person && !group.people.some((known) => known.id === person.id)) {
                group.people.push(person);
            }
        });

        groups.set(root, group);
    });

    return [...groups.values()];
}

/** Marks a value that differs from the record it is being compared with. */
function Field({ label, value, differs }: { label: string; value: string; differs: boolean }) {
    return (
        <div>
            {label}:{' '}
            <span className={cn(differs && 'rounded bg-warning/25 px-1 font-medium text-foreground')}>{value}</span>
        </div>
    );
}

function ResidentCard({
    resident,
    other,
    onKeep,
    canAct,
}: {
    resident?: Person;
    other?: Person;
    onKeep: () => void;
    canAct: boolean;
}) {
    const viewer = usePage().props.auth.user;

    if (!resident) {
        return <div className="flex-1 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Record unavailable</div>;
    }

    const dob = resident.date_of_birth?.substring(0, 10) ?? '-';
    const philsys = resident.philsys_card_no ?? '-';
    const barangay = resident.barangay?.name ?? '-';
    const nameDiffers = !!other && other.full_name !== resident.full_name;

    // A record from another barangay cannot be opened (the server answers 403), so it is not offered as a link.
    const canOpen = viewer?.role === 'super_admin' || (viewer?.barangay_id != null && viewer.barangay_id === resident.barangay_id);

    return (
        <div className="flex-1 rounded-lg border p-3">
            <div className="flex items-center justify-between">
                {canOpen ? (
                    <Link
                        href={`/residents/${resident.id}`}
                        className={cn('font-medium hover:underline', nameDiffers && 'rounded bg-warning/25 px-1')}
                    >
                        {resident.full_name}
                    </Link>
                ) : (
                    <span
                        className={cn('font-medium', nameDiffers && 'rounded bg-warning/25 px-1')}
                        title={`This record belongs to ${barangay}. Only their barangay can open it.`}
                    >
                        {resident.full_name}
                    </span>
                )}
                {!resident.is_active && <Badge variant="outline">Inactive</Badge>}
            </div>
            <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                <Field label="DOB" value={dob} differs={!!other && (other.date_of_birth?.substring(0, 10) ?? '-') !== dob} />
                <Field label="PhilSys" value={philsys} differs={!!other && (other.philsys_card_no ?? '-') !== philsys} />
                <Field label="Barangay" value={barangay} differs={!!other && (other.barangay?.name ?? '-') !== barangay} />
            </dl>
            {canAct && (
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={onKeep}>
                    Keep this record
                </Button>
            )}
        </div>
    );
}

export default function DuplicateAlertsIndex({ alerts, counts, filters }: Props) {
    const role = usePage().props.auth.user?.role;

    const setStatus = (status: string) => {
        router.get('/duplicate-alerts', { status }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const resolve = (alert: AlertRow, keepResidentId: number) => {
        void confirmDialog({
            title: 'Keep this record?',
            description: 'The other record will be deactivated as a duplicate.',
            confirmLabel: 'Keep this record',
        }).then((ok) => ok && router.post(`/duplicate-alerts/${alert.id}/resolve`, { keep_resident_id: keepResidentId }, { preserveScroll: true }));
    };

    const dismiss = (alert: AlertRow) => {
        void confirmDialog({
            title: 'Dismiss this alert?',
            description: 'This says the two records are different people.',
            confirmLabel: 'Dismiss alert',
        }).then((ok) => ok && router.post(`/duplicate-alerts/${alert.id}/dismiss`, {}, { preserveScroll: true }));
    };

    const isPending = filters.status === 'pending' || filters.status === 'escalated';

    const [escalating, setEscalating] = useState<AlertRow | null>(null);
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);

    const openEscalate = (alert: AlertRow) => {
        setNote('');
        setEscalating(alert);
    };

    const sendEscalation = () => {
        if (!escalating) {
            return;
        }

        router.post(
            `/duplicate-alerts/${escalating.id}/escalate`,
            { note: note.trim() || null },
            {
                preserveScroll: true,
                onStart: () => setSending(true),
                onFinish: () => {
                    setSending(false);
                    setEscalating(null);
                },
            },
        );
    };

    const tabs: { key: string; label: string; count: number }[] = [
        { key: 'pending', label: 'Pending', count: counts.pending },
        { key: 'escalated', label: 'Escalated', count: counts.escalated },
        { key: 'resolved', label: 'Resolved', count: counts.resolved },
        { key: 'dismissed', label: 'Dismissed', count: counts.dismissed },
    ];

    return (
        <>
            <Head title="Duplicate Alerts" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Duplicate &amp; Transfer Alerts</h1>
                    <p className="text-sm text-muted-foreground">
                        Review potential duplicate records and cross-barangay transfers detected by the system.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {tabs.map((tab) => (
                        <Button
                            key={tab.key}
                            variant={filters.status === tab.key ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setStatus(tab.key)}
                        >
                            {tab.label}
                            <Badge variant="secondary" className="ml-1">
                                {tab.count}
                            </Badge>
                        </Button>
                    ))}
                </div>

                {alerts.data.length === 0 && (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            No {filters.status} alerts. You are all caught up.
                        </CardContent>
                    </Card>
                )}

                <div className="space-y-4">
                    {clusterAlerts(alerts.data).map((cluster) => (
                        <div
                            key={cluster.alerts[0].id}
                            className={cn(
                                'space-y-3',
                                cluster.alerts.length > 1 && 'rounded-xl border border-warning/40 bg-warning/5 p-3',
                            )}
                        >
                            {cluster.alerts.length > 1 && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-sm">
                                    <span className="flex items-center gap-1.5 font-medium">
                                        <Users className="size-4 text-amber-500" aria-hidden="true" />
                                        {cluster.people.length} records may be the same person
                                    </span>
                                    <span className="text-muted-foreground">{cluster.people.map((person) => person.full_name).join(' · ')}</span>
                                </div>
                            )}
                    {cluster.alerts.map((alert) => {
                        const isTransfer = alert.match_basis === 'cross_barangay_transfer';
                        const isEscalated = alert.escalated_at !== null;
                        const canReview = role !== 'super_admin' && !(isEscalated && role === 'bhw');

                        return (
                            <Card key={alert.id}>
                                <CardContent className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            {isTransfer ? (
                                                <ArrowLeftRight className="size-4 text-blue-500" />
                                            ) : (
                                                <Copy className="size-4 text-amber-500" />
                                            )}
                                            {MATCH_LABEL[alert.match_basis] ?? alert.match_basis}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isEscalated && isPending && <Badge variant="outline">Escalated to admin</Badge>}
                                            <Badge variant={isTransfer ? 'default' : 'destructive'}>
                                                {Math.round(alert.similarity_score * 100)}% match
                                            </Badge>
                                        </div>
                                    </div>

                                    {isEscalated && isPending && (
                                        <p className="text-xs text-muted-foreground">
                                            Escalated by {alert.escalator?.name ?? 'a BHW'}
                                            {alert.escalation_note ? `: "${alert.escalation_note}"` : '.'}
                                            {role === 'bhw' && ' Waiting for the barangay admin to review.'}
                                        </p>
                                    )}

                                    <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
                                        <ResidentCard
                                            resident={alert.resident_one}
                                            other={alert.resident_two}
                                            canAct={isPending && canReview}
                                            onKeep={() => resolve(alert, alert.resident_id_1)}
                                        />
                                        <div className="flex items-center justify-center text-xs font-medium text-muted-foreground">
                                            VS
                                        </div>
                                        <ResidentCard
                                            resident={alert.resident_two}
                                            other={alert.resident_one}
                                            canAct={isPending && canReview}
                                            onKeep={() => resolve(alert, alert.resident_id_2)}
                                        />
                                    </div>

                                    {isPending && canReview && (
                                        <div className="flex flex-wrap justify-end gap-2">
                                            {role === 'bhw' && !isEscalated && (
                                                <Button variant="outline" size="sm" onClick={() => openEscalate(alert)}>
                                                    Escalate to admin
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="sm" onClick={() => dismiss(alert)}>
                                                Not a duplicate - dismiss
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                        </div>
                    ))}
                </div>

                <DataPagination meta={alerts} />
            </div>

            <Dialog open={escalating !== null} onOpenChange={(open) => !open && !sending && setEscalating(null)}>
                <DialogContent
                    bottomSheetOnPhone
                    // On a touch screen, focusing the note box would raise the keyboard in the middle of the slide.
                    onOpenAutoFocus={(event) => window.matchMedia('(pointer: coarse)').matches && event.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle>Escalate to the barangay admin</DialogTitle>
                        <DialogDescription>
                            The admin will be notified to review this case. Add anything that helps them decide, such as who you spoke to.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-1.5">
                        <Label htmlFor="escalation-note">Note (optional)</Label>
                        <textarea
                            id="escalation-note"
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            maxLength={1000}
                            rows={4}
                            placeholder="For example: the resident says they moved from Barangay 22 last month."
                            className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEscalating(null)} disabled={sending}>
                            Cancel
                        </Button>
                        <Button onClick={sendEscalation} disabled={sending}>
                            {sending ? 'Sending...' : 'Escalate'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

DuplicateAlertsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Duplicate Alerts', href: '/duplicate-alerts' },
    ],
};
