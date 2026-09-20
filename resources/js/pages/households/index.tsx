import { Head, Link, router, usePage } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DataPagination } from '@/components/data-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboard } from '@/routes';
import type { Household, Paginated } from '@/types';

type Filters = { search?: string; barangay_id?: string; zone_id?: string; wellbeing?: string; is_4ps?: string };

type Props = {
    households: Paginated<
        Household & {
            residents_count: number;
            zone?: { zone_name: string };
            barangay?: { name: string };
            current_wellbeing?: { level?: { label: string } } | null;
        }
    >;
    filters: Filters;
    barangays: { id: number; name: string }[];
    zones: { id: number; zone_name: string }[];
    wellbeingLevels: { id: number; level_code: string; label: string }[];
};

const ALL = 'all';

export default function HouseholdsIndex({ households, filters, barangays, zones, wellbeingLevels }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const isSuperAdmin = usePage().props.auth.user?.role === 'super_admin';

    const visit = (next: Filters) => {
        const params = Object.fromEntries(Object.entries(next).filter(([, value]) => value));
        router.get('/households', params, { preserveState: true, preserveScroll: true, replace: true });
    };

    const setFilter = (key: keyof Filters, value: string) => {
        const next = { ...filters, [key]: value === ALL ? '' : value };

        if (key === 'barangay_id') {
            next.zone_id = '';
        }

        visit(next);
    };

    useEffect(() => {
        const handler = setTimeout(() => {
            if (search === (filters.search ?? '')) {
                return;
            }

            visit({ ...filters, search });
        }, 350);

        return () => clearTimeout(handler);
    }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

    const hasFilters = Boolean(filters.search || filters.barangay_id || filters.zone_id || filters.wellbeing || filters.is_4ps);

    return (
        <>
            <Head title="Households" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Households (RBI Form A)</h1>
                        <p className="text-sm text-muted-foreground">
                            {households.total.toLocaleString()} registered household
                            {households.total === 1 ? '' : 's'}
                        </p>
                    </div>
                    {isSuperAdmin ? (
                        <Badge variant="outline">Read-only view</Badge>
                    ) : (
                        <Button asChild>
                            <Link href="/households/create">
                                <Plus className="size-4" /> Add Household
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by household number or address…"
                            className="pl-8"
                        />
                    </div>
                    {isSuperAdmin && (
                        <Select value={filters.barangay_id ?? ALL} onValueChange={(v) => setFilter('barangay_id', v)}>
                            <SelectTrigger className="w-44">
                                <SelectValue placeholder="Barangay" />
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
                    )}
                    <Select value={filters.zone_id ?? ALL} onValueChange={(v) => setFilter('zone_id', v)}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Purok" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All puroks</SelectItem>
                            {zones.map((zone) => (
                                <SelectItem key={zone.id} value={String(zone.id)}>
                                    {zone.zone_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filters.wellbeing ?? ALL} onValueChange={(v) => setFilter('wellbeing', v)}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Wellbeing" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All wellbeing levels</SelectItem>
                            {wellbeingLevels.map((level) => (
                                <SelectItem key={level.id} value={String(level.id)}>
                                    {level.label}
                                </SelectItem>
                            ))}
                            <SelectItem value="none">Not yet assessed</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={filters.is_4ps ?? ALL} onValueChange={(v) => setFilter('is_4ps', v)}>
                        <SelectTrigger className="w-36">
                            <SelectValue placeholder="4Ps" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>4Ps: all</SelectItem>
                            <SelectItem value="yes">4Ps only</SelectItem>
                            <SelectItem value="no">Non-4Ps</SelectItem>
                        </SelectContent>
                    </Select>
                    {hasFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearch('');
                                visit({});
                            }}
                        >
                            Clear
                        </Button>
                    )}
                </div>

                <div className="rounded-xl border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Household No.</TableHead>
                                {isSuperAdmin && <TableHead>Barangay</TableHead>}
                                <TableHead>Address</TableHead>
                                <TableHead>Zone / Purok</TableHead>
                                <TableHead>Members</TableHead>
                                <TableHead>Wellbeing</TableHead>
                                <TableHead>4Ps</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {households.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={isSuperAdmin ? 8 : 7} className="py-10 text-center text-muted-foreground">
                                        No households found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {households.data.map((household) => (
                                <TableRow key={household.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/households/${household.id}`} className="hover:underline">
                                            {household.household_number ?? `#${household.id}`}
                                        </Link>
                                    </TableCell>
                                    {isSuperAdmin && (
                                        <TableCell className="text-muted-foreground">{household.barangay?.name ?? '-'}</TableCell>
                                    )}
                                    <TableCell className="max-w-xs truncate text-muted-foreground">
                                        {household.address ?? '-'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{household.zone?.zone_name ?? '-'}</TableCell>
                                    <TableCell>{household.residents_count}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {household.current_wellbeing?.level?.label ?? '-'}
                                    </TableCell>
                                    <TableCell>
                                        {household.is_4ps_beneficiary ? (
                                            <Badge variant="secondary">4Ps</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/households/${household.id}`}>View</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <DataPagination meta={households} />
            </div>
        </>
    );
}

HouseholdsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Households', href: '/households' },
    ],
};
