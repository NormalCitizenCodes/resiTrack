import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type Props = { token: string; email: string };

export default function RecoveryPassword({ token, email }: Props) {
    return (
        <>
            <Head title="Create New Password" />
            <div className="mb-6 rounded-md border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
                Identity verified by the BHW. The resident should enter their new password privately on this device.
            </div>
            <Form action={`/account-recovery/password/${token}`} method="post" resetOnSuccess={['password', 'password_confirmation']}>
                {({ processing, errors }) => (
                    <div className="grid gap-6">
                        <p className="text-sm text-muted-foreground">Account: <span className="font-medium text-foreground">{email}</span></p>
                        <div className="grid gap-2"><Label htmlFor="password">New Password</Label><PasswordInput id="password" name="password" required autoFocus autoComplete="new-password" /><InputError message={errors.password} /></div>
                        <div className="grid gap-2"><Label htmlFor="password_confirmation">Confirm Password</Label><PasswordInput id="password_confirmation" name="password_confirmation" required autoComplete="new-password" /><InputError message={errors.password_confirmation} /></div>
                        <Button type="submit" className="w-full" disabled={processing}>{processing && <Spinner />}Change Password</Button>
                    </div>
                )}
            </Form>
        </>
    );
}

RecoveryPassword.layout = { title: 'Create New Password', description: 'Set a new password after identity verification' };
