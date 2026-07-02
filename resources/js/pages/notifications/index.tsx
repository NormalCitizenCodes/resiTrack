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
                            className={cn(
                                'transition-colors',
                                !notification.is_read && 'border-primary/40 bg-primary/5',
                            )}
                        >
                            <CardContent className="flex items-start justify-between gap-3 py-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{t(`notifications.type.${notification.type}`)}</Badge>
                                        <span className="font-medium">{notification.title}</span>
                                        {!notification.is_read && <span className="size-2 rounded-full bg-primary" />}
                                    </div>
                                    {notification.message && (
                                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                                    )}
                                    <p className="text-xs text-muted-foreground">{formatDate(notification.created_at)}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    <ReadAloudButton
                                        text={[notification.title, notification.message].filter(Boolean).join('. ')}
                                    />
                                    {!notification.is_read && (
                                        <Button variant="ghost" size="sm" onClick={() => markRead(notification.id)}>
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
