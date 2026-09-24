import { Head, Link, usePage } from '@inertiajs/react';
import { AlertTriangle, Home, Users } from 'lucide-react';
import { BarangayHeatmap } from '@/components/barangay-heatmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

type SectorCount = { code: string; name: string; count: number };
type AgeBracket = { label: string; count: number };

type Stats = {
    total_residents: number;
    total_households: number;
    pending_duplicates: number;
    age_distribution: AgeBracket[];
    sector_counts: SectorCount[];
};

const SECTOR_BAR: Record<string, string> = {
    SENIOR: 'bg-chart-5',
    PWD: 'bg-chart-1',
    OSY: 'bg-chart-2',
    SOLO_PARENT: 'bg-chart-4',
    PREGNANT: 'bg-chart-3',
};

function StatCard({
    label,
    value,
    icon: Icon,
    href,
}: {
    label: string;
    value: number;
    icon: typeof Users;
    href?: string;
}) {
    const body = (
        <Card className={cn('h-full', href && 'transition-colors hover:border-primary/50')}>
            <CardContent className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{value.toLocaleString()}</p>
                </div>
                <Icon className="size-5 shrink-0 text-muted-foreground" />
            </CardContent>
        </Card>
    );

    return href ? (
        <Link href={href} className="rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
            {body}
        </Link>
    ) : (
        body
    );
}

type BarangaySummary = {
    id: number;
    name: string;
    residents: number;
    households: number;
    pending_duplicates: number;
    sector_counts: SectorCount[];
};

export default function Dashboard({ stats, scope, barangays }: { stats: Stats; scope: string; barangays: BarangaySummary[] }) {
    const role = usePage().props.auth?.user?.role;
    const isStaff = role === 'super_admin' || role === 'barangay_admin' || role === 'bhw';
    const totalPop = stats.age_distribution.reduce((sum, b) => sum + b.count, 0) || 1;
    const maxSector = Math.max(1, ...stats.sector_counts.map((s) => s.count));

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">{scope} Overview</h1>
                    <p className="text-sm text-muted-foreground">
                        Resident profiling summary for data-driven social service distribution.
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        label="Total Residents"
                        value={stats.total_residents}
                        icon={Users}
                        href={isStaff ? '/residents' : undefined}
                    />
                    <StatCard
                        label="Total Households"
                        value={stats.total_households}
                        icon={Home}
                        href={isStaff ? '/households' : undefined}
                    />
                    <StatCard
                        label="Pending Duplicate Alerts"
                        value={stats.pending_duplicates}
                        icon={AlertTriangle}
                        href={isStaff ? '/duplicate-alerts' : undefined}
                    />
                </div>

                {barangays.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">By Barangay</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <BarangayHeatmap barangays={barangays} />
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-muted-foreground">
                                            <th className="pb-2 font-medium">Barangay</th>
                                            <th className="pb-2 font-medium">Residents</th>
                                            <th className="pb-2 font-medium">Households</th>
                                            <th className="pb-2 font-medium">Pending Alerts</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {barangays.map((barangay) => (
                                            <tr key={barangay.id} className="border-t">
                                                <td className="py-2 font-medium">
                                                    <Link href={`/residents?barangay_id=${barangay.id}`} className="hover:underline">
                                                        {barangay.name}
                                                    </Link>
                                                </td>
                                                <td className="py-2">{barangay.residents}</td>
                                                <td className="py-2">{barangay.households}</td>
                                                <td className="py-2">{barangay.pending_duplicates}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Age Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {stats.age_distribution.map((bracket) => {
                                const pct = Math.round((bracket.count / totalPop) * 100);

                                return (
                                    <div key={bracket.label}>
                                        <div className="mb-1 flex justify-between text-sm">
                                            <span className="font-medium">{bracket.label}</span>
                                            <span className="text-muted-foreground">
                                                {bracket.count} ({pct}%)
                                            </span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Vulnerable Sectors</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {stats.sector_counts.map((sector) => {
                                const pct = Math.round((sector.count / maxSector) * 100);

                                return (
                                    <div key={sector.code}>
                                        <div className="mb-1 flex justify-between text-sm">
                                            <span className="font-medium">{sector.name}</span>
                                            <span className="text-muted-foreground">{sector.count}</span>
                                        </div>
                                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                            <div
                                                className={`h-full rounded-full ${SECTOR_BAR[sector.code] ?? 'bg-neutral-500'}`}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
