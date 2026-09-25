import { usePage } from '@inertiajs/react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { FlashToasts } from '@/components/flash-toasts';
import { ResidentTabBar } from '@/components/resident-tab-bar';
import { useComfortableScale } from '@/hooks/use-comfortable-scale';
import { LanguageProvider } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    useComfortableScale();
    const isResident = usePage().props.auth?.user?.role === 'resident';

    return (
        <LanguageProvider>
            <AppShell variant="sidebar">
                <FlashToasts />
                <AppSidebar />
                {/* Residents get a fixed bottom tab bar below 1024px; the padding keeps
                    the last thing on every page (e.g. Save Changes) clear of it: the bar's 4rem plus 1rem of room. */}
                <AppContent
                    variant="sidebar"
                    className={cn('overflow-x-hidden', isResident && 'pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0')}
                >
                    <AppSidebarHeader breadcrumbs={breadcrumbs} />
                    {children}
                </AppContent>
                <ResidentTabBar />
            </AppShell>
        </LanguageProvider>
    );
}
