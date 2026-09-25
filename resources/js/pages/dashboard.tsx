import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Home, Users } from 'lucide-react';
import { useState } from 'react';
import { BarangayHeatmap } from '@/components/barangay-heatmap';
import { AgePyramid, SectorBars } from '@/components/demographic-charts';
import type { AgeBracket, Compound, SectorCount } from '@/components/demographic-charts';
import { GettingStarted } from '@/components/getting-started';
import type { Onboarding } from '@/components/getting-started';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

type Stats = {
    total_residents: number;
    total_households: number;
    pending_duplicates: number;
    age_distribution: AgeBracket[];
    sector_counts: SectorCount[];
    compound: Compound;
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

type AttentionItem = { key: string; label: string; count: number; href: string };

/** What is waiting on this staff member. Empty counts stay quiet; anything waiting is loud. */
function NeedsAttention({ items }: { items: AttentionItem[] }) {
    const waiting = items.reduce((sum, item) => sum + item.count, 0);

    return (
        <section aria-labelledby="needs-attention" className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
                <h2 id="needs-attention" className="text-sm font-semibold tracking-tight">
                    Needs attention
                </h2>
                {waiting === 0 && (
                    <span className="flex items-center gap-1.5 text-sm text-success-text">
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        You are all caught up
                    </span>
                )}
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] gap-3">
                {items.map((item) => (
                    <Link
                        key={item.key}
                        href={item.href}
                        className={cn(
                            'group flex items-center justify-between gap-3 rounded-lg border p-4 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                            item.count > 0 ? 'border-warning/50 bg-warning/10 hover:bg-warning/15' : 'bg-card hover:border-primary/50',
                        )}
                    >
                        <div>
                            <p className={cn('text-3xl font-bold tracking-tight tabular-nums', item.count === 0 && 'text-muted-foreground')}>
                                {item.count.toLocaleString()}
                            </p>
                            <p className="mt-0.5 text-sm text-muted-foreground">{item.label}</p>
                        </div>
                        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                ))}
            </div>
        </section>
    );
}

export default function Dashboard({
    stats,
    scope,
    barangays,
    attention = [],
    onboarding = null,
}: {
    stats: Stats;
    scope: string;
    barangays: BarangaySummary[];
    attention?: AttentionItem[];
    onboarding?: Onboarding | null;
}) {
    const role = usePage().props.auth?.user?.role;
    const [highlightId, setHighlightId] = useState<number | null>(null);
    const isStaff = role === 'super_admin' || role === 'barangay_admin' || role === 'bhw';

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

                {onboarding && <GettingStarted onboarding={onboarding} />}

                {attention.length > 0 && <NeedsAttention items={attention} />}

                <div className="grid gap-4 md:grid-cols-2">
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
                </div>

                {barangays.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">By Barangay</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <BarangayHeatmap
                                barangays={barangays}
                                highlightId={highlightId}
                                onHighlight={setHighlightId}
                                onSelect={isStaff ? (id) => router.get('/residents', { barangay_id: id }) : undefined}
                                aside={
                                    <div className="overflow-x-auto rounded-lg border">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="text-left text-xs text-muted-foreground">
                                                    <th className="px-3 py-2 font-medium">Barangay</th>
                                                    <th className="px-2 py-2 text-right font-medium">Residents</th>
                                                    <th className="px-2 py-2 text-right font-medium">Households</th>
                                                    <th className="px-3 py-2 text-right font-medium">Alerts</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {barangays.map((barangay) => (
                                                    <tr
                                                        key={barangay.id}
                                                        className={cn('border-t transition-colors', highlightId === barangay.id && 'bg-muted')}
                                                        onMouseEnter={() => setHighlightId(barangay.id)}
                                                        onMouseLeave={() => setHighlightId(null)}
                                                    >
                                                        <td className="px-3 py-2 font-medium whitespace-nowrap">
                                                            {isStaff ? (
                                                                <Link href={`/residents?barangay_id=${barangay.id}`} className="hover:underline">
                                                                    {barangay.name}
                                                                </Link>
                                                            ) : (
                                                                barangay.name
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-2 text-right tabular-nums">{barangay.residents.toLocaleString()}</td>
                                                        <td className="px-2 py-2 text-right tabular-nums">{barangay.households.toLocaleString()}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{barangay.pending_duplicates.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                }
                            />
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Age and Sex</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <AgePyramid brackets={stats.age_distribution} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Vulnerable Sectors</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <SectorBars sectors={stats.sector_counts} totalResidents={stats.total_residents} compound={stats.compound} />
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
