import { Form, Head, Link } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    error?: string;
    canResetPassword: boolean;
};

function AccountDeactivatedNotice({ message }: { message: string }) {
    return (
        <div className="mt-6 space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
            <p className="font-semibold text-destructive">Account Deactivated</p>
            <p className="whitespace-pre-line">{message.replace('Account Deactivated. ', '')}</p>
            <div>
                <p className="font-medium">What should I do?</p>
                <ol className="mt-1 list-inside list-decimal space-y-1 text-muted-foreground">
                    <li>Visit your Barangay Hall.</li>
                    <li>Approach a Barangay Secretary, Barangay Administrator, or authorized BHW.</li>
                    <li>Tell them that your Resident Account has been deactivated.</li>
                    <li>The barangay staff will verify your identity and account.</li>
                    <li>After verification, the Barangay Admin/Secretary may reactivate your account if appropriate.</li>
                </ol>
            </div>
            <p className="text-muted-foreground">Please provide your full name and registered email address so the barangay staff can locate your account and verify your information.</p>
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/account-reactivation/request">Request Account Reactivation</Link>
                    </Button>
        </div>
    );
}

export default function Login({ status, error, canResetPassword }: Props) {
    return (
        <>
            <Head title="Resident Portal Login" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Resident ID or Email</Label>
                                <Input
                                    id="email"
                                    type="text"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="username"
                                    placeholder="RES-2026-000123 or email@example.com"
                                />
                                {!errors.email?.startsWith('Account Deactivated.') && (
                                    <InputError message={errors.email} />
                                )}
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-sm"
                                            tabIndex={5}
                                        >
                                            Forgot Password?
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Password"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                />
                                <Label htmlFor="remember">Remember me</Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 w-full"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Log in
                            </Button>
                        </div>

                        <div className="text-center text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <TextLink href={register()} tabIndex={5}>
                                Sign up
                            </TextLink>
                        </div>
                        {errors.email?.startsWith('Account Deactivated.') && (
                            <AccountDeactivatedNotice message={errors.email} />
                        )}
                    </>
                )}
            </Form>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
            {error?.startsWith('Account Deactivated.') && (
                <AccountDeactivatedNotice message={error} />
            )}
        </>
    );
}

Login.layout = {
    title: 'Welcome to resiTrack',
    description: 'Resident Portal',
};
