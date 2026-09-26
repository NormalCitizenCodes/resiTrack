import { Link, router } from '@inertiajs/react';
import { ArrowLeft, Clock, FileHeart, HandHeart, Info, LayoutGrid, LogIn, LogOut, Megaphone, RefreshCw, UserRound, Wifi } from 'lucide-react';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { LoginArt, MaintenanceArt, NotFoundArt, OfflineArt, RestrictedArt, ServerErrorArt } from '@/components/error-art';
import { Button } from '@/components/ui/button';
import { dashboard, login, logout } from '@/routes';

export type ErrorKind = 'notfound' | 'server' | 'restricted' | 'login' | 'maintenance' | 'offline';

type Help = { icon: ComponentType<SVGProps<SVGSVGElement>>; title?: string; text: string };

export const KINDS: Record<ErrorKind, { code: string; title: string; text: string; art: ComponentType; help?: Help }> = {
    notfound: {
        code: '404',
        title: 'Page not found.',
        text: "The page you're looking for doesn't exist or may have moved.",
        art: NotFoundArt,
    },
    server: {
        code: '500',
        title: 'Something went wrong.',
        text: 'We hit an unexpected error on our side. Please try again in a moment.',
        art: ServerErrorArt,
        help: { icon: Info, text: 'If the problem persists, please contact your barangay staff or try again later.' },
    },
    restricted: {
        code: '403',
        title: 'Access restricted.',
        text: "You don't have permission to access this page. Please use an authorized account or contact your barangay staff.",
        art: RestrictedArt,
        help: { icon: UserRound, title: 'Need access?', text: 'If you believe this is a mistake, please contact your barangay administrator for assistance.' },
    },
    login: {
        code: '401',
        title: 'Please log in.',
        text: 'You need to log in to access this page.',
        art: LoginArt,
        help: { icon: Info, title: "Don't have an account yet?", text: 'Sign up online, then visit your Barangay Hall to be verified in person.' },
    },
    maintenance: {
        code: '503',
        title: 'Service temporarily unavailable.',
        text: 'Our system is currently under maintenance. Please try again later.',
        art: MaintenanceArt,
        help: { icon: Clock, title: "We'll be back shortly.", text: 'Thank you for your patience while we improve resiTrack.' },
    },
    offline: {
        code: '',
        title: 'No internet connection.',
        text: 'Please check your connection and try again.',
        art: OfflineArt,
        help: { icon: Wifi, title: 'Still having trouble?', text: 'Make sure you are connected to the internet and try again. You can also contact your barangay staff for assistance.' },
    },
};

export const STATUS_KIND: Record<number, ErrorKind> = { 401: 'login', 403: 'restricted', 404: 'notfound', 500: 'server', 503: 'maintenance' };

const QUICK_LINKS = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    { label: 'Programs', href: '/programs', icon: HandHeart },
    { label: 'My Applications', href: '/my-applications', icon: FileHeart },
    { label: 'Announcements', href: '/announcements', icon: Megaphone },
];

function tryAgain() {
    window.location.reload();
}

function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        router.visit('/');
    }
}

/**
 * The whole error screen, shared by the status pages and the no-internet
 * overlay. It uses plain links where a page navigation is safe, so it also
 * works outside the Inertia app (the offline overlay is mounted above it).
 */
