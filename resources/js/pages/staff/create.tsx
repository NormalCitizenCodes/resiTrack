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
    canCreateAdmin,
}: {
    barangays: Barangay[];
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
            <form onSubmit={submit} className="mx-auto w-full max-w-xl flex-1 space-y-4 p-4">
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
                        {barangays.length > 0 && (
                            <div>
                                <Label className="mb-1.5 block">Barangay</Label>
                                <Select value={data.barangay_id} onValueChange={(v) => setData('barangay_id', v)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {barangays.map((barangay) => (
                                            <SelectItem key={barangay.id} value={String(barangay.id)}>
                                                {barangay.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.barangay_id} className="mt-1" />
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" disabled={processing}>
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
