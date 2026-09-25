import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { FlashToasts } from '@/components/flash-toasts';
import { ResidentTabBar } from '@/components/resident-tab-bar';
import { useComfortableScale } from '@/hooks/use-comfortable-scale';
import { LanguageProvider } from '@/hooks/use-translation';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    useComfortableScale();

    return (
        <LanguageProvider>
            <AppShell variant="sidebar">
                <FlashToasts />
                <AppSidebar />
                <AppContent variant="sidebar" className="overflow-x-hidden">
                    <AppSidebarHeader breadcrumbs={breadcrumbs} />
                    {children}
                </AppContent>
                <ResidentTabBar />
            </AppShell>
        </LanguageProvider>
    );
}
