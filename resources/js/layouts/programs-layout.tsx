import { Link, usePage } from '@inertiajs/react';
import { LogIn } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { LanguageProvider } from '@/hooks/use-translation';
import AppLayout from '@/layouts/app-layout';
import { login, register } from '@/routes';

export default function ProgramsLayout({
    children,
    breadcrumbs = [],
}: {
    children: React.ReactNode;
    breadcrumbs?: { title: string; href: string }[];
}) {
    const { auth } = usePage().props;

    if (auth.user) {
        return <AppLayout breadcrumbs={breadcrumbs}>{children}</AppLayout>;
    }

    return (
        <LanguageProvider>
            <div className="min-h-svh bg-background text-foreground">
                <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
                    <Link
                        href="/"
                        className="flex items-center gap-2 font-semibold tracking-tight"
                    >
                        <AppLogoIcon className="size-9" />
                        resiTrack
                    </Link>
                    <nav className="flex flex-wrap items-center gap-1 text-sm sm:gap-2">
                        <Link
                            href="/programs"
                            className="rounded-md px-3 py-2 font-medium text-foreground"
                        >
                            Programs
                        </Link>
                        <Link
                            href={login()}
                            className="flex items-center gap-1 rounded-md px-3 py-2 text-muted-foreground hover:text-foreground"
                        >
                            <LogIn className="size-4" /> Log in
                        </Link>
                        <Link
                            href={register()}
                            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            Create Account
                        </Link>
                    </nav>
                </header>
                <main className="mx-auto w-full max-w-6xl">{children}</main>
            </div>
        </LanguageProvider>
    );
}
