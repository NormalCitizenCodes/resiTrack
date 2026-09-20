import { usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { AppVariant } from '@/types';

type Props = {
    children: ReactNode;
    variant?: AppVariant;
};

/**
 * The sidebar writes its open/closed choice to a cookie the moment it changes.
 * That cookie, not the `sidebarOpen` prop, is the source of truth once the app
 * is running: the prop is computed per request, so a prefetched page carries a
 * stale copy, and any layout remount (e.g. moving between pages that wrap the
 * layout differently) would otherwise snap the sidebar back to that stale value.
 * On the server there is no document, so the prop is used for the first render.
 */
function readSidebarCookie(): boolean | null {
    if (typeof document === 'undefined') {
        return null;
    }

    const match = document.cookie.match(/(?:^|;\s*)sidebar_state=(true|false)/);

    return match ? match[1] === 'true' : null;
}

export function AppShell({ children, variant = 'sidebar' }: Props) {
    const serverOpen = usePage().props.sidebarOpen;

    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">{children}</div>
        );
    }

    return (
        <SidebarProvider defaultOpen={readSidebarCookie() ?? serverOpen}>
            {children}
        </SidebarProvider>
    );
}
