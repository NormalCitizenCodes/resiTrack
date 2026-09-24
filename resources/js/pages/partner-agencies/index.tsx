import { Form as InertiaForm, Head, router, useForm } from '@inertiajs/react';
import { Plus, Power, UserPlus } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { dashboard } from '@/routes';
import type { Barangay } from '@/types';

type Agency = {
    id: number;
    agency_name: string;
    agency_type: string | null;
    contact_person: string | null;
    contact_number: string | null;
    email: string | null;
    address: string | null;
    is_active: boolean;
    accounts_count: number;
};
type Account = { id: number; name: string; email: string; is_active: boolean; agency?: Agency | null; barangay?: { id: number; name: string } | null };

export default function PartnerAgencies({
    agencies,
    accounts,
    barangays,
    isSuperAdmin,
    assignedBarangay,
}: {
    agencies: Agency[];
    accounts: Account[];
    barangays: Barangay[];
    isSuperAdmin: boolean;
    assignedBarangay: { id: number; name: string } | null;
}) {
    const agencyForm = useForm({ agency_name: '', agency_type: '', contact_person: '', contact_number: '', email: '', address: '' });
    const accountForm = useForm({ name: '', email: '', password: '', agency_id: '', barangay_id: '' });

    const submitAgency: FormEventHandler = (event) => {
        event.preventDefault();
        agencyForm.post('/partner-agencies');
    };
    const submitAccount: FormEventHandler = (event) => {
        event.preventDefault();
        accountForm.post('/partner-agency-accounts');
    };
    const toggle = (account: Account) => {
        if (confirm(`${account.is_active ? 'Deactivate' : 'Activate'} ${account.name}?`)) {
            router.post(`/partner-agency-accounts/${account.id}/toggle`, {}, { preserveScroll: true });
        }
    };

    return (
        <>
            <Head title="Partner Agencies" />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Partner Agencies</h1>
                    <p className="text-sm text-muted-foreground">
                        {isSuperAdmin ? 'System-wide partner agency management.' : `${assignedBarangay?.name ?? 'Your barangay'} partner agency accounts.`}
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UserPlus className="size-4" />
                                Add Agency Account
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* min-w-0 on every cell below: a grid item's width defaults to
                                its content's natural size (min-width: auto), so w-full alone
                                on the Select inside doesn't stop a long agency name from
                                forcing the whole column, and the box inside it, wider than
                                the card. */}
                            <form onSubmit={submitAccount} className="grid gap-4 sm:grid-cols-2">
                                <div className="grid min-w-0 gap-2">
                                    <Label>Name</Label>
                                    <Input required value={accountForm.data.name} onChange={(e) => accountForm.setData('name', e.target.value)} />
                                </div>
                                <div className="grid min-w-0 gap-2">
                                    <Label>Email</Label>
                                    <Input required type="email" value={accountForm.data.email} onChange={(e) => accountForm.setData('email', e.target.value)} />
                                </div>
                                <div className="grid min-w-0 gap-2">
                                    <Label>Temporary Password</Label>
                                    <Input required type="password" value={accountForm.data.password} onChange={(e) => accountForm.setData('password', e.target.value)} />
                                </div>
                                <div className="grid min-w-0 gap-2">
                                    <Label>Partner Agency</Label>
                                    <Select value={accountForm.data.agency_id} onValueChange={(value) => accountForm.setData('agency_id', value)}>
                                        <SelectTrigger className="w-full overflow-hidden">
                                            <SelectValue placeholder="Select agency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {agencies.map((agency) => (
                                                <SelectItem key={agency.id} value={String(agency.id)}>
                                                    {agency.agency_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid min-w-0 gap-2 sm:col-span-2">
                                    <Label>Barangay</Label>
                                    {isSuperAdmin ? (
                                        <Select value={accountForm.data.barangay_id} onValueChange={(value) => accountForm.setData('barangay_id', value)}>
                                            <SelectTrigger className="w-full overflow-hidden">
                                                <SelectValue placeholder="Select barangay" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {barangays.map((barangay) => (
                                                    <SelectItem key={barangay.id} value={String(barangay.id)}>
                                                        {barangay.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        // Not an interactive field for a barangay admin: the backend
                                        // ignores whatever barangay_id a non-super-admin submits and
                                        // always uses their own barangay_id instead, so this is purely
                                        // informational. A disabled <Select> here read as blank (its
                                        // disabled state drops opacity to 50%, unreadable on this dark
                                        // background) for a value the admin can't change anyway.
                                        <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm font-medium">
                                            {assignedBarangay?.name ?? 'Your barangay'}
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                        {isSuperAdmin ? 'Assign the account to any barangay.' : 'Locked to your assigned barangay.'}
                                    </p>
                                </div>
                                <Button className="sm:col-span-2" disabled={accountForm.processing}>
                                    <Plus className="size-4" />
                                    Create Account
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {isSuperAdmin && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Plus className="size-4" />
                                    Add Partner Agency
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={submitAgency} className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label>Agency name</Label>
                                        <Input required value={agencyForm.data.agency_name} onChange={(e) => agencyForm.setData('agency_name', e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Agency type</Label>
                                        <Input value={agencyForm.data.agency_type} onChange={(e) => agencyForm.setData('agency_type', e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Contact person</Label>
                                        <Input value={agencyForm.data.contact_person} onChange={(e) => agencyForm.setData('contact_person', e.target.value)} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Contact number</Label>
                                        <Input value={agencyForm.data.contact_number} onChange={(e) => agencyForm.setData('contact_number', e.target.value)} />
                                    </div>
                                    <div className="grid gap-2 sm:col-span-2">
                                        <Label>Agency email</Label>
                                        <Input type="email" value={agencyForm.data.email} onChange={(e) => agencyForm.setData('email', e.target.value)} />
                                    </div>
                                    <div className="grid gap-2 sm:col-span-2">
                                        <Label>Address</Label>
                                        <Input value={agencyForm.data.address} onChange={(e) => agencyForm.setData('address', e.target.value)} />
                                    </div>
                                    <Button className="sm:col-span-2" disabled={agencyForm.processing}>
                                        <Plus className="size-4" />
                                        Create Partner Agency
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {isSuperAdmin && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Partner Agency Organizations</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                            {agencies.map((agency) => (
                                <InertiaForm key={agency.id} action={`/partner-agencies/${agency.id}`} method="put" className="grid gap-3 rounded-md border p-4">
                                    <div className="grid gap-1.5">
                                        <Label htmlFor={`agency_name_${agency.id}`}>Agency name</Label>
                                        <Input id={`agency_name_${agency.id}`} name="agency_name" defaultValue={agency.agency_name} />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor={`agency_type_${agency.id}`}>Agency type</Label>
                                        <Input id={`agency_type_${agency.id}`} name="agency_type" defaultValue={agency.agency_type ?? ''} />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor={`contact_person_${agency.id}`}>Contact person</Label>
                                        <Input id={`contact_person_${agency.id}`} name="contact_person" defaultValue={agency.contact_person ?? ''} />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor={`contact_number_${agency.id}`}>Contact number</Label>
                                        <Input id={`contact_number_${agency.id}`} name="contact_number" defaultValue={agency.contact_number ?? ''} />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor={`email_${agency.id}`}>Agency email</Label>
                                        <Input id={`email_${agency.id}`} name="email" type="email" defaultValue={agency.email ?? ''} />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor={`address_${agency.id}`}>Address</Label>
                                        <Input id={`address_${agency.id}`} name="address" defaultValue={agency.address ?? ''} />
                                    </div>
                                    <div className="flex items-center justify-between pt-1">
                                        <p className="text-xs text-muted-foreground">{agency.accounts_count} account(s)</p>
                                        <Button type="submit" size="sm">
                                            Save Agency
                                        </Button>
                                    </div>
                                </InertiaForm>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Agency Accounts</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {accounts.length === 0 && <p className="text-sm text-muted-foreground">No agency accounts assigned to this scope.</p>}
                        {accounts.map((account) => (
                            <div key={account.id} className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="font-medium">{account.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {account.email} · {account.agency?.agency_name ?? 'Unassigned'} · {account.barangay?.name ?? '-'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant={account.is_active ? 'secondary' : 'outline'}>{account.is_active ? 'Active' : 'Inactive'}</Badge>
                                    <Button size="sm" variant="outline" onClick={() => toggle(account)}>
                                        <Power className="size-4" />
                                        {account.is_active ? 'Deactivate' : 'Activate'}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

PartnerAgencies.layout = { breadcrumbs: [{ title: 'Dashboard', href: dashboard() }, { title: 'Partner Agencies', href: '/partner-agencies' }] };
