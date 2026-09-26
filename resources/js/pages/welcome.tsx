import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeCheck,
    Check,
    CopyCheck,
    HandHeart,
    LayoutDashboard,
    Layers,
    Lock,
    Menu,
    ScrollText,
    ShieldCheck,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { MouseEvent } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { CountUp } from '@/components/count-up';
import { IntroSplash } from '@/components/intro-splash';
import { ScrollReveal } from '@/components/scroll-reveal';
import { SiteFooter } from '@/components/site-footer';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { login, register } from '@/routes';

type Stats = { residents: number; households: number; programs: number; agencies: number };

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
            'Automatically classifies residents into multiple sectors at once: Senior, PWD, OSY, Solo Parent, Pregnant.',
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

const residentSteps = [
    {
        icon: UserPlus,
        title: 'Create an account',
        description: 'Register online and choose your barangay. It only takes a few minutes.',
    },
    {
        icon: BadgeCheck,
        title: 'Verify at the Barangay Hall',
        description:
            'Bring a valid ID, and a sitio clearance if needed. A Barangay Health Worker completes your official profile.',
    },
    {
        icon: HandHeart,
        title: 'Access programs and updates',
        description: 'See the programs you qualify for, apply online, and get announcements from your barangay.',
    },
];

const before = [
    'Paper lists that go out of date',
    'The same person on several lists',
    'Claims that are hard to verify',
    'Slots given out by guesswork',
];

const after = [
    'Residents verified in person at the Barangay Hall',
    'Duplicates caught across barangays',
    'Eligible residents matched automatically by sector',
    'Every approval recorded',
];

const agencySteps = [
    { title: 'Publish a program', description: 'Set the sectors it serves, the barangay, the dates and the number of slots.' },
    { title: 'Eligible residents are matched', description: 'The system finds residents whose verified profile fits your criteria.' },
    { title: 'Residents and barangay staff apply', description: 'Residents apply themselves, or a Barangay Health Worker endorses them.' },
    { title: 'You review and decide', description: 'Approve or reject each application. Approved residents become recorded beneficiaries.' },
];

const trust = [
    {
        icon: BadgeCheck,
        title: 'Verified in person',
        description: 'A resident is only linked to an official record after a Barangay Health Worker meets them and checks their ID.',
    },
    {
        icon: CopyCheck,
        title: 'Checked across barangays',
        description: 'Every new record is compared against all barangays, so one person cannot receive the same benefit twice.',
    },
    {
        icon: ScrollText,
        title: 'Every action on record',
        description: 'Registrations, approvals and changes are written to an audit trail that shows who did what and when.',
    },
    {
        icon: Lock,
        title: 'Your programs, your data',
        description: 'An agency only sees and manages its own programs and applications. Personal details stay with barangay staff.',
    },
];

const navLinks = [
    { label: 'For agencies', href: '#partners', internal: false },
    { label: 'How it works', href: '#how-it-works', internal: false },
    { label: 'Programs', href: '/programs', internal: true },
];

function MobileMenu({ isGuest }: { isGuest: boolean }) {
    const [open, setOpen] = useState(false);

    // While the drawer is open the page cannot scroll, so a plain #anchor jump is
    // swallowed. Close the drawer first, then scroll once it has finished closing.
    const goToSection = (hash: string) => (event: MouseEvent) => {
        event.preventDefault();
        setOpen(false);
        window.setTimeout(() => {
            document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' });
            window.history.replaceState(null, '', hash);
        }, 320);
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Open menu">
                    <Menu className="size-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 max-w-[85vw] p-0">
                <SheetHeader className="border-b border-border p-4">
                    <SheetTitle className="flex items-center gap-2">
                        <AppLogoIcon className="size-8" />
                        resiTrack
                    </SheetTitle>
                </SheetHeader>
                <nav aria-label="Menu" className="flex flex-col gap-1 p-3">
                    {navLinks.map((link) =>
                        link.internal ? (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="rounded-md px-3 py-3 text-base font-medium hover:bg-accent"
                            >
                                {link.label}
                            </Link>
                        ) : (
                            <a
                                key={link.label}
                                href={link.href}
                                onClick={goToSection(link.href)}
                                className="rounded-md px-3 py-3 text-base font-medium hover:bg-accent"
                            >
                                {link.label}
                            </a>
                        ),
                    )}
                    {isGuest && (
                        <Button asChild variant="outline" size="lg" className="mt-3">
                            <Link href={register()}>Register as resident</Link>
                        </Button>
                    )}
                </nav>
            </SheetContent>
        </Sheet>
    );
}

