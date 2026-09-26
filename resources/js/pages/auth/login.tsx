import { Form, Head, Link } from '@inertiajs/react';
import { ArrowRight, Lock, UserRound } from 'lucide-react';
import { GoogleIcon } from '@/components/google-icon';
import { IconInput } from '@/components/icon-input';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { redirect as googleRedirect } from '@/routes/auth/google';
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
            <Head title="Log in" />

            <a
                href={googleRedirect().url}
                className="mb-5 flex w-full items-center justify-center gap-2.5 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
            >
                <GoogleIcon className="size-4" />
                Continue with Google
            </a>

            <div className="mb-5 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
            </div>

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Resident ID or Email</Label>
                                <IconInput
                                    icon={<UserRound />}
                                    id="email"
                                    type="text"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="username"
                                    placeholder="RES0182600045 or email@example.com"
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
                                    icon={<Lock />}
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
                                {processing ? <Spinner /> : null}
                                Log in
                                {!processing && <ArrowRight className="size-4" />}
                            </Button>
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
    title: 'Welcome back',
    description: 'Log in with your Resident ID or email.',
    tab: 'login',
};
