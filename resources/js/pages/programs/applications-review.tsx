import { Head, router } from '@inertiajs/react';
import { Check, ClipboardList, X } from 'lucide-react';
import { DataPagination } from '@/components/data-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboard } from '@/routes';
import type { Paginated, ProgramApplication } from '@/types';

type Props = {
    applications: Paginated<ProgramApplication>;
    filters: { status: string };
};

const STATUS_VARIANT: Record<string, 'secondary' | 'outline' | 'destructive' | 'default'> = {
    approved: 'secondary',
    pending: 'default',
    rejected: 'destructive',
};

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All statuses' },
];

export default function ApplicationsReview({ applications, filters }: Props) {
    const applyStatusFilter = (value: string) => {
        router.get(
            '/applications/review',
            { status: value },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const review = (application: ProgramApplication, status: 'approved' | 'rejected') => {
        router.patch(`/applications/${application.id}`, { status }, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Applications to Review" />
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Applications to Review</h1>
                        <p className="text-sm text-muted-foreground">
                            {applications.total.toLocaleString()} application{applications.total === 1 ? '' : 's'} across your programs.
                        </p>
                    </div>
                    <Select value={filters.status} onValueChange={applyStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {applications.data.length === 0 && (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                            <ClipboardList className="size-8" />
                            No applications found.
                        </CardContent>
                    </Card>
                )}

                {applications.data.length > 0 && (
                    <div className="rounded-xl border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Applicant</TableHead>
                                    <TableHead>Barangay</TableHead>
                                    <TableHead>Program</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Review</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {applications.data.map((application) => (
                                    <TableRow key={application.id}>
                                        <TableCell className="font-medium">
                                            {application.resident?.full_name ?? `Resident #${application.resident_id}`}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {application.resident?.barangay?.name ?? '-'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {application.program?.title ?? '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={STATUS_VARIANT[application.status] ?? 'outline'}>
                                                {application.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {application.status === 'pending' ? (
                                                <div className="flex justify-end gap-1">
                                                    <Button size="sm" variant="outline" onClick={() => review(application, 'approved')}>
                                                        <Check className="size-4" /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => review(application, 'rejected')}>
                                                        <X className="size-4" /> Reject
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Reviewed</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <DataPagination meta={applications} />
            </div>
        </>
    );
}

ApplicationsReview.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Applications to Review', href: '/applications/review' },
    ],
};
