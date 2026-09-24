import { Head, router } from '@inertiajs/react';
import { HandHeart } from 'lucide-react';
import { DataPagination } from '@/components/data-pagination';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboard } from '@/routes';
import type { Beneficiary, Paginated } from '@/types';

type Props = {
    beneficiaries: Paginated<Beneficiary & { program?: { id: number; title: string } }>;
    programs: { id: number; title: string }[];
    filters: { program_id?: string };
};

const ALL = 'all';

export default function BeneficiariesIndex({ beneficiaries, programs, filters }: Props) {
    const applyProgramFilter = (value: string) => {
        router.get(
            '/beneficiaries',
            value === ALL ? {} : { program_id: value },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <>
            <Head title="Beneficiaries" />
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Beneficiaries</h1>
                        <p className="text-sm text-muted-foreground">
                            {beneficiaries.total.toLocaleString()} resident{beneficiaries.total === 1 ? '' : 's'} accepted across your programs.
                        </p>
                    </div>
                    {programs.length > 0 && (
                        <Select value={filters.program_id || ALL} onValueChange={applyProgramFilter}>
                            <SelectTrigger className="w-[220px] overflow-hidden">
                                <SelectValue placeholder="All programs" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All programs</SelectItem>
                                {programs.map((program) => (
                                    <SelectItem key={program.id} value={String(program.id)}>
                                        {program.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {beneficiaries.data.length === 0 && (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                            <HandHeart className="size-8" />
                            No beneficiaries yet.
                        </CardContent>
                    </Card>
                )}

                {beneficiaries.data.length > 0 && (
                    <div className="rounded-xl border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Resident</TableHead>
                                    <TableHead>Barangay</TableHead>
                                    <TableHead>Program</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Added</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {beneficiaries.data.map((beneficiary) => (
                                    <TableRow key={beneficiary.id}>
                                        <TableCell className="font-medium">
                                            {beneficiary.resident?.full_name ?? `Resident #${beneficiary.resident_id}`}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {beneficiary.resident?.barangay?.name ?? '-'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {beneficiary.program?.title ?? '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={beneficiary.status === 'active' ? 'secondary' : 'outline'}>
                                                {beneficiary.status === 'active' ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {beneficiary.date_added?.substring(0, 10) ?? '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <DataPagination meta={beneficiaries} />
            </div>
        </>
    );
}

BeneficiariesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Beneficiaries', href: '/beneficiaries' },
    ],
};
