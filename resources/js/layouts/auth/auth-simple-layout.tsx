import { Link } from '@inertiajs/react';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(280px,0.82fr)_minmax(420px,1fr)]">
            <aside className="relative hidden overflow-hidden bg-sidebar p-10 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
                <div className="absolute -right-24 -top-24 size-72 rounded-full border-[32px] border-sidebar-primary/10" />
                <div className="relative">
                    <Link href={home()} className="inline-flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-md bg-sidebar-primary text-sm font-bold tracking-tight text-sidebar-primary-foreground">
                            RT
                        </span>
                        <span className="text-lg font-semibold tracking-tight">ResiTrack</span>
                    </Link>
                    <div className="mt-24 max-w-sm">
                        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-sidebar-primary">
                            Barangay information system
                        </p>
                        <h2 className="text-4xl font-semibold leading-tight tracking-tight">
                            Better records. Better reach.
                        </h2>
                        <p className="mt-5 max-w-xs text-sm leading-6 text-sidebar-foreground/65">
                            A clear, shared view of residents, households, and services for the people who serve them.
                        </p>
                    </div>
                </div>
                <p className="relative text-xs text-sidebar-foreground/45">Cagayan de Oro City · Community services</p>
            </aside>

            <main className="flex items-center justify-center px-6 py-12 sm:px-10">
                <div className="w-full max-w-md">
                    <div className="mb-10 lg:hidden">
                        <Link href={home()} className="inline-flex items-center gap-3 text-lg font-semibold tracking-tight">
                            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-sm font-bold tracking-tight text-primary-foreground">RT</span>
                            ResiTrack
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
