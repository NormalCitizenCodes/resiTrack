import { Head, Link, usePage } from '@inertiajs/react';
import { CopyCheck, LayoutDashboard, Layers, ShieldCheck, Users } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { login, register } from '@/routes';

const features = [
    {
        icon: Users,
        title: 'Resident Profiling',
        description:
            'Digital RBI records for households and residents, replacing fragmented paper-based systems with validated data.',
    },
    {
        icon: Layers,
        title: 'Compound Vulnerability',
        description:
            'Automatically classifies residents into multiple sectors at once — Senior, PWD, OSY, Solo Parent, Pregnant.',
    },
    {
        icon: CopyCheck,
        title: 'Duplicate & Transfer Detection',
        description:
            'Screens every record across barangays to catch duplicates and cross-barangay transfers before they distort aid.',
    },
    {
        icon: LayoutDashboard,
        title: 'Data-Driven Dashboard',
        description:
            'Live sector counts and age distribution so officials can distribute social services by actual need, not by area.',
    },
];

export default function Welcome() {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Welcome" />
            <div className="min-h-screen bg-background text-foreground">
                <header className="mx-auto flex w-full max-w-6xl items-center justify-between p-6">
                    <div className="flex items-center gap-2">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <ShieldCheck className="size-5" />
                        </span>
                        <span className="text-lg font-semibold tracking-tight">resiTrack</span>
                    </div>
                    <nav className="flex items-center gap-3">
                        <Link href="/programs" className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                            Programs
                        </Link>
                        <ThemeToggle />
                        {!auth.user && (
                            <>
                                <Link
                                    href={login()}
                                    className="rounded-md px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                                >
                                    Log in
                                </Link>
                                <Link
                                    href={register()}
                                    className="rounded-md border border-border px-5 py-2 text-sm font-medium hover:border-foreground/40"
                                >
                                    Register
                                </Link>
                            </>
                        )}
                    </nav>
                </header>

                <main className="mx-auto w-full max-w-6xl px-6">
                    <section className="py-16 text-center md:py-24">
                        <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
                            Barangay 22 · Cagayan de Oro City
                        </span>
                        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
                            Resident profiling for{' '}
                            <span className="text-primary">equitable social services</span>
                        </h1>
                        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
                            A web- and mobile-based system that profiles vulnerable residents, detects duplicate and
                            transferred records, and turns barangay data into fair, data-driven decisions.
                        </p>
                        <div className="mt-8 flex justify-center gap-3">
                            <Link
                                href={auth.user ? '/programs' : login()}
                                className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                            >
                                {auth.user ? 'View Programs' : 'Get Started'}
                            </Link>
                            <a
                                href="#features"
                                className="rounded-md border border-border px-6 py-2.5 text-sm font-medium hover:border-foreground/40"
                            >
                                Learn more
                            </a>
                        </div>
                    </section>

                    <section id="features" className="grid gap-4 pb-24 md:grid-cols-2">
                        {features.map((feature) => (
                            <div key={feature.title} className="rounded-xl border border-border bg-card/50 p-6">
                                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <feature.icon className="size-5" />
                                </span>
                                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                                <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
                            </div>
                        ))}
                    </section>
                </main>

                <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
                    resiTrack — A Resident Profiling System for Data-Driven Social Service Distribution
                </footer>
            </div>
        </>
    );
}
