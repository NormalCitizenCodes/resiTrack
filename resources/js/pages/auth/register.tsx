import { Form, Head } from '@inertiajs/react';
import { ArrowRight, BadgeCheck, Lock, Mail, UserRound } from 'lucide-react';
import { useState } from 'react';
import { GoogleIcon } from '@/components/google-icon';
import { IconInput } from '@/components/icon-input';
import InputError from '@/components/input-error';
import { PasswordChecklist } from '@/components/password-checklist';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { redirect as googleRedirect } from '@/routes/auth/google';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
    barangays: { id: number; name: string }[];
};

export default function Register({ passwordRules, barangays }: Props) {
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');

    return (
        <>
            <Head title="Sign up" />

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
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <p className="flex items-start gap-2.5 rounded-lg border border-info/40 bg-info/10 p-3 text-sm leading-5">
                            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-info-text" aria-hidden="true" />
                            <span>
                                After you sign up, check your email to verify your account. You'll finish your
                                official profile in person at the Barangay Hall with a valid ID.
                            </span>
                        </p>

                        <div className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="barangay_id">Barangay</Label>
                                <Select name="barangay_id" required>
                                    <SelectTrigger id="barangay_id" className="w-full">
                                        <SelectValue placeholder="Select your barangay" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {barangays.map((barangay) => (
                                            <SelectItem key={barangay.id} value={String(barangay.id)}>
                                                {barangay.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.barangay_id} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="name">Full name</Label>
                                <IconInput
                                    icon={<UserRound />}
                                    id="name"
                                    type="text"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="name"
                                    name="name"
                                    placeholder="Juan Dela Cruz"
                                />
                                <InputError message={errors.name} className="mt-2" />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email address</Label>
                                <IconInput
                                    icon={<Mail />}
                                    id="email"
                                    type="email"
                                    required
                                    tabIndex={2}
                                    autoComplete="email"
                                    name="email"
                                    placeholder="email@example.com"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">Password</Label>
                                <PasswordInput
                                    icon={<Lock />}
                                    id="password"
                                    required
                                    tabIndex={3}
                                    autoComplete="new-password"
                                    name="password"
                                    placeholder="Create a password"
                                    passwordrules={passwordRules}
                                    onChange={(event) => setPassword(event.target.value)}
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">Confirm password</Label>
                                <PasswordInput
                                    icon={<Lock />}
                                    id="password_confirmation"
                                    required
                                    tabIndex={4}
                                    autoComplete="new-password"
                                    name="password_confirmation"
                                    placeholder="Type it again"
                                    passwordrules={passwordRules}
                                    onChange={(event) => setConfirmation(event.target.value)}
                                />
                                <InputError message={errors.password_confirmation} />
                            </div>

                            <PasswordChecklist rules={passwordRules} password={password} confirmation={confirmation} />

                            <Button
                                type="submit"
                                className="w-full"
                                tabIndex={5}
                                data-test="register-user-button"
                            >
                                {processing ? <Spinner /> : null}
                                Create account
                                {!processing && <ArrowRight className="size-4" />}
                            </Button>
                        </div>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Create your account',
    description: 'Register online, then verify at your Barangay Hall.',
    tab: 'register',
};
