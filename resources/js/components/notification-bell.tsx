import { Link, router, usePage } from '@inertiajs/react';
import { Bell } from 'lucide-react';
import { useEffect } from 'react';

/**
 * Header bell linking to the notifications page, with an unread-count badge fed
 * by the `unreadNotifications` shared Inertia prop.
 */
export function NotificationBell() {
    const unread = usePage().props.unreadNotifications ?? 0;

    useEffect(() => {
        const refreshUnreadCount = window.setInterval(() => {
            router.reload({ only: ['unreadNotifications'] });
        }, 15000);

        return () => window.clearInterval(refreshUnreadCount);
    }, []);

    return (
        <Link
            href="/notifications"
            className="relative inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        >
            <Bell className="size-5" />
            {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                    {unread > 9 ? '9+' : unread}
                </span>
            )}
        </Link>
    );
}
