import { Head, Link, router } from '@inertiajs/react';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { confirmDialog } from '@/components/confirm-dialog';
import { DataPagination } from '@/components/data-pagination';
import { ReadAloudButton } from '@/components/read-aloud-button';
import { SectorBadges } from '@/components/sector-badges';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useLongDate, useRelativeDate } from '@/hooks/use-relative-date';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import type { Announcement, Paginated } from '@/types';

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);

    if (parts.length === 0) {
return '?';
}

    if (parts.length === 1) {
return parts[0].slice(0, 2).toUpperCase();
}

    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AnnouncementsIndex({
    announcements,
    canManage,
}: {
    announcements: Paginated<Announcement>;
    canManage: boolean;
}) {
    const { t } = useTranslation();
    const formatDate = useRelativeDate();
    const formatLongDate = useLongDate();

    const remove = (announcement: Announcement) => {
        void confirmDialog({ title: `Delete "${announcement.title}"?`, confirmLabel: 'Delete', destructive: true }).then(
            (ok) => ok && router.delete(`/announcements/${announcement.id}`, { preserveScroll: true }),
        );
    };

    return (
        <>
            <Head title="Announcements" />
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            {canManage ? 'Announcements' : t('announcements.title')}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {canManage ? 'Post updates to your residents.' : t('announcements.subtitleResident')}
                        </p>
                    </div>
                    {canManage && (
                        <Button asChild>
                            <Link href="/announcements/create">
                                <Plus className="size-4" /> New Announcement
                            </Link>
                        </Button>
                    )}
                </div>

                {announcements.data.length === 0 && (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                            <Megaphone className="size-8" />
                            {canManage ? 'No announcements yet.' : t('announcements.empty')}
                        </CardContent>
                    </Card>
                )}

                <div className="space-y-3">
                    {announcements.data.map((announcement) => (
                        <Card key={announcement.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <Avatar>
                                            <AvatarFallback className="text-xs font-medium">
                                                {initials(announcement.author?.name ?? 'Barangay')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm leading-none font-semibold">
                                                {announcement.author?.name ?? 'Barangay'}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {formatDate(announcement.posted_at)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {!canManage && (
                                            <ReadAloudButton text={`${announcement.title}. ${announcement.content ?? ''}`} />
                                        )}
                                        {canManage && (
                                            <Button variant="ghost" size="sm" onClick={() => remove(announcement)}>
                                                <Trash2 className="size-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold">{announcement.title}</span>
                                    {announcement.sectors && announcement.sectors.length > 0 ? (
                                        <SectorBadges sectors={announcement.sectors} />
                                    ) : (
                                        <Badge variant="outline">
                                            {canManage ? 'All residents' : t('announcements.allResidents')}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm whitespace-pre-line">{announcement.content}</p>
                                {announcement.expires_at && (
                                    <p className="text-right text-xs text-muted-foreground">
                                        {t('announcements.expires', { date: formatLongDate(announcement.expires_at) })}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <DataPagination meta={announcements} />
            </div>
        </>
    );
}

AnnouncementsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Announcements', href: '/announcements' },
    ],
};
