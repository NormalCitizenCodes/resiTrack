import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search, UserCog } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DataPagination } from '@/components/data-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboard } from '@/routes';
import type { Paginated, Role } from '@/types';

type Staff = {
    id: number;
    name: string;
    email: string;
    role: Role;
    is_active: boolean;
    last_login_at: string | null;
    barangay?: { id: number; name: string } | null;
};

type Props = {
    staff: Paginated<Staff>;
    isSuperAdmin: boolean;
    filters: { search?: string; barangay_id?: string };
    barangays: { id: number; name: string }[];
};

const ROLE_LABEL: Record<string, string> = {
    barangay_admin: 'Barangay Admin',
    bhw: 'BHW',
};

const ALL = 'all';

export default function StaffIndex({ staff, isSuperAdmin, filters, barangays }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const toggle = (member: Staff) => {
        const verb = member.is_active ? 'deactivate' : 'reactivate';

        if (confirm(`${verb.charAt(0).toUpperCase() + verb.slice(1)} ${member.name}?`)) {
            router.post(`/staff/${member.id}/toggle`, {}, { preserveScroll: true });
        }
    };

    // Debounced search so we don't fire a request on every keystroke.
    useEffect(() => {
        const handler = setTimeout(() => {
            if (search === (filters.search ?? '')) {
                return;
            }

            router.get('/staff', cleanQuery({ ...filters, search }), {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 350);

        return () => clearTimeout(handler);
    }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

    const applyBarangayFilter = (value: string) => {
        router.get('/staff', cleanQuery({ ...filters, barangay_id: value === ALL ? '' : value }), {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <>
            <Head title="Staff" />
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Staff</h1>
                        <p className="text-sm text-muted-foreground">
                            {staff.total.toLocaleString()} staff account{staff.total === 1 ? '' : 's'}
                            {isSuperAdmin ? ' across every barangay' : ''}.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/staff/create">
                            <Plus className="size-4" /> Add Staff
                        </Link>
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className="relative min-w-[220px] flex-1">
                        <Search className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or email…"
                            className="pl-8"
                        />
                    </div>
                    {isSuperAdmin && (
                        <Select value={filters.barangay_id || ALL} onValueChange={applyBarangayFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All barangays" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>All barangays</SelectItem>
                                {barangays.map((b) => (
                                    <SelectItem key={b.id} value={String(b.id)}>
                                        {b.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {staff.data.length === 0 && (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                            <UserCog className="size-8" />
                            No staff accounts found.
                        </CardContent>
                    </Card>
                )}

                {staff.data.length > 0 && (
                    <div className="rounded-xl border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    {isSuperAdmin && <TableHead>Barangay</TableHead>}
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {staff.data.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium">{member.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{member.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{ROLE_LABEL[member.role] ?? member.role}</Badge>
                                        </TableCell>
                                        {isSuperAdmin && (
                                            <TableCell className="text-muted-foreground">
                                                {member.barangay?.name ?? '-'}
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <Badge variant={member.is_active ? 'secondary' : 'outline'}>
                                                {member.is_active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant={member.is_active ? 'outline' : 'secondary'}
                                                onClick={() => toggle(member)}
                                            >
                                                {member.is_active ? 'Deactivate' : 'Reactivate'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <DataPagination meta={staff} />
            </div>
        </>
    );
}

function cleanQuery(query: Record<string, string | undefined>): Record<string, string> {
    return Object.fromEntries(
        Object.entries(query).filter(([, value]) => value !== undefined && value !== ''),
    ) as Record<string, string>;
}

StaffIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Staff', href: '/staff' },
    ],
};
