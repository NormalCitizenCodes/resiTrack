import { Form, Head } from '@inertiajs/react';
import { useState } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';

type DeletionRequest = {
    status: 'pending' | 'approved' | 'rejected';
    reason: string;
    admin_remarks: string | null;
    created_at: string;
};

export default function Account({ deletionRequest }: { deletionRequest: DeletionRequest | null }) {
    const [confirmed, setConfirmed] = useState(false);
    const pending = deletionRequest?.status === 'pending';

    return (
        <>
            <Head title="Account settings" />
            <h1 className="sr-only">Account settings</h1>
            <div className="space-y-6">
                <Heading variant="small" title="Account" description="Manage your account status and deletion request" />
                {deletionRequest && (
                    <div className="space-y-2 rounded-lg border p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">Account Deletion Request</p>
                            <Badge variant={pending ? 'secondary' : deletionRequest.status === 'rejected' ? 'destructive' : 'outline'}>
                                {pending ? 'Pending Review' : deletionRequest.status}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {pending
                                ? 'Your request has been submitted to the administrator for review.'
                                : deletionRequest.status === 'rejected'
                                    ? `Your account remains active.${deletionRequest.admin_remarks ? ` Administrator remarks: ${deletionRequest.admin_remarks}` : ''}`
                                    : 'Your account has been deactivated according to the barangay account retention policy.'}
                        </p>
                    </div>
                )}
                {!pending && deletionRequest?.status !== 'approved' && (
                    <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                        <div className="space-y-1 text-destructive">
                            <p className="font-medium">Request Account Deletion</p>
                            <p className="text-sm text-foreground">Your account may be linked to an official resident profile and barangay records. For data integrity and recordkeeping, you cannot permanently delete your account yourself.</p>
                            <p className="text-sm text-foreground">You may submit a deletion request to the Barangay Administrator for review.</p>
                        </div>
                        <Dialog onOpenChange={(open) => !open && setConfirmed(false)}>
                            <DialogTrigger asChild>
                                <Button variant="destructive">Request Account Deletion</Button>
                            </DialogTrigger>
                            <DialogContent>
                                {!confirmed ? (
                                    <>
                                        <DialogTitle>Request Account Deletion</DialogTitle>
                                        <DialogDescription>Your request will be reviewed by an authorized administrator. Your account will not be permanently deleted immediately.</DialogDescription>
                                        <DialogFooter>
                                            <Button type="button" variant="secondary" onClick={() => setConfirmed(false)}>Cancel</Button>
                                            <Button type="button" variant="destructive" onClick={() => setConfirmed(true)}>Continue</Button>
                                        </DialogFooter>
                                    </>
                                ) : (
                                    <Form action="/settings/account/deletion-request" method="post" options={{ preserveScroll: true }} className="space-y-5">
                                        {({ processing, errors }) => (
                                            <>
                                                <div>
                                                    <DialogTitle>Are you sure you want to request account deletion?</DialogTitle>
                                                    <DialogDescription>Your request will be reviewed by an authorized administrator. Your account will not be permanently deleted immediately.</DialogDescription>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="reason">Reason for deletion</Label>
                                                    <textarea id="reason" name="reason" required maxLength={2000} rows={5} className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" placeholder="Tell the administrator why you want to deactivate your account." />
                                                    <InputError message={errors.reason} />
                                                </div>
                                                <DialogFooter>
                                                    <Button type="button" variant="secondary" onClick={() => setConfirmed(false)}>Cancel</Button>
                                                    <Button type="submit" variant="destructive" disabled={processing}>Submit Deletion Request</Button>
                                                </DialogFooter>
                                            </>
                                        )}
                                    </Form>
                                )}
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </div>
        </>
    );
}

Account.layout = { breadcrumbs: [{ title: 'Dashboard', href: dashboard() }, { title: 'Account settings', href: '/settings/account' }] };
