import { Form, Head, Link } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Account = { name: string; email: string | null; barangay: string | null; identifier: string };

export default function CreateReactivation({ account, pending }: { account: Account | null; pending: boolean }) {
    return (
        <>
            <Head title="Request Account Reactivation" />
            <div className="flex flex-col gap-6">
                <Card>
                    <CardContent className="space-y-5 p-6">
                        {pending && <div className="flex gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm"><AlertTriangle className="size-5 shrink-0" /><p>You already have a pending account reactivation request. Please visit your Barangay Hall and wait for the barangay staff to review your request.</p></div>}
                        {!account && !pending && <Form action="/account-reactivation/request" method="get" className="space-y-4">
                            {({ errors }) => <>
                                <div className="grid gap-2"><Label htmlFor="identifier">Registered Email or Resident ID</Label><Input id="identifier" name="identifier" required placeholder="email@example.com or RES-2026-000123" /><InputError message={errors.identifier} /></div>
                                <Button type="submit">Find My Account</Button>
                            </>}
                        </Form>}
                        {account && !pending && <Form action="/account-reactivation/request" method="post" className="space-y-5">
                            {({ processing, errors }) => <>
                                <div className="grid gap-3 rounded-md bg-muted/50 p-4"><p className="flex items-center gap-2 font-medium"><CheckCircle2 className="size-4 text-primary" /> Account found</p><div><p className="text-xs text-muted-foreground">Full Name</p><p>{account.name}</p></div><div><p className="text-xs text-muted-foreground">Registered Email</p><p>{account.email ?? 'No email registered'}</p></div><div><p className="text-xs text-muted-foreground">Barangay</p><p>{account.barangay ?? '—'}</p></div></div>
                                <input type="hidden" name="identifier" value={account.identifier} />
                                <div className="grid gap-2"><Label htmlFor="reason">Reason for Reactivation</Label><textarea id="reason" name="reason" required rows={5} maxLength={2000} className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" placeholder="Explain why you need your account restored." /><InputError message={errors.reason} /></div>
                                <div className="flex gap-2"><Button asChild type="button" variant="outline"><Link href="/login">Cancel</Link></Button><Button type="submit" disabled={processing}>Submit Reactivation Request</Button></div>
                            </>}
                        </Form>}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

CreateReactivation.layout = {
    title: 'Request Account Reactivation',
    description: 'Ask a Barangay Administrator to review your deactivated Resident Account.',
};
