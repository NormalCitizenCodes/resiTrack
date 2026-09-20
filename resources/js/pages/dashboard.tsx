import { Head, Link, usePage } from '@inertiajs/react';
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

type BarangaySummary = { id: number; name: string; residents: number; households: number; pending_duplicates: number };

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
                        accent="bg-primary/10 text-primary"
                    />
                    <StatCard
                        label="Total Households"
                        value={stats.total_households}
                        icon={Home}
                        href={isStaff ? '/households' : undefined}
                        accent="bg-emerald-500/10 text-emerald-600"
                    />
                    <StatCard
                        label="Pending Duplicate Alerts"
                        value={stats.pending_duplicates}
                        icon={AlertTriangle}
                        href={isStaff ? '/duplicate-alerts' : undefined}
                        accent="bg-amber-500/10 text-amber-600"
                    />
                </div>

                {barangays.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">By Barangay</CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
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
