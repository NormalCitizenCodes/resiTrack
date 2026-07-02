import { Head, Link, router } from '@inertiajs/react';
import { Bell, Gift, Megaphone, Sparkles } from 'lucide-react';
import { ReadAloudButton } from '@/components/read-aloud-button';
import { SectorBadge } from '@/components/sector-badges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRelativeDate } from '@/hooks/use-relative-date';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { AppNotification, ProgramApplication, Resident } from '@/types';

type Completeness = { percent: number; missing: { field: string; label: string }[] } | null;
type SectorWithReasons = { code: string; sector_name: string; reasons: string[] };

const STATUS_VARIANT: Record<string, 'secondary' | 'outline' | 'destructive' | 'default'> = {
    approved: 'secondary',
    pending: 'default',
    rejected: 'destructive',
};

const FEED_ICON: Record<string, typeof Bell> = {
    program_match: Gift,
    announcement: Megaphone,
};

function ProfileCompletenessCard({ completeness }: { completeness: Completeness }) {
    const { t } = useTranslation();
    if (!completeness) return null;

    const { percent, missing } = completeness;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    {t('dashboard.profile.title')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div>
                    <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">{t('dashboard.profile.percentComplete', { percent })}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                    </div>
                </div>
                {missing.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {missing.length > 1
                            ? t('dashboard.profile.addFieldMore', {
                                  field: t(`field.${missing[0].field}`).toLowerCase(),
                                  count: missing.length - 1,
                              })
                            : t('dashboard.profile.addField', { field: t(`field.${missing[0].field}`).toLowerCase() })}
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">{t('dashboard.profile.complete')}</p>
                )}
                <Button asChild size="sm" variant="outline">
                    <Link href="/my-profile">{t('dashboard.profile.update')}</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function SectorsCard({ sectors }: { sectors: SectorWithReasons[] }) {
    const { t } = useTranslation();

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('dashboard.sectors.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {sectors.length === 0 && <p className="text-sm text-muted-foreground">{t('dashboard.sectors.empty')}</p>}
                {sectors.map((sector) => (
                    <div key={sector.code}>
                        <SectorBadge code={sector.code} label={sector.sector_name} />
                        {sector.reasons.length > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">{sector.reasons.join(' · ')}</p>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function FeedCard({ feed }: { feed: AppNotification[] }) {
    const { t } = useTranslation();
    const formatDate = useRelativeDate();
    const markRead = (id: number) => {
        router.post(`/notifications/${id}/read`, {}, { preserveScroll: true });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('dashboard.feed.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {feed.length === 0 && (
                    <p className="py-6 text-center text-sm text-muted-foreground">{t('dashboard.feed.empty')}</p>
                )}
                {feed.map((item) => {
                    const Icon = FEED_ICON[item.type] ?? Bell;
                    return (
                        <div
                            key={item.id}
                            className={cn(
                                'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                                !item.is_read && 'border-primary/40 bg-primary/5',
                            )}
                        >
                            <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                            <div className="flex-1 space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{item.title}</span>
                                    {!item.is_read && <span className="size-2 rounded-full bg-primary" />}
                                </div>
                                {item.message && <p className="text-sm text-muted-foreground">{item.message}</p>}
                                <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <ReadAloudButton text={[item.title, item.message].filter(Boolean).join('. ')} />
                                {!item.is_read && (
                                    <Button variant="ghost" size="sm" onClick={() => markRead(item.id)}>
                                        {t('dashboard.feed.markRead')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
                <Button asChild variant="link" size="sm" className="px-0">
                    <Link href="/notifications">{t('dashboard.feed.viewAll')}</Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function ApplicationsCard({ applications }: { applications: ProgramApplication[] }) {
    const { t } = useTranslation();

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('dashboard.applications.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {applications.length === 0 && (
                    <p className="py-4 text-sm text-muted-foreground">
                        {t('dashboard.applications.empty')}{' '}
                        <Link href="/programs" className="text-primary hover:underline">
                            {t('dashboard.applications.browse')}
                        </Link>
                        .
                    </p>
                )}
                {applications.map((application) => (
                    <div key={application.id} className="flex items-center justify-between text-sm">
                        <Link href={`/programs/${application.program_id}`} className="font-medium hover:underline">
                            {application.program?.title ?? `Program #${application.program_id}`}
                        </Link>
                        <Badge variant={STATUS_VARIANT[application.status] ?? 'outline'}>{application.status}</Badge>
                    </div>
                ))}
                {applications.length > 0 && (
                    <Button asChild variant="link" size="sm" className="px-0">
                        <Link href="/my-applications">{t('dashboard.applications.viewAll')}</Link>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

export default function ResidentDashboard({
    resident,
    completeness,
    sectors,
    recentApplications,
    feed,
}: {
    resident: Resident | null;
    completeness: Completeness;
    sectors: SectorWithReasons[];
    recentApplications: ProgramApplication[];
    feed: AppNotification[];
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title="Dashboard" />
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">
                        {resident ? t('dashboard.welcome', { name: resident.first_name }) : t('dashboard.welcomeGeneric')}
                    </h1>
                    <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
                </div>

                {!resident && (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            {t('common.notLinked')}
                        </CardContent>
                    </Card>
                )}

                {resident && (
                    <>
                        <ProfileCompletenessCard completeness={completeness} />
                        <SectorsCard sectors={sectors} />
                        <FeedCard feed={feed} />
                        <ApplicationsCard applications={recentApplications} />
                    </>
                )}
            </div>
        </>
    );
}

ResidentDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
