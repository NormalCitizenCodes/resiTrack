import { Head, Link } from '@inertiajs/react';
import { CircleAlert, Home } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { SiteFooter } from '@/components/site-footer';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

const copy: Record<number, { title: string; message: string }> = {
    404: {
        title: 'Page not found',
        message: "The page you're looking for doesn't exist, or may have moved.",
    },
    403: {
        title: "You don't have access to this page",
        message: 'Your account role or barangay assignment does not allow this.',
    },
    500: {
        title: 'Something went wrong',
        message: 'An unexpected error occurred on our end. Please try again in a moment.',
    },
    503: {
        title: 'Down for maintenance',
        message: "resiTrack is briefly unavailable while we make some updates. We'll be back shortly.",
    },
};

export default function ErrorPage({ status }: { status: number }) {
    const { title, message } = copy[status] ?? copy[500];

    return (
        <>
            <Head title={title} />
            <div className="flex min-h-screen flex-col bg-background bg-page-gradient text-foreground">
                <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 p-4 sm:p-6">
                    <Link href="/" className="flex items-center gap-2">
                        <AppLogoIcon className="size-9" />
                        <span className="text-lg font-semibold tracking-tight">resiTrack</span>
                    </Link>
                    <ThemeToggle />
                </header>

                <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 pb-24 text-center">
                    <span className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
                        <CircleAlert className="size-8 text-destructive" aria-hidden="true" />
                    </span>
                    <p className="mt-6 text-sm font-semibold tracking-widest text-muted-foreground uppercase">Error {status}</p>
                    <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
                    <p className="mt-3 leading-7 text-muted-foreground">{message}</p>
                    <Button asChild className="mt-8">
                        <Link href="/">
                            <Home className="size-4" />
                            Back to home
                        </Link>
                    </Button>
                </main>

                <SiteFooter />
            </div>
        </>
    );
}
