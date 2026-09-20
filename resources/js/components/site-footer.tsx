import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';

const directory = [
    { label: 'Home', href: '/' },
    { label: 'For agencies', href: '/#partners' },
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'Programs', href: '/programs' },
    { label: 'Log in', href: '/login' },
    { label: 'Register', href: '/register' },
];

const help = [
    { label: 'Frequently asked questions', href: '/faq' },
    { label: 'Report a technical issue', href: '/faq#report-an-issue' },
];

const legal = [
    { label: 'Privacy Notice', href: '/privacy' },
    { label: 'Terms of Use', href: '/terms' },
];

function Column({ title, links }: { title: string; links: { label: string; href: string }[] }) {
    return (
        <div>
            <h2 className="border-b border-white/20 pb-2 text-xs font-semibold uppercase tracking-[0.15em] text-white">
                {title}
            </h2>
            <ul className="mt-4 space-y-2.5 text-sm">
                {links.map((link) => (
                    <li key={link.label}>
                        {link.href.includes('#') ? (
                            <a href={link.href} className="text-white/75 transition-colors hover:text-white">
                                {link.label}
                            </a>
                        ) : (
                            <Link href={link.href} className="text-white/75 transition-colors hover:text-white">
                                {link.label}
                            </Link>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * Deliberately carries no government seals or "Republic of the Philippines"
 * wording: resiTrack is a capstone system, not an official government site,
 * and must not look like one.
 */
export function SiteFooter() {
    return (
        <footer className="bg-brand-navy bg-footer-gradient text-white">
            <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
                <div>
                    <div className="flex items-center gap-2">
                        <AppLogoIcon className="size-9 rounded-md bg-white/95 p-1" />
                        <span className="text-lg font-semibold tracking-tight">resiTrack</span>
                    </div>
                    <p className="mt-4 max-w-xs text-sm leading-6 text-white/75">
                        A resident profiling and social services system for barangays in Cagayan de Oro City,
                        built so programs reach the residents who need them.
                    </p>
                    <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan">
                        Track today. Brighter tomorrows.
                    </p>
                </div>
                <Column title="Site directory" links={directory} />
                <Column title="Help" links={help} />
                <Column title="Legal" links={legal} />
            </div>
            <div className="border-t border-white/15">
                <p className="mx-auto w-full max-w-6xl px-4 py-5 text-xs text-white/60 sm:px-6">
                    &copy; {new Date().getFullYear()} resiTrack. A capstone project for Cagayan de Oro City.
                </p>
            </div>
        </footer>
    );
}
