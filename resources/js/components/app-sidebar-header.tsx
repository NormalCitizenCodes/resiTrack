import { Breadcrumbs } from '@/components/breadcrumbs';
import { LanguageSwitcher } from '@/components/language-switcher';
import { NotificationBell } from '@/components/notification-bell';
import { StaffSearch } from '@/components/staff-search';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-4 transition-[width,height] sm:px-6 ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger className="-ml-1 shrink-0" />
                {/* A two-level trail ("Dashboard > Residents") just repeats the page's own
                    heading, so trails only show once there is a real path (list > record). */}
                {breadcrumbs.length > 2 && (
                    <div className="min-w-0 overflow-hidden">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                )}
            </div>
            {/* Grouped with the right-hand icons behind one ml-auto, so this
                sits at a fixed distance from the right edge instead of
                floating wherever justify-between happens to leave it, which
                shifted with every page's breadcrumb length. */}
            <div className="ml-auto flex shrink-0 items-center gap-2">
                <StaffSearch />
                <div className="flex shrink-0 items-center gap-1">
                    <LanguageSwitcher />
                    <NotificationBell />
                </div>
            </div>
        </header>
    );
}
