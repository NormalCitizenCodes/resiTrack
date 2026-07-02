import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, Home, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    SENIOR: 'bg-amber-500',
    PWD: 'bg-blue-500',
    OSY: 'bg-purple-500',
    SOLO_PARENT: 'bg-rose-500',
    PREGNANT: 'bg-pink-500',
};

function StatCard({
    label,
    value,
    icon: Icon,
    href,
    accent,
}: {
    label: string;
    value: number;
    icon: typeof Users;
    href?: string;
    accent?: string;
}) {
    const body = (
        <Card className="transition-colors hover:border-primary/40">
            <CardContent className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="mt-1 text-3xl font-semibold tracking-tight">{value.toLocaleString()}</p>
                </div>
                <div className={`rounded-xl p-3 ${accent ?? 'bg-muted'}`}>
                    <Icon className="size-6" />
                </div>
            </CardContent>
        </Card>
    );

    return href ? <Link href={href}>{body}</Link> : body;
}

export default function Dashboard({ stats, scope }: { stats: Stats; scope: string }) {
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
                        href="/residents"
                        accent="bg-primary/10 text-primary"
                    />
                    <StatCard
                        label="Total Households"
                        value={stats.total_households}
                        icon={Home}
                        href="/households"
                        accent="bg-emerald-500/10 text-emerald-600"
                    />
                    <StatCard
                        label="Pending Duplicate Alerts"
                        value={stats.pending_duplicates}
                        icon={AlertTriangle}
                        href="/duplicate-alerts"
                        accent="bg-amber-500/10 text-amber-600"
                    />
                </div>

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