/** Real screenshots of the app (sample data only), framed as a browser and a phone. */
function DeviceMockups() {
    return (
        <div className="relative mx-auto w-full max-w-xl pb-16 sm:pb-20">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-brand-navy/20">
                <div className="flex items-center gap-1.5 border-b border-border bg-muted px-3 py-2" aria-hidden="true">
                    <span className="size-2.5 rounded-full bg-border" />
                    <span className="size-2.5 rounded-full bg-border" />
                    <span className="size-2.5 rounded-full bg-border" />
                </div>
                <img
                    src="/images/landing/dashboard.webp"
                    alt="The resiTrack dashboard for barangay staff, showing resident, household and duplicate alert totals with age and vulnerable sector charts."
                    width={1920}
                    height={900}
                    className="block w-full"
                />
            </div>
            <div className="absolute right-2 bottom-0 aspect-[9/17] w-[30%] overflow-hidden rounded-[1.4rem] border-[5px] border-slate-900 bg-slate-900 shadow-2xl shadow-black/30 sm:right-4">
                <img
                    src="/images/landing/phone.webp"
                    alt="The resiTrack resident dashboard on a phone, showing a verified profile and quick links to programs, applications and profile."
                    width={780}
                    height={1688}
                    className="block size-full object-cover object-top"
                />
            </div>
        </div>
    );
}

function Screenshot({ src, alt, caption, width, height }: { src: string; alt: string; caption: string; width: number; height: number }) {
    return (
        <figure>
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-brand-navy/10 transition-transform duration-300 hover:-translate-y-1">
                <img src={src} alt={alt} width={width} height={height} loading="lazy" className="block w-full" />
            </div>
            <figcaption className="mt-3 text-sm text-muted-foreground">{caption}</figcaption>
        </figure>
    );
}