export function ErrorScreen({ kind, detail, signedIn = false, overlay = false }: { kind: ErrorKind; detail?: string | null; signedIn?: boolean; overlay?: boolean }) {
    const { code, title, text, art: Art, help } = KINDS[kind];
    const home = signedIn ? { href: dashboard().url, label: 'Go to Dashboard', icon: LayoutGrid } : { href: '/', label: 'Go to Home', icon: LayoutGrid };

    let actions: ReactNode;

    switch (kind) {
        case 'login':
            actions = (
                <>
                    <Button asChild size="lg">
                        <a href={login().url}>
                            <LogIn className="size-4" /> Log In
                        </a>
                    </Button>
                    <Button asChild size="lg" variant="outline">
                        <a href="/">Go to Home</a>
                    </Button>
                </>
            );
            break;
        case 'restricted':
            actions = (
                <>
                    <Button asChild size="lg">
                        <a href={home.href}>
                            <home.icon className="size-4" /> {home.label}
                        </a>
                    </Button>
                    {signedIn && (
                        <Button asChild size="lg" variant="outline">
                            <Link href={logout()} method="post" as="button" onClick={() => router.flushAll()}>
                                <LogOut className="size-4" /> Log Out
                            </Link>
                        </Button>
                    )}
                </>
            );
            break;
        case 'notfound':
            actions = (
                <>
                    <Button asChild size="lg">
                        <a href={home.href}>
                            <home.icon className="size-4" /> {home.label}
                        </a>
                    </Button>
                    <Button size="lg" variant="outline" onClick={goBack}>
                        Go Back
                    </Button>
                </>
            );
            break;
        default:
            actions = (
                <>
                    <Button size="lg" onClick={tryAgain}>
                        <RefreshCw className="size-4" /> Try Again
                    </Button>
                    <Button asChild size="lg" variant="outline">
                        <a href={home.href}>{signedIn ? 'Go to Dashboard' : 'Go to Home'}</a>
                    </Button>
                </>
            );
    }

    return (
        <div className={overlay ? 'fixed inset-0 z-[200] overflow-y-auto bg-background bg-page-gradient p-4 sm:p-8' : 'min-h-svh bg-background bg-page-gradient p-4 sm:p-8'}>
            <div className="mx-auto max-w-5xl rounded-3xl border bg-card/90 p-6 shadow-lg shadow-brand-navy/5 sm:p-10">
                <header className="flex items-center justify-between gap-3">
                    <a href="/" className="flex items-center gap-2">
                        <AppLogoIcon className="size-9" />
                        <span className="text-lg font-semibold tracking-tight">resiTrack</span>
                    </a>
                    <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="size-4" aria-hidden="true" /> Back to Home
                    </a>
                </header>

                <div className="mt-8 grid items-center gap-8 md:mt-12 md:grid-cols-[1.1fr_1fr]">
                    <div>
                        {code && <p className="text-7xl leading-none font-extrabold tracking-tight text-brand-navy/25 sm:text-8xl dark:text-white/20">{code}</p>}
                        <h1 className={code ? 'mt-4 text-3xl font-bold tracking-tight sm:text-4xl' : 'text-3xl font-bold tracking-tight sm:text-4xl'}>{title}</h1>
                        <p className="mt-3 max-w-md leading-7 text-muted-foreground">{text}</p>
                        {detail && (
                            <p role="note" className="mt-4 max-w-md rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-text">
                                {detail}
                            </p>
                        )}
                        <div className="mt-8 flex flex-wrap gap-3">{actions}</div>
                    </div>
                    <div className="mx-auto w-full max-w-sm md:max-w-none">
                        <Art />
                    </div>
                </div>

                {kind === 'notfound' ? (
                    <nav aria-label="Quick links" className="mt-10 rounded-2xl bg-muted/50 p-5">
                        <p className="mb-3 text-sm font-semibold">Quick Links</p>
                        <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
                            {QUICK_LINKS.map((link) => (
                                <li key={link.href}>
                                    <a href={link.href} className="flex items-center gap-2 hover:text-foreground">
                                        <link.icon className="size-4" aria-hidden="true" /> {link.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                ) : (
                    help && (
                        <div className="mt-10 flex items-start gap-4 rounded-2xl bg-muted/50 p-5">
                            <help.icon className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
                            <div className="text-sm">
                                {help.title && <p className="font-semibold">{help.title}</p>}
                                <p className="text-muted-foreground">{help.text}</p>
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}
