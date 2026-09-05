import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dashboard } from '@/routes';
import type { Barangay } from '@/types';

export default function StaffCreate({
    barangays,
    assignedBarangay,
    isSuperAdmin,
    canCreateAdmin,
}: {
    barangays: Barangay[];
    assignedBarangay: Pick<Barangay, 'id' | 'name'> | null;
    isSuperAdmin: boolean;
    canCreateAdmin: boolean;
}) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        role: 'bhw',
        barangay_id: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/staff');
    };

    return (
        <>
            <Head title="Add Staff" />
            <form onSubmit={submit} className="mx-auto w-full max-w-2xl flex-1 space-y-4 p-4 sm:p-6">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Add Staff</h1>
                    <p className="text-sm text-muted-foreground">
                        Create a login for a barangay health worker{canCreateAdmin ? ' or barangay admin' : ''}.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Account Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <Label className="mb-1.5 block">
                                Full Name <span className="text-red-500">*</span>
                            </Label>
                            <Input value={data.name} onChange={(e) => setData('name', e.target.value)} />
                            <InputError message={errors.name} className="mt-1" />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">
                                Email <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            <InputError message={errors.email} className="mt-1" />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">
                                Temporary Password <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                            />
                            <InputError message={errors.password} className="mt-1" />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Role</Label>
                            <Select value={data.role} onValueChange={(v) => setData('role', v)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="bhw">Barangay Health Worker</SelectItem>
                                    {canCreateAdmin && <SelectItem value="barangay_admin">Barangay Admin</SelectItem>}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.role} className="mt-1" />
                        </div>
                        </div>
                        {(isSuperAdmin || assignedBarangay) && (
                            <div>
                                <Label className="mb-1.5 block">Barangay</Label>
                                <Select
                                    value={isSuperAdmin ? data.barangay_id : String(assignedBarangay?.id ?? '')}
                                    onValueChange={(v) => setData('barangay_id', v)}
                                    disabled={!isSuperAdmin}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select barangay" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(isSuperAdmin ? barangays : assignedBarangay ? [assignedBarangay] : []).map((barangay) => (
                                            <SelectItem key={barangay.id} value={String(barangay.id)}>
                                                {barangay.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {!isSuperAdmin && <p className="mt-1 text-xs text-muted-foreground">Automatically assigned from your Barangay Admin account.</p>}
                                <InputError message={errors.barangay_id} className="mt-1" />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="submit" className="w-full sm:w-auto" disabled={processing}>
                        Create Account
                    </Button>
                </div>
            </form>
        </>
    );
}

StaffCreate.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Staff', href: '/staff' },
        { title: 'Add', href: '/staff/create' },
    ],
};