export default function Welcome({ stats }: { stats: Stats }) {
    const { auth } = usePage().props;

    const numbers = [
        { value: stats.residents, label: 'Residents profiled' },
        { value: stats.households, label: 'Households registered' },
        { value: stats.programs, label: 'Programs open' },
        { value: stats.agencies, label: 'Partner agencies' },
    ];

    return (
        <>
            <Head title="Welcome" />
            <div className="min-h-screen bg-background bg-page-gradient text-foreground">
                <IntroSplash />
                <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 p-4 sm:p-6">
                    <Link href="/" id="site-logo" className="flex shrink-0 items-center gap-2">
                        <AppLogoIcon className="size-9" />
                        <span className="text-lg font-semibold tracking-tight">resiTrack</span>
                    </Link>

                    {/* Wide screens: every link inline. */}
                    <nav aria-label="Main" className="hidden items-center gap-2 md:flex">
                        {navLinks.map((link) => (
                            <Button key={link.label} asChild variant="ghost" size="sm">
                                {link.internal ? <Link href={link.href}>{link.label}</Link> : <a href={link.href}>{link.label}</a>}
                            </Button>
                        ))}
                        <ThemeToggle />
                        {!auth.user && (
                            <Button asChild variant="ghost" size="sm">
                                <Link href={login()}>Log in</Link>
                            </Button>
                        )}
                    </nav>

                    {/* Phones and small tablets: the one action that matters stays visible, the rest go in a menu. */}
                    <div className="flex items-center gap-2 md:hidden">
                        <ThemeToggle />
                        {!auth.user && (
                            <Button asChild size="sm">
                                <Link href={login()}>Log in</Link>
                            </Button>
                        )}
                        <MobileMenu isGuest={!auth.user} />
                    </div>
                </header>

                <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
                    <section className="grid items-center gap-12 py-10 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:py-20">
                        <div>
                            <h1 className="text-4xl font-bold uppercase leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                                {['Track', 'today.'].map((word, i) => (
                                    <span key={word} className="intro-gate intro-word" style={{ '--intro-delay': `${150 + i * 90}ms` } as React.CSSProperties}>
                                        {word}
                                        {' '}
                                    </span>
                                ))}
                                <br />
                                {['Brighter', 'tomorrows.'].map((word, i) => (
                                    <span
                                        key={word}
                                        className="intro-gate intro-word text-primary"
                                        style={{ '--intro-delay': `${420 + i * 90}ms` } as React.CSSProperties}
                                    >
                                        {word}
                                        {i === 0 ? ' ' : ''}
                                    </span>
                                ))}
                            </h1>
                            <p
                                className="intro-gate animate-in fade-in-0 slide-in-from-bottom-4 mt-6 max-w-lg text-base leading-7 text-muted-foreground duration-700 delay-[700ms] fill-mode-both motion-reduce:animate-none md:text-lg"
                            >
                                A smarter way to understand communities, track services, and turn local data into
                                meaningful action, for every resident in every barangay.
                            </p>
                            <div
                                className="intro-gate animate-in fade-in-0 slide-in-from-bottom-4 mt-8 flex flex-wrap gap-3 duration-700 delay-[900ms] fill-mode-both motion-reduce:animate-none"
                            >
                                <Button
                                    asChild
                                    size="lg"
                                    className="group transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                                >
                                    <Link href={auth.user ? '/programs' : login()}>
                                        {auth.user ? 'View Programs' : 'Access System'}
                                        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
                                    </Link>
                                </Button>
                                {!auth.user && (
                                    <Button
                                        asChild
                                        size="lg"
                                        variant="outline"
                                        className="transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:text-primary hover:shadow-lg hover:shadow-brand-navy/10 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                                    >
                                        <Link href={register()}>Register as resident</Link>
                                    </Button>
                                )}
                            </div>
                            <p
                                className="animate-in fade-in-0 mt-8 text-sm text-muted-foreground duration-700 delay-500 fill-mode-both motion-reduce:animate-none"
                            >
                                Built for barangay staff, residents and partner agencies, on the web and on your phone.
                            </p>
                        </div>
                        <div className="intro-gate animate-in fade-in-0 slide-in-from-bottom-6 duration-1000 delay-[500ms] fill-mode-both motion-reduce:animate-none">
                            <DeviceMockups />
                        </div>
                    </section>

                    <section aria-label="resiTrack in numbers" className="pb-6">
                        <ScrollReveal>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                resiTrack in numbers
                            </p>
                            <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                                {numbers.map((item) => (
                                    <div
                                        key={item.label}
                                        className="rounded-lg border border-border bg-card p-5 transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-navy/10"
                                    >
                                        <dd className="text-3xl font-bold tracking-tight tabular-nums">
                                            <CountUp value={item.value} />
                                        </dd>
                                        <dt className="mt-1 text-sm text-muted-foreground">{item.label}</dt>
                                    </div>
                                ))}
                            </dl>
                        </ScrollReveal>
                    </section>

                    <section id="partners" className="scroll-mt-6 py-14 md:py-20">
                        <ScrollReveal className="max-w-2xl">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                                For partner agencies
                            </p>
                            <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                                Reach the residents who actually qualify.
                            </h2>
                            <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">
                                resiTrack gives agencies a verified, up to date picture of who needs help, so
                                programs reach the right households and nobody collects twice.
                            </p>
                        </ScrollReveal>

                        <div className="mt-10 grid gap-4 md:grid-cols-2">
                            <ScrollReveal className="rounded-lg border border-border bg-card p-6">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                                    Without it
                                </h3>
                                <ul className="mt-4 space-y-3">
                                    {before.map((item) => (
                                        <li key={item} className="flex items-start gap-3 text-sm">
                                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                                <X className="size-3" aria-hidden="true" />
                                            </span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </ScrollReveal>
                            <ScrollReveal delay={100} className="rounded-lg border border-success/40 bg-success/10 p-6">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-success-text">
                                    With resiTrack
                                </h3>
                                <ul className="mt-4 space-y-3">
                                    {after.map((item) => (
                                        <li key={item} className="flex items-start gap-3 text-sm">
                                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
                                                <Check className="size-3" aria-hidden="true" />
                                            </span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </ScrollReveal>
                        </div>

                        <div className="mt-14">
                            <ScrollReveal>
                                <h3 className="text-xl font-bold tracking-tight md:text-2xl">How an agency uses it</h3>
                            </ScrollReveal>
                            <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {agencySteps.map((step, index) => (
                                    <li key={step.title}>
                                        <ScrollReveal
                                            delay={index * 80}
                                            className="rounded-lg border border-border bg-card p-5 transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-navy/10"
                                        >
                                            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                                                {index + 1}
                                            </span>
                                            <h4 className="mt-4 font-semibold">{step.title}</h4>
                                            <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
                                        </ScrollReveal>
                                    </li>
                                ))}
                            </ol>
                            <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
                                <ScrollReveal>
                                    <Screenshot
                                        src="/images/landing/agency-targeting.webp"
                                        alt="The program form where an agency chooses the target barangay, the vulnerable sectors a program serves, and the number of slots."
                                        caption="Target a program by barangay and sector. Matching residents are found for you."
                                        width={1296}
                                        height={633}
                                    />
                                </ScrollReveal>
                                <ScrollReveal delay={120}>
                                    <Screenshot
                                        src="/images/landing/agency-review.webp"
                                        alt="A program page showing slots filled and a table of applications with Approve and Reject buttons."
                                        caption="Review applications in one place, and see how many slots are left."
                                        width={1515}
                                        height={705}
                                    />
                                </ScrollReveal>
                            </div>
                        </div>

                        <div className="mt-14">
                            <ScrollReveal>
                                <h3 className="text-xl font-bold tracking-tight md:text-2xl">
                                    Why you can rely on the data
                                </h3>
                            </ScrollReveal>
                            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {trust.map((item, index) => (
                                    <ScrollReveal
                                        key={item.title}
                                        delay={index * 80}
                                        className="rounded-lg border border-border bg-card p-5 transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-navy/10"
                                    >
                                        <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                                            <item.icon className="size-5" aria-hidden="true" />
                                        </span>
                                        <h4 className="mt-4 font-semibold">{item.title}</h4>
                                        <p className="mt-1.5 text-sm text-muted-foreground">{item.description}</p>
                                    </ScrollReveal>
                                ))}
                            </div>
                        </div>

                        <ScrollReveal
                            className="relative mt-14 overflow-hidden rounded-xl bg-brand-navy bg-brand-gradient p-8 text-white md:p-10"
                        >
                            <ShieldCheck className="absolute -right-6 -bottom-6 size-40 text-white/5" aria-hidden="true" />
                            <div className="relative max-w-2xl">
                                <h3 className="text-2xl font-bold tracking-tight">Want your agency on resiTrack?</h3>
                                <p className="mt-2 text-white/75">
                                    Partner agency accounts are set up through your barangay office or city hall.
                                    Contact them to request access, then log in to publish your first program.
                                </p>
                                {!auth.user && (
                                    <Button asChild variant="secondary" size="lg" className="mt-6">
                                        <Link href={login()}>Log in to your account</Link>
                                    </Button>
                                )}
                            </div>
                        </ScrollReveal>
                    </section>

                    <section id="how-it-works" className="scroll-mt-6 py-10 md:py-14">
                        <ScrollReveal className="max-w-xl">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                                For residents
                            </p>
                            <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">How it works</h2>
                            <p className="mt-2 text-muted-foreground">Getting started takes three steps.</p>
                        </ScrollReveal>
                        <ol className="mt-8 grid gap-4 md:grid-cols-3">
                            {residentSteps.map((step, index) => (
                                <li key={step.title}>
                                    <ScrollReveal
                                        delay={index * 80}
                                        className="rounded-lg border border-border bg-card p-6 transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-navy/10"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                                                {index + 1}
                                            </span>
                                            <step.icon className="size-5 text-primary" aria-hidden="true" />
                                        </div>
                                        <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                                        <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
                                    </ScrollReveal>
                                </li>
                            ))}
                        </ol>
                    </section>

                    <section id="features" className="scroll-mt-6 pt-6 pb-20">
                        <ScrollReveal>
                            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">What resiTrack does</h2>
                        </ScrollReveal>
                        <div className="mt-8 grid gap-4 md:grid-cols-2">
                            {features.map((feature, index) => (
                                <ScrollReveal
                                    key={feature.title}
                                    delay={index * 80}
                                    className="rounded-lg border border-border bg-card p-6 transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-navy/10"
                                >
                                    <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                                        <feature.icon className="size-5" />
                                    </span>
                                    <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                                    <p className="mt-1.5 text-sm text-muted-foreground">{feature.description}</p>
                                </ScrollReveal>
                            ))}
                        </div>
                    </section>
                </main>

                <SiteFooter />
            </div>
        </>
    );
}
