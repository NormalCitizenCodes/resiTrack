import { Head, router } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';
import { DataPagination } from '@/components/data-pagination';
import { ReadAloudButton } from '@/components/read-aloud-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRelativeDate } from '@/hooks/use-relative-date';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { AppNotification, Paginated } from '@/types';

export default function NotificationsIndex({
    notifications,
    unreadCount,
}: {
    notifications: Paginated<AppNotification>;
    unreadCount: number;
}) {
    const { t } = useTranslation();
    const formatDate = useRelativeDate();

    const markRead = (id: number) => {
        router.post(`/notifications/${id}/read`, {}, { preserveScroll: true });
    };

    const markReadAndVisit = (id: number, url: string) => {
        router.post(`/notifications/${id}/read`, {}, {
            preserveScroll: true,
            onSuccess: () => router.visit(url),
        });
    };

    const markAllRead = () => {
        router.post('/notifications/read-all', {}, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Notifications" />
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">{t('notifications.title')}</h1>
                        <p className="text-sm text-muted-foreground">
                            {unreadCount > 0 ? t('notifications.unread', { count: unreadCount }) : t('notifications.caughtUp')}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <Button variant="outline" size="sm" onClick={markAllRead}>
                            <CheckCheck className="size-4" /> {t('notifications.markAllRead')}
                        </Button>
                    )}
                </div>

                {notifications.data.length === 0 && (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                            <Bell className="size-8" />
                            {t('notifications.empty')}
                        </CardContent>
                    </Card>
                )}

                <div className="space-y-2">
                    {notifications.data.map((notification) => (
                        <Card
                            key={notification.id}
                            role={notification.action_url ? 'link' : undefined}
                            tabIndex={notification.action_url ? 0 : undefined}
                            onClick={() => notification.action_url && markReadAndVisit(notification.id, notification.action_url)}
                            onKeyDown={(event) => {
                                if (notification.action_url && (event.key === 'Enter' || event.key === ' ')) {
                                    event.preventDefault();
                                    markReadAndVisit(notification.id, notification.action_url);
                                }
                            }}
                            className={cn(
                                'transition-colors',
                                notification.action_url && 'cursor-pointer hover:border-primary/60',
                                !notification.is_read && 'border-primary/40 bg-primary/5',
                            )}
                        >
                            <CardContent className="space-y-2 py-4">
                                {/* Type + unread dot on one row, so the title beneath gets the full width
                                    instead of the buttons taking half of it on a phone. */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline">{t(`notifications.type.${notification.type}`)}</Badge>
                                    {!notification.is_read && (
                                        <span className="size-2 rounded-full bg-primary" aria-label="Unread" />
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium">{notification.title}</p>
                                    {notification.message && (
                                        <p className="whitespace-pre-line text-sm text-muted-foreground">{notification.message}</p>
                                    )}
                                </div>
                                {/* Actions row: date on the left, controls hugged to the right. Kept on
                                    one line even on a phone by giving the date `min-w-0` so a long
                                    formatted date can shrink instead of pushing the button to a new line. */}
                                <div className="flex items-center gap-2">
                                    <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{formatDate(notification.created_at)}</p>
                                    <ReadAloudButton
                                        onClick={(event) => event.stopPropagation()}
                                        text={[notification.title, notification.message].filter(Boolean).join('. ')}
                                    />
                                    {!notification.is_read && (
                                        <Button variant="ghost" size="sm" onClick={(event) => {
 event.stopPropagation(); markRead(notification.id); 
}}>
                                            {t('notifications.markRead')}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <DataPagination meta={notifications} />
            </div>
        </>
    );
}

NotificationsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Notifications', href: '/notifications' },
    ],
};
