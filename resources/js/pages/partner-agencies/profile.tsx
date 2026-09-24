import { Head, useForm } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';

type Agency = {
    id: number;
    agency_name: string;
    agency_type: string | null;
    contact_person: string | null;
    contact_number: string | null;
    email: string | null;
    address: string | null;
};

export default function AgencyProfile({ agency }: { agency: Agency }) {
    const form = useForm({
        agency_name: agency.agency_name,
        agency_type: agency.agency_type ?? '',
        contact_person: agency.contact_person ?? '',
        contact_number: agency.contact_number ?? '',
        email: agency.email ?? '',
        address: agency.address ?? '',
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        form.put('/agency-profile', { preserveScroll: true });
    };

    return (
        <>
            <Head title="Agency Profile" />
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 sm:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Agency Profile</h1>
                    <p className="text-sm text-muted-foreground">
                        Contact details shown to barangay staff and residents wherever this agency operates.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="size-4" />
                            Organization details
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                            <div className="grid min-w-0 gap-2 sm:col-span-2">
                                <Label>Agency name</Label>
                                <Input required value={form.data.agency_name} onChange={(e) => form.setData('agency_name', e.target.value)} />
                                {form.errors.agency_name && <p className="text-xs text-destructive">{form.errors.agency_name}</p>}
                            </div>
                            <div className="grid min-w-0 gap-2">
                                <Label>Agency type</Label>
                                <Input value={form.data.agency_type} onChange={(e) => form.setData('agency_type', e.target.value)} />
                            </div>
                            <div className="grid min-w-0 gap-2">
                                <Label>Contact person</Label>
                                <Input value={form.data.contact_person} onChange={(e) => form.setData('contact_person', e.target.value)} />
                            </div>
                            <div className="grid min-w-0 gap-2">
                                <Label>Contact number</Label>
                                <Input value={form.data.contact_number} onChange={(e) => form.setData('contact_number', e.target.value)} />
                            </div>
                            <div className="grid min-w-0 gap-2">
                                <Label>Agency email</Label>
                                <Input type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
                                {form.errors.email && <p className="text-xs text-destructive">{form.errors.email}</p>}
                            </div>
                            <div className="grid min-w-0 gap-2 sm:col-span-2">
                                <Label>Address</Label>
                                <Input value={form.data.address} onChange={(e) => form.setData('address', e.target.value)} />
                            </div>
                            <Button className="sm:col-span-2" disabled={form.processing}>
                                Save changes
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <p className="text-xs text-muted-foreground">
                    This applies to every account your agency has across barangays, not just this one.
                </p>
            </div>
        </>
    );
}

AgencyProfile.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Agency Profile', href: '/agency-profile' },
    ],
};
