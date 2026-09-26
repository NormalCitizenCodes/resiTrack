import { Head, Link, router } from '@inertiajs/react';
import { ArrowUpRight, History, X } from 'lucide-react';
import { DataPagination } from '@/components/data-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { Paginated } from '@/types';

type Actor = { id: number; name: string; role: string; barangay: string | null };

type Entry = {
    id: number;
    day: string;
    day_label: string;
    time: string;
    category: string;
    actor: Actor | null;
    summary: string;
    subject: string | null;
    note: string | null;
    link: string | null;
};

type StaffLine = { id: number; name: string; role: string; is_active: boolean; actions: number; last_sign_in: string | null };

type Filters = { who: string; category: string; from: string | null; to: string | null; barangay: number | null };

const ROLE_LABEL: Record<string, string> = {
    super_admin: 'Super Admin',
    barangay_admin: 'Barangay Admin',
    bhw: 'BHW',
    partner_agency: 'Partner Agency',
    resident: 'Resident',
};

const initials = (name: string) =>
    name
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0))
        .filter((_, i, all) => i === 0 || i === all.length - 1)
        .join('')
        .toUpperCase();

const ALL = '__all';

export default function ActivityLog({
    entries,
    filters,
    people,
    categories,
    barangays,
    isSuperAdmin,
    scopeName,
    staffSummary,
}: {
    entries: Paginated<Entry>;
    filters: Filters;
    people: Actor[];
    categories: Record<string, string>;
    barangays: { id: number; name: string }[];
    isSuperAdmin: boolean;
    scopeName: string;
    staffSummary: StaffLine[];
}) {
    const apply = (changes: Partial<Record<keyof Filters, string | null>>) => {
        const next = { ...filters, ...changes };

        // Changing barangay invalidates a person picked from the old one.
        if ('barangay' in changes) {
            next.who = '';
        }

        const query = Object.fromEntries(Object.entries(next).filter(([, value]) => value !== null && value !== '' && value !== ALL));
        router.get('/activity-log', query, { preserveState: true, preserveScroll: true, replace: true });
    };

    // The closed "Who" dropdown shows only the name; the role and barangay stay in the open list.
    const whoLabel = filters.who === 'residents' ? 'Residents' : (people.find((person) => String(person.id) === filters.who)?.name ?? 'Everyone');

    const filtered = Boolean(filters.who || filters.category || filters.from || filters.to);

    // Group consecutive entries under their day heading (already newest first).
    const days: { day: string; label: string; items: Entry[] }[] = [];

    for (const entry of entries.data) {
        const last = days[days.length - 1];

        if (last && last.day === entry.day) {
            last.items.push(entry);
        } else {
            days.push({ day: entry.day, label: entry.day_label, items: [entry] });
        }
    }

    return (
        <>
            <Head title="Activity Log" />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Activity Log</h1>
                    <p className="text-sm text-muted-foreground">
                        Who did what in {scopeName}, newest first. Every entry is written automatically and nobody can edit or delete it from
                        resiTrack. Times are Philippine time.
                    </p>
                </div>

                {staffSummary.length > 0 && (
                    <Card className="gap-3">
                        <CardHeader>
                            <CardTitle className="text-base">Staff at a glance</CardTitle>
                            <p className="text-sm text-muted-foreground">Actions in the last 30 days, not counting sign-ins.</p>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Staff member</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                        <TableHead className="hidden sm:table-cell">Last sign-in</TableHead>
                                        <TableHead className="hidden text-right sm:table-cell">
                                            <span className="sr-only">Show</span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {staffSummary.map((line) => (
                                        <TableRow key={line.id}>
                                            <TableCell>
                                                {/* On phones the name is the button and the last sign-in sits under it. */}
                                                <button type="button" onClick={() => apply({ who: String(line.id) })} className="text-left font-medium underline-offset-4 hover:underline">
                                                    {line.name}
                                                </button>
                                                <span className="ml-2 text-xs text-muted-foreground">{ROLE_LABEL[line.role] ?? line.role}</span>
                                                {!line.is_active && <span className="ml-2 text-xs text-destructive">Deactivated</span>}
                                                <span className="block text-xs text-muted-foreground sm:hidden">Last sign-in: {line.last_sign_in ?? 'Never'}</span>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{line.actions}</TableCell>
                                            <TableCell className={cn('hidden text-sm sm:table-cell', !line.last_sign_in && 'text-muted-foreground')}>
                                                {line.last_sign_in ?? 'Never'}
                                            </TableCell>
                                            <TableCell className="hidden text-right sm:table-cell">
                                                <Button variant="ghost" size="sm" onClick={() => apply({ who: String(line.id) })}>
                                                    Show activity
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                <section aria-label="Filters" className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
                    {isSuperAdmin && (
                        <div className="grid min-w-0 gap-1.5">
                            <Label>Barangay</Label>
                            <Select value={filters.barangay ? String(filters.barangay) : ALL} onValueChange={(value) => apply({ barangay: value })}>
                                <SelectTrigger className="w-full min-w-0 overflow-hidden">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL}>All barangays</SelectItem>
                                    {barangays.map((barangay) => (
                                        <SelectItem key={barangay.id} value={String(barangay.id)}>
                                            {barangay.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="grid min-w-0 gap-1.5">
                        <Label>Who</Label>
                        <Select value={filters.who || ALL} onValueChange={(value) => apply({ who: value })}>
                            <SelectTrigger className="w-full min-w-0 overflow-hidden">
                                <SelectValue>{whoLabel}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>Everyone</SelectItem>
                                <SelectItem value="residents">Residents (self-service)</SelectItem>
                                {people.length > 0 && (
                                    <>
                                        <SelectSeparator />
                                        <SelectGroup>
                                            <SelectLabel>Staff and agencies</SelectLabel>
                                            {people.map((person) => (
                                                <SelectItem key={person.id} value={String(person.id)}>
                                                    {person.name} · {ROLE_LABEL[person.role] ?? person.role}
                                                    {isSuperAdmin && person.barangay ? ` · ${person.barangay}` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid min-w-0 gap-1.5">
                        <Label>What</Label>
                        <Select value={filters.category || ALL} onValueChange={(value) => apply({ category: value })}>
                            <SelectTrigger className="w-full min-w-0 overflow-hidden">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All activity</SelectItem>
                                {Object.entries(categories).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid min-w-0 gap-1.5">
                        <Label htmlFor="log-from">From</Label>
                        <Input id="log-from" type="date" value={filters.from ?? ''} onChange={(event) => apply({ from: event.target.value })} />
                    </div>
                    <div className="grid min-w-0 gap-1.5">
                        <Label htmlFor="log-to">To</Label>
                        <Input id="log-to" type="date" value={filters.to ?? ''} onChange={(event) => apply({ to: event.target.value })} />
                    </div>
                    {filtered && (
                        <div className="flex items-end">
                            <Button variant="ghost" className="w-full" onClick={() => apply({ who: '', category: '', from: '', to: '' })}>
                                <X className="size-4" /> Clear filters
                            </Button>
                        </div>
                    )}
                </section>

                {entries.data.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                            <History className="size-8" aria-hidden="true" />
                            {filtered ? 'No activity matches these filters.' : 'No activity recorded yet.'}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-5">
                        {days.map((group) => (
                            <section key={group.day} aria-label={group.label}>
                                <h2 className="mb-2 text-sm font-semibold tracking-tight text-muted-foreground">{group.label}</h2>
                                <ol className="divide-y overflow-hidden rounded-lg border bg-card">
                                    {group.items.map((entry) => (
                                        <li key={entry.id} className="flex gap-3 px-4 py-3">
                                            <span className="hidden w-16 shrink-0 pt-0.5 text-xs text-muted-foreground tabular-nums sm:block">{entry.time}</span>
                                            <span
                                                aria-hidden="true"
                                                className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                                            >
                                                {entry.actor ? initials(entry.actor.name) : '?'}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm">
                                                    <span className="font-semibold">{entry.actor?.name ?? 'Removed account'}</span>
                                                    {entry.actor && (
                                                        <span className="ml-1.5 text-xs text-muted-foreground">
                                                            {ROLE_LABEL[entry.actor.role] ?? entry.actor.role}
                                                            {isSuperAdmin && entry.actor.barangay ? ` · ${entry.actor.barangay}` : ''}
                                                        </span>
                                                    )}
                                                    {/* On phones the time moves here, so the text keeps the full width. */}
                                                    <span className="ml-1.5 text-xs whitespace-nowrap text-muted-foreground tabular-nums sm:hidden">· {entry.time}</span>
                                                </p>
                                                <p className="text-sm">
                                                    {entry.summary}
                                                    {entry.subject && <span className="font-medium"> {entry.subject}</span>}
                                                </p>
                                                {entry.note && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">“{entry.note}”</p>}
                                            </div>
                                            {entry.link && (
                                                <Link
                                                    href={entry.link}
                                                    className="flex shrink-0 items-center gap-0.5 self-start text-xs font-medium text-primary underline-offset-4 hover:underline"
                                                >
                                                    Open <ArrowUpRight className="size-3.5" aria-hidden="true" />
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        ))}
                    </div>
                )}

                <DataPagination meta={entries} />
            </div>
        </>
    );
}

ActivityLog.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Activity Log', href: '/activity-log' },
    ],
};
