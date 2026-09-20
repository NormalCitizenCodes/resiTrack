import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { SiteFooter } from '@/components/site-footer';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

/** Shell for the public, logged-out pages (privacy, terms, FAQ): header, readable column, footer. */
export function PublicPage({
    title,
    intro,
    children,
}: {
    title: string;
    intro?: string;
    children: ReactNode;
}) {
    return (
        <>
            <Head title={title} />
            <div className="flex min-h-screen flex-col bg-background bg-page-gradient text-foreground">
                <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 p-4 sm:p-6">
                    <Link href="/" className="flex items-center gap-2">
                        <AppLogoIcon className="size-9" />
                        <span className="text-lg font-semibold tracking-tight">resiTrack</span>
                    </Link>
                    <nav className="flex items-center gap-1 sm:gap-2">
                        <ThemeToggle />
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/">Back to home</Link>
                        </Button>
                    </nav>
                </header>

                <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-16 sm:px-6">
                    <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
                    {intro && <p className="mt-3 text-base leading-7 text-muted-foreground md:text-lg">{intro}</p>}
                    <div className="mt-8">{children}</div>
                </main>

                <SiteFooter />
            </div>
        </>
    );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="mt-10 first:mt-0">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            <div className="mt-3 space-y-3 leading-7 text-muted-foreground [&_li]:pl-1 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                {children}
            </div>
        </section>
    );
}
