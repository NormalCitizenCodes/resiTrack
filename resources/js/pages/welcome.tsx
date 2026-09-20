import { Head, Link, usePage } from '@inertiajs/react';
import { CopyCheck, LayoutDashboard, Layers, Users } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
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
                        <AppLogoIcon className="size-9" />
                        <span className="text-lg font-semibold tracking-tight">resiTrack</span>
                    </div>
                    <nav className="flex items-center gap-2">
                        <Button asChild variant="ghost" size="sm">
                            <Link href="/programs">Programs</Link>
                        </Button>
                        <ThemeToggle />
                        {!auth.user && (
                            <>
                                <Button asChild variant="ghost" size="sm">
                                    <Link href={login()}>Log in</Link>
                                </Button>
                                <Button asChild variant="outline" size="sm">
                                    <Link href={register()}>Register</Link>
                                </Button>
                            </>
                        )}
                    </nav>
                </header>

                <main className="mx-auto w-full max-w-6xl px-6">
                    <section className="py-16 text-center md:py-24">
                        <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
                            Barangay 22 · Cagayan de Oro City
                        </span>
                        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold uppercase leading-[1.1] tracking-tight md:text-6xl">
                            Track today.
                            <br />
                            <span className="text-primary">Brighter tomorrows.</span>
                        </h1>
                        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                            A smarter way to understand communities, track services, and turn local data into
                            meaningful action — for every resident, in every barangay.
                        </p>
                        <div className="mt-9 flex flex-wrap justify-center gap-3">
                            <Button asChild size="lg">
                                <Link href={auth.user ? '/programs' : login()}>
                                    {auth.user ? 'View Programs' : 'Access System'}
                                </Link>
                            </Button>
                            <Button asChild size="lg" variant="outline">
                                <a href="#features">Learn more</a>
                            </Button>
                        </div>
                    </section>

                    <section id="features" className="grid gap-4 pb-24 md:grid-cols-2">
                        {features.map((feature) => (
                            <div key={feature.title} className="rounded-lg border border-border bg-card p-6">
                                <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
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
