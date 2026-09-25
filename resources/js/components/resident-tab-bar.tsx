import { Link, usePage } from '@inertiajs/react';
import { Bell, FileHeart, HandHeart, Home, UserCircle } from 'lucide-react';
import { useEffect, useState   } from 'react';
import type {ComponentType, SVGProps} from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { Role } from '@/types';

/**
 * Remembers the pill's index across Inertia navigations. Inertia remounts the
 * layout on every page change here (verified in headless Chrome), so a newly-
 * mounted pill has no "from" state to transition from - it just appears at the
 * new spot. Reading the previous index out of a module-level variable lets us
 * start the fresh mount at the OLD position and then animate to the new one.
 */
let lastPillIndex = 0;

type TabKey = 'home' | 'programs' | 'applications' | 'notifications' | 'profile';

type Tab = {
    key: TabKey;
    href: string;
    label: string;
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    /** Prefixes on `usePage().url` that count as this tab being active. */
    matchPrefixes: string[];
    badge?: number;
};

/**
 * Bottom tab bar for residents on phones and tablets. Shown only when the
 * resident is signed in and only below the sidebar breakpoint (lg = 1024px);
 * staff keep the sidebar because they work against wide tables where a bottom
 * bar would eat vertical space and hide fields.
 *
 * The active-tab pill is ONE element positioned by `transform: translateX`, not
 * five per-tab pills. Because Inertia keeps AppSidebarLayout mounted between
 * page navigations, transitioning the transform actually animates as the URL
 * changes; five separate pills would each just flash in and out.
 *
 * Five tabs is the widely-tested upper bound before targets shrink below what a
 * thumb can hit; we have exactly five. Anything else the resident might need
 * (Help, sign out, language, theme) stays in the sidebar drawer, reachable
 * from the header's menu button.
 */
export function ResidentTabBar() {
    const { auth, unreadNotifications } = usePage().props;
    const role = auth?.user?.role as Role | undefined;
    const currentPath = usePage().url.split('?')[0];
    const { t } = useTranslation();

    const tabs: Tab[] = [
        { key: 'home', href: dashboard().url, label: t('nav.dashboard'), icon: Home, matchPrefixes: ['/dashboard'] },
        { key: 'programs', href: '/programs', label: t('nav.programs'), icon: HandHeart, matchPrefixes: ['/programs'] },
        { key: 'applications', href: '/my-applications', label: t('nav.myApplications'), icon: FileHeart, matchPrefixes: ['/my-applications'] },
        {
            key: 'notifications',
            href: '/notifications',
            label: t('nav.notifications'),
            icon: Bell,
            matchPrefixes: ['/notifications', '/announcements'],
            badge: unreadNotifications ?? 0,
        },
        { key: 'profile', href: '/my-profile', label: t('nav.myProfile'), icon: UserCircle, matchPrefixes: ['/my-profile', '/my-id', '/my-household', '/settings'] },
    ];

    const activeIndex = tabs.findIndex((tab) =>
        tab.matchPrefixes.some((p) => currentPath === p || currentPath.startsWith(p + '/')),
    );
    // On a page that is no tab's (Certificates, Hotlines), nothing is selected:
    // the pill fades out where it was, and slides on from there next time.
    const pillHidden = activeIndex < 0;
    const targetIndex = pillHidden ? lastPillIndex : activeIndex;

    // Start at where the previous mount left off, then step to the current
    // index on the next paint so the transform transitions instead of jumping.
    const [pillIndex, setPillIndex] = useState<number>(lastPillIndex);

    useEffect(() => {
        // Two nested rAFs: React commits on frame 1 with the pill still at its
        // old spot, and the new transform lands on frame 2 so the browser sees
        // a style change and transitions rather than instantly repainting.
        let raf2 = 0;
        const raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => {
                setPillIndex(targetIndex);
                lastPillIndex = targetIndex;
            });
        });

        return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
        };
    }, [targetIndex]);

    // After every hook, so staff renders run the same hooks in the same order.
    if (role !== 'resident') {
        return null;
    }

    return (
        <>
            {/* The room this bar covers is reserved by bottom padding on the page
                content, in app-sidebar-layout.tsx. (A spacer here does not work:
                it lands beside the content in the sidebar's flex row, not below.) */}
            <nav
                aria-label="Primary"
                className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_2px_rgba(0,0,0,0.04)] lg:hidden"
                style={{ ['--tab-count' as string]: tabs.length }}
            >
                <div className="relative mx-auto max-w-lg">
                    {/* One sliding pill, exactly one tab-column wide, translated by the
                        active index. Because the layout stays mounted across resident
                        pages, this transitions between them. Inner span gives it the
                        rounded inset without breaking the width-per-column math. */}
                    <span
                        aria-hidden="true"
                        className={cn(
                            'pointer-events-none absolute top-1.5 left-0 flex px-3 transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none',
                            pillHidden && 'opacity-0',
                        )}
                        style={{
                            width: `${100 / tabs.length}%`,
                            transform: `translateX(${pillIndex * 100}%)`,
                        }}
                    >
                        <span className="h-8 w-full rounded-full bg-primary/10" />
                    </span>

                    <ul className="flex items-stretch justify-between">
                        {tabs.map((tab, index) => {
                            const isActive = index === activeIndex;
                            const Icon = tab.icon;

                            return (
                                <li key={tab.key} className="flex-1">
                                    <Link
                                        href={tab.href}
                                        prefetch
                                        aria-current={isActive ? 'page' : undefined}
                                        className={cn(
                                            'group relative flex h-16 flex-col items-center justify-center gap-1 px-1 outline-none transition-colors duration-300 ease-out',
                                            isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        <span className="relative flex h-8 w-8 items-center justify-center">
                                            <Icon
                                                aria-hidden="true"
                                                className={cn(
                                                    'size-5 transition-transform duration-300 ease-out motion-reduce:transition-none',
                                                    isActive ? '-translate-y-0.5 scale-110' : 'scale-100',
                                                )}
                                            />
                                            {tab.badge && tab.badge > 0 ? (
                                                <span
                                                    aria-label={`${tab.badge} unread`}
                                                    className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white"
                                                >
                                                    {tab.badge > 9 ? '9+' : tab.badge}
                                                </span>
                                            ) : null}
                                        </span>
                                        <span
                                            className={cn(
                                                'relative truncate text-[10px] leading-none transition-[font-weight]',
                                                isActive ? 'font-semibold' : 'font-medium',
                                            )}
                                        >
                                            {tab.label}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </nav>
        </>
    );
}
