import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeftRight, Copy } from 'lucide-react';
import { DataPagination } from '@/components/data-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { dashboard } from '@/routes';
import type { DuplicateAlert, Paginated, Resident } from '@/types';

type AlertRow = DuplicateAlert & {
    resident_one?: Resident & { barangay?: { name: string } };
    resident_two?: Resident & { barangay?: { name: string } };
};

type Props = {
    alerts: Paginated<AlertRow>;
    counts: { pending: number; resolved: number; dismissed: number };
    filters: { status: string };
};

const MATCH_LABEL: Record<string, string> = {
    philsys: 'Identical PhilSys number',
    name_dob: 'Same name & date of birth',
    name_address: 'Same name & address',
    cross_barangay_transfer: 'Possible cross-barangay transfer',
};

function ResidentCard({
    resident,
    onKeep,
    canAct,
}: {
    resident?: Resident & { barangay?: { name: string } };
    onKeep: () => void;
    canAct: boolean;
}) {
    if (!resident) {
        return <div className="flex-1 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">Record unavailable</div>;
    }

    return (
        <div className="flex-1 rounded-lg border p-3">
            <div className="flex items-center justify-between">
                <Link href={`/residents/${resident.id}`} className="font-medium hover:underline">
                    {resident.full_name}
                </Link>
                {!resident.is_active && <Badge variant="outline">Inactive</Badge>}
            </div>
            <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div>DOB: {resident.date_of_birth?.substring(0, 10) ?? '—'}</div>
                <div>PhilSys: {resident.philsys_card_no ?? '—'}</div>
                <div>Barangay: {resident.barangay?.name ?? '—'}</div>
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
    const setStatus = (status: string) => {
        router.get('/duplicate-alerts', { status }, { preserveState: true, preserveScroll: true, replace: true });
    };

    const resolve = (alert: AlertRow, keepResidentId: number) => {
        if (confirm('Keep this record and deactivate the other as a duplicate?')) {
            router.post(`/duplicate-alerts/${alert.id}/resolve`, { keep_resident_id: keepResidentId }, { preserveScroll: true });
        }
    };

    const dismiss = (alert: AlertRow) => {
        if (confirm('Dismiss this alert as a false positive (the two records are different people)?')) {
            router.post(`/duplicate-alerts/${alert.id}/dismiss`, {}, { preserveScroll: true });
        }
    };

    const isPending = filters.status === 'pending';

    const tabs: { key: string; label: string; count: number }[] = [
        { key: 'pending', label: 'Pending', count: counts.pending },
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

                <div className="flex gap-2">
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
                            No {filters.status} alerts. 🎉
                        </CardContent>
                    </Card>
                )}

                <div className="space-y-3">
                    {alerts.data.map((alert) => {
                        const isTransfer = alert.match_basis === 'cross_barangay_transfer';
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
                                        <Badge variant={isTransfer ? 'default' : 'destructive'}>
                                            {Math.round(alert.similarity_score * 100)}% match
                                        </Badge>
                                    </div>

                                    <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
                                        <ResidentCard
                                            resident={alert.resident_one}
                                            canAct={isPending}
                                            onKeep={() => resolve(alert, alert.resident_id_1)}
                                        />
                                        <div className="flex items-center justify-center text-xs font-medium text-muted-foreground">
                                            VS
                                        </div>
                                        <ResidentCard
                                            resident={alert.resident_two}
                                            canAct={isPending}
                                            onKeep={() => resolve(alert, alert.resident_id_2)}
                                        />
                                    </div>

                                    {isPending && (
                                        <div className="flex justify-end">
                                            <Button variant="ghost" size="sm" onClick={() => dismiss(alert)}>
                                                Not a duplicate — dismiss
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <DataPagination meta={alerts} />
            </div>
        </>
    );
}

DuplicateAlertsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Duplicate Alerts', href: '/duplicate-alerts' },
    ],
};
