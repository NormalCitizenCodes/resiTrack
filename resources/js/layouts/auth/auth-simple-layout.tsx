import { Link } from '@inertiajs/react';
import { BadgeCheck, Lock, Target } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';
import { home, login, register } from '@/routes';
import type { AuthLayoutProps } from '@/types';

const trustPoints = [
    { icon: BadgeCheck, text: 'Residents are verified in person at the Barangay Hall' },
    { icon: Lock, text: 'Access is limited by role and by barangay' },
    { icon: Target, text: 'Programs are matched to the residents who qualify' },
];

/** Log in / Sign up switch. Two real pages styled as tabs, so the browser back button and links keep working. */
function AuthTabs({ active }: { active: 'login' | 'register' }) {
    const tab = (isActive: boolean) =>
        cn(
            'relative z-10 flex-1 rounded-md px-3 py-2 text-center text-sm font-semibold transition-colors duration-300',
            isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
        );

    return (
        <nav aria-label="Account" className="relative mb-6 flex gap-1 rounded-lg bg-muted p-1">
            {/* The white pill slides between the two tabs. The layout stays mounted across both pages, so this transitions. */}
            <span
                aria-hidden="true"
                className={cn(
                    'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-card shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none',
                    active === 'register' && 'translate-x-[calc(100%+0.25rem)]',
                )}
            />
            <Link href={login()} className={tab(active === 'login')} aria-current={active === 'login' ? 'page' : undefined}>
                Log in
            </Link>
            <Link
                href={register()}
                className={tab(active === 'register')}
                aria-current={active === 'register' ? 'page' : undefined}
            >
                Sign up
            </Link>
        </nav>
    );
}

export default function AuthSimpleLayout({
    children,
    title,
    description,
    tab,
}: AuthLayoutProps) {
    return (
        <div className="grid min-h-svh bg-background bg-page-gradient lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)]">
            <aside className="relative hidden overflow-hidden bg-brand-navy bg-brand-gradient p-10 text-white lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:justify-between lg:self-start">
                {/* The city in the brand blue, rising from the bottom edge under the text. */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] opacity-30 mix-blend-luminosity [mask-image:linear-gradient(to_top,black_35%,transparent)]"
                >
                    <img
                        src="/images/landing/cdo.webp"
                        srcSet="/images/landing/cdo-960.webp 960w, /images/landing/cdo.webp 1672w"
                        sizes="34vw"
                        width={1672}
                        height={941}
                        alt=""
                        decoding="async"
                        className="size-full object-cover object-bottom"
                    />
                </div>
                <BrandPath />
                <div className="relative">
                    <Link href={home()} className="inline-flex items-center gap-3">
                        <AppLogoIcon className="size-10 rounded-md bg-white/95 p-1" />
                        <span className="text-lg font-semibold tracking-tight">resiTrack</span>
                    </Link>
                    <div className="mt-24 max-w-sm">
                        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan">
                            Barangay information system
                        </p>
                        <h2 className="text-4xl font-bold leading-tight tracking-tight">
                            Track today.
                            <br />
                            Brighter tomorrows.
                        </h2>
                        <p className="mt-5 max-w-xs text-sm leading-6 text-white/70">
                            A clear, shared view of residents, households, and services for the people who serve them.
                        </p>
                        <ul className="mt-8 max-w-xs space-y-3">
                            {trustPoints.map((point) => (
                                <li key={point.text} className="flex items-start gap-3 text-sm text-white/85">
                                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-white/12">
                                        <point.icon className="size-3.5 text-brand-cyan" aria-hidden="true" />
                                    </span>
                                    {point.text}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <p className="relative text-xs font-medium text-white/85 [text-shadow:0_1px_8px_rgb(5_25_90/0.9)]">Cagayan de Oro City · Community services</p>
            </aside>

            <main className="relative flex flex-col items-center justify-center px-4 py-10 sm:px-8">

                <div className="absolute top-4 right-4 sm:top-6 sm:right-8">
                    <ThemeToggle />
                </div>

                <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg shadow-brand-navy/10 sm:p-8">
                    <div className="mb-6 flex flex-col items-center text-center">
                        <Link href={home()} aria-label="resiTrack home">
                            <AppLogoIcon className="size-14 rounded-xl bg-primary/10 p-2" />
                        </Link>
                        <h1 className="mt-4 text-2xl font-bold tracking-tight">{title}</h1>
                        {description && <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>}
                    </div>

                    {tab && <AuthTabs active={tab} />}

                    {children}
                </div>

                <p className="mt-6 max-w-md rounded-lg bg-card/70 px-3 py-1.5 text-center text-xs leading-5 text-muted-foreground backdrop-blur-sm">
                    By continuing you agree to the{' '}
                    <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
                        Terms of Use
                    </Link>{' '}
                    and the{' '}
                    <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
                        Privacy Notice
                    </Link>
                    .
                </p>
            </main>
        </div>
    );
}

/**
 * The logo's path motif as a background graphic - brand spec section 28 allows it on
 * login/landing surfaces, kept subtle and never inside the app itself.
 */
function BrandPath() {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 400 600"
            preserveAspectRatio="xMidYMax slice"
            className="pointer-events-none absolute inset-0 size-full opacity-[0.16]"
        >
            <path d="M-40 250 C 120 250, 240 360, 300 640" fill="none" stroke="var(--color-brand-cyan)" strokeWidth="26" strokeLinecap="round" />
            <path d="M-40 250 C 160 270, 300 400, 420 620" fill="none" stroke="var(--color-brand-green)" strokeWidth="18" strokeLinecap="round" />
        </svg>
    );
}
