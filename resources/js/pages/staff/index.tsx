import { Head, Link, router } from '@inertiajs/react';
import { Plus, UserCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboard } from '@/routes';
import type { Role } from '@/types';

type Staff = {
    id: number;
    name: string;
    email: string;
    role: Role;
    is_active: boolean;
    last_login_at: string | null;
    barangay?: { id: number; name: string } | null;
};

const ROLE_LABEL: Record<string, string> = {
    barangay_admin: 'Barangay Admin',
    bhw: 'BHW',
};

export default function StaffIndex({ staff, isSuperAdmin }: { staff: Staff[]; isSuperAdmin: boolean }) {
    const toggle = (member: Staff) => {
        const verb = member.is_active ? 'deactivate' : 'reactivate';
        if (confirm(`${verb.charAt(0).toUpperCase() + verb.slice(1)} ${member.name}?`)) {
            router.post(`/staff/${member.id}/toggle`, {}, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Staff" />
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Staff</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage barangay staff logins{isSuperAdmin ? ' across every barangay' : ''}.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/staff/create">
                            <Plus className="size-4" /> Add Staff
                        </Link>
                    </Button>
                </div>

                {staff.length === 0 && (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                            <UserCog className="size-8" />
                            No staff accounts yet.
                        </CardContent>
                    </Card>
                )}

                {staff.length > 0 && (
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
                                {staff.map((member) => (
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
            </div>
        </>
    );
}

StaffIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Staff', href: '/staff' },
    ],
};
