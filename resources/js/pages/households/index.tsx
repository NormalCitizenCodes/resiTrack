import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DataPagination } from '@/components/data-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboard } from '@/routes';
import type { Household, Paginated } from '@/types';

type Props = {
    households: Paginated<Household & { residents_count: number; zone?: { zone_name: string } }>;
    filters: { search?: string };
};

export default function HouseholdsIndex({ households, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    useEffect(() => {
        const handler = setTimeout(() => {
            if (search === (filters.search ?? '')) {
                return;
            }
            router.get('/households', search ? { search } : {}, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 350);

        return () => clearTimeout(handler);
    }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

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
                    <Button asChild>
                        <Link href="/households/create">
                            <Plus className="size-4" /> Add Household
                        </Link>
                    </Button>
                </div>

                <div className="relative max-w-md">
                    <Search className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by household number or address…"
                        className="pl-8"
                    />
                </div>

                <div className="rounded-xl border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Household No.</TableHead>
                                <TableHead>Address</TableHead>
                                <TableHead>Zone / Purok</TableHead>
                                <TableHead>Members</TableHead>
                                <TableHead>4Ps</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {households.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
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
                                    <TableCell className="max-w-xs truncate text-muted-foreground">
                                        {household.address ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{household.zone?.zone_name ?? '—'}</TableCell>
                                    <TableCell>{household.residents_count}</TableCell>
                                    <TableCell>
                                        {household.is_4ps_beneficiary ? (
                                            <Badge variant="secondary">4Ps</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
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
