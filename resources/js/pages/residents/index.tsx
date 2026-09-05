import { Head, Link, router, usePage } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DataPagination } from '@/components/data-pagination';
import { SectorBadges } from '@/components/sector-badges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboard } from '@/routes';
import type { Paginated, Resident, VulnerabilitySector } from '@/types';

type Props = {
    residents: Paginated<Resident>;
    sectors: VulnerabilitySector[];
    filters: { search?: string; sector?: string; status?: string };
};

const ALL = 'all';

export default function ResidentsIndex({ residents, sectors, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const role = usePage().props.auth.user.role;

    const restore = (resident: Resident) => {
        if (confirm(`Activate / Restore ${resident.full_name}?`)) {
            router.post(`/residents/${resident.id}/toggle`, {}, { preserveScroll: true });
        }
    };

    // Debounced search so we don't fire a request on every keystroke.
    useEffect(() => {
        const handler = setTimeout(() => {
            if (search === (filters.search ?? '')) {

                return;
            }

            router.get('/residents', cleanQuery({ ...filters, search }), {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 350);

        return () => clearTimeout(handler);
    }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

    const applyFilter = (key: 'sector' | 'status', value: string) => {
        router.get('/residents', cleanQuery({ ...filters, [key]: value === ALL ? '' : value }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <>
            <Head title="Residents" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Resident Records</h1>
                        <p className="text-sm text-muted-foreground">
                            {residents.total.toLocaleString()} registered resident
                            {residents.total === 1 ? '' : 's'}
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/residents/create">
                            <Plus className="size-4" /> Add Resident
                        </Link>
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className="relative min-w-[220px] flex-1">
                        <Search className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or PhilSys number…"
                            className="pl-8"
                        />
                    </div>
                    <Select value={filters.sector || ALL} onValueChange={(v) => applyFilter('sector', v)}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="All sectors" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All sectors</SelectItem>
                            {sectors.map((s) => (
                                <SelectItem key={s.id} value={s.code}>
                                    {s.sector_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={filters.status || ALL} onValueChange={(v) => applyFilter('status', v)}>
                        <SelectTrigger className="w-[170px]">
                            <SelectValue placeholder="All records" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>All records</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="flagged">Duplicate-flagged</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-xl border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Age / Sex</TableHead>
                                <TableHead>Household</TableHead>
                                <TableHead>Vulnerability Sectors</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {residents.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                                        No residents found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {residents.data.map((resident) => (
                                <TableRow key={resident.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/residents/${resident.id}`} className="hover:underline">
                                            {resident.full_name}
                                        </Link>
                                        {resident.resident_id && (
                                            <span className="block text-xs text-muted-foreground">
                                                {resident.resident_id}
                                            </span>
                                        )}
                                        {resident.contact_number && (
                                            <span className="block text-xs text-muted-foreground">
                                                Contact: {resident.contact_number}
                                            </span>
                                        )}
                                        {resident.philsys_card_no && (
                                            <span className="block text-xs text-muted-foreground">
                                                PhilSys: {resident.philsys_card_no}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {resident.age ?? '—'}
                                        <span className="text-muted-foreground"> / {resident.sex ?? '—'}</span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {resident.household?.household_number ?? '—'}
                                    </TableCell>
                                    <TableCell>
                                        <SectorBadges sectors={resident.sectors} />
                                    </TableCell>
                                    <TableCell>
                                        {resident.is_duplicate_flagged ? (
                                            <Badge variant="destructive">Flagged</Badge>
                                        ) : resident.is_active ? (
                                            <Badge variant="secondary">Active</Badge>
                                        ) : (
                                            <Badge variant="outline">Inactive</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/residents/${resident.id}`}>View</Link>
                                            </Button>
                                            {!resident.is_active && role !== 'bhw' && (
                                                <Button variant="secondary" size="sm" onClick={() => restore(resident)}>
                                                    Activate / Restore
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <DataPagination meta={residents} />
            </div>
        </>
    );
}

function cleanQuery(query: Record<string, string | undefined>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(query).filter(([, value]) => value !== undefined && value !== ''),
    ) as Record<string, string>;
}

ResidentsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Residents', href: '/residents' },
    ],
};
