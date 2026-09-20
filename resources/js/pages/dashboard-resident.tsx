import { Head, Link, router } from '@inertiajs/react';
import { Bell, FileHeart, Gift, HandHeart, Megaphone, UserCircle } from 'lucide-react';
import type { ReactNode } from 'react';
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

type Completeness = {
    percent: number;
    missing: { field: string; label: string }[];
} | null;
type SectorWithReasons = {
    code: string;
    sector_name: string;
    reasons: string[];
};

const STATUS_VARIANT: Record<
    string,
    'secondary' | 'outline' | 'destructive' | 'default'
> = {
    approved: 'secondary',
    pending: 'default',
    rejected: 'destructive',
};

const FEED_ICON: Record<string, typeof Bell> = {
    program_match: Gift,
    announcement: Megaphone,
};

function ProfileCompletenessCard({
    completeness,
}: {
    completeness: Completeness;
}) {
    const { t } = useTranslation();

    if (!completeness) {
        return null;
    }

    const { percent, missing } = completeness;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {t('dashboard.profile.title')}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div>
                    <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">
                            {t('dashboard.profile.percentComplete', {
                                percent,
                            })}
                        </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className={`h-full rounded-full transition-all ${percent >= 100 ? 'bg-success' : 'bg-primary'}`}
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                </div>
                {missing.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {missing.length > 1
                            ? t('dashboard.profile.addFieldMore', {
                                  field: t(
                                      `field.${missing[0].field}`,
                                  ).toLowerCase(),
                                  count: missing.length - 1,
                              })
                            : t('dashboard.profile.addField', {
                                  field: t(
                                      `field.${missing[0].field}`,
                                  ).toLowerCase(),
                              })}
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        {t('dashboard.profile.complete')}
                    </p>
                )}
                <Button asChild size="sm" variant="outline">
                    <Link href="/my-profile">
                        {t('dashboard.profile.update')}
                    </Link>
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
                {sectors.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                        {t('dashboard.sectors.empty')}
                    </p>
                )}
                {sectors.map((sector) => (
                    <div key={sector.code}>
                        <SectorBadge
                            code={sector.code}
                            label={sector.sector_name}
                        />
                        {sector.reasons.length > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                {sector.reasons.join(' · ')}
                            </p>
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
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        {t('dashboard.feed.empty')}
                    </p>
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
                            <Link
                                href={item.action_url ?? '#'}
                                onClick={() => item.action_url && !item.is_read && markRead(item.id)}
                                className={cn('flex min-w-0 flex-1 items-start gap-3', !item.action_url && 'pointer-events-none')}
                            >
                                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                                <div className="flex-1 space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium">{item.title}</span>
                                        {!item.is_read && <span className="size-2 rounded-full bg-primary" />}
                                    </div>
                                    {item.message && <p className="whitespace-pre-line text-sm text-muted-foreground">{item.message}</p>}
                                    <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                                </div>
                            </Link>
                            <div className="flex shrink-0 items-center gap-1">
                                <ReadAloudButton
                                    text={[item.title, item.message]
                                        .filter(Boolean)
                                        .join('. ')}
                                />
                                {!item.is_read && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => markRead(item.id)}
                                    >
                                        {t('dashboard.feed.markRead')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    );
                })}
                <Button asChild variant="link" size="sm" className="px-0">
                    <Link href="/notifications">
                        {t('dashboard.feed.viewAll')}
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

function ApplicationsCard({
    applications,
}: {
    applications: ProgramApplication[];
}) {
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
                        <Link
                            href="/programs"
                            className="text-primary hover:underline"
                        >
                            {t('dashboard.applications.browse')}
                        </Link>
                        .
                    </p>
                )}
                {applications.map((application) => (
                    <div
                        key={application.id}
                        className="flex items-center justify-between text-sm"
                    >
                        <Link
                            href={`/programs/${application.program_id}`}
                            className="font-medium hover:underline"
                        >
                            {application.program?.title ??
                                `Program #${application.program_id}`}
                        </Link>
                        <Badge
                            variant={
                                STATUS_VARIANT[application.status] ?? 'outline'
                            }
                        >
                            {application.status}
                        </Badge>
                    </div>
                ))}
                {applications.length > 0 && (
                    <Button asChild variant="link" size="sm" className="px-0">
                        <Link href="/my-applications">
                            {t('dashboard.applications.viewAll')}
                        </Link>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

/**
 * The resident's status sits in one place at the top: who they are, whether
 * they are verified, and what to do next. The path motif is the logo's own
 * shape, kept faint (brand spec: a subtle accent, never a background on
 * every screen).
 */
function WelcomeBand({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle: string;
    children: ReactNode;
}) {
    return (
        <section className="relative overflow-hidden rounded-xl bg-brand-navy bg-brand-gradient p-6 text-white sm:p-8">
            <svg
                aria-hidden="true"
                viewBox="0 0 400 200"
                preserveAspectRatio="xMaxYMid slice"
                className="pointer-events-none absolute inset-0 size-full opacity-[0.16]"
            >
                <path d="M120 230 C 200 120, 300 60, 440 40" fill="none" stroke="var(--color-brand-cyan)" strokeWidth="22" strokeLinecap="round" />
                <path d="M170 250 C 260 150, 340 100, 460 90" fill="none" stroke="var(--color-brand-green)" strokeWidth="14" strokeLinecap="round" />
            </svg>
            <div className="relative space-y-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
                    <p className="mt-1 text-sm text-white/75">{subtitle}</p>
                </div>
                {children}
            </div>
        </section>
    );
}

function QuickLinks() {
    const { t } = useTranslation();
    const links = [
        { href: '/programs', label: t('nav.programs'), icon: HandHeart },
        { href: '/my-applications', label: t('nav.myApplications'), icon: FileHeart },
        { href: '/my-profile', label: t('nav.myProfile'), icon: UserCircle },
    ];

    return (
        <nav className="grid gap-3 sm:grid-cols-3">
            {links.map((link) => (
                <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 rounded-lg border bg-card p-4 font-medium outline-none transition-colors hover:border-primary/50 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <link.icon className="size-5" />
                    </span>
                    {link.label}
                </Link>
            ))}
        </nav>
    );
}

export default function ResidentDashboard({
    resident,
    completeness,
    sectors,
    recentApplications,
    feed,
    deletionRequest,
}: {
    resident: Resident | null;
    completeness: Completeness;
    sectors: SectorWithReasons[];
    recentApplications: ProgramApplication[];
    feed: AppNotification[];
    deletionRequest: { status: 'pending' | 'approved' | 'rejected'; admin_remarks: string | null } | null;
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title="Dashboard" />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">
                <WelcomeBand
                    title={
                        resident
                            ? t('dashboard.welcome', {
                                  name: resident.first_name,
                              })
                            : t('dashboard.welcomeGeneric')
                    }
                    subtitle={t('dashboard.subtitle')}
                >
                    {resident ? (
                        <div className="space-y-2">
                            <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                <span className="inline-flex rounded-lg bg-white px-3 py-1 text-sm font-semibold text-[#17795a] sm:rounded-full">
                                    Status: Profiled / Verified / Linked
                                </span>
                                <span className="text-sm">
                                    Resident ID: <strong>{resident.resident_id}</strong>
                                </span>
                            </p>
                            <p className="max-w-2xl text-sm text-white/75">
                                You can now log in using either your Resident ID or registered email address together with your password.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="max-w-2xl font-medium">
                                Your account is not yet linked to a resident record.
                            </p>
                            <p className="max-w-2xl text-sm text-white/75">
                                Please visit your Barangay Hall and approach a Barangay Health Worker (BHW) to verify your account and complete your official resident profile.
                            </p>
                            <p>
                                <span className="inline-flex rounded-full bg-warning px-3 py-1 text-sm font-semibold text-warning-foreground">
                                    Status: Pending Profiling
                                </span>
                            </p>
                        </div>
                    )}
                </WelcomeBand>

                {resident && (
                    <>
                        {deletionRequest?.status === 'pending' && <Card className="border-amber-500/40 bg-amber-500/10"><CardContent className="space-y-1 py-4"><p className="font-medium">Account Deletion Request Pending</p><p className="text-sm text-muted-foreground">Your account deletion request is currently being reviewed by an administrator.</p></CardContent></Card>}
                        {deletionRequest?.status === 'rejected' && <Card className="border-destructive/30 bg-destructive/5"><CardContent className="space-y-1 py-4"><p className="font-medium">Account Deletion Request Rejected</p><p className="text-sm text-muted-foreground">Your account will remain active.{deletionRequest.admin_remarks ? ` ${deletionRequest.admin_remarks}` : ''}</p></CardContent></Card>}
                        <QuickLinks />
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                            {/* On phones the profile prompt comes first: it is the one thing a resident can act on. */}
                            <div className="order-first min-w-0 space-y-4 lg:order-last">
                                <ProfileCompletenessCard completeness={completeness} />
                                <SectorsCard sectors={sectors} />
                            </div>
                            <div className="min-w-0 space-y-4 lg:col-span-2">
                                <FeedCard feed={feed} />
                                <ApplicationsCard applications={recentApplications} />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

ResidentDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
