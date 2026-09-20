import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(280px,0.82fr)_minmax(420px,1fr)]">
            <aside className="relative hidden overflow-hidden bg-brand-navy p-10 text-white lg:flex lg:flex-col lg:justify-between">
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
                    </div>
                </div>
                <p className="relative text-xs text-white/50">Cagayan de Oro City · Community services</p>
            </aside>

            <main className="flex items-center justify-center px-6 py-12 sm:px-10">
                <div className="w-full max-w-md">
                    <div className="mb-10 lg:hidden">
                        <Link href={home()} className="inline-flex items-center gap-3 text-lg font-semibold tracking-tight">
                            <AppLogoIcon className="size-10" />
                            resiTrack
                        </Link>
                    </div>
                    <div className="mb-8 space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    {children}
                </div>
            </main>
        </div>
    );
}

/**
 * The logo's path motif as a background graphic — brand spec §28 allows it on
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
