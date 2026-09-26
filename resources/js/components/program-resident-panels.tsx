import { Building2, MapPin } from 'lucide-react';
import { ScheduleList } from '@/components/program-schedules';
import type { ProgramSchedule } from '@/components/program-schedules';
import { ReadAloudButton } from '@/components/read-aloud-button';
import { SectorBadges } from '@/components/sector-badges';
import { buildSteps, StatusTimeline } from '@/components/status-timeline';
import type { TimelineStep } from '@/components/status-timeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLongDate } from '@/hooks/use-relative-date';
import { useTranslation } from '@/hooks/use-translation';
import type { Program, ProgramApplication } from '@/types';

const STATUS_VARIANT: Record<string, 'secondary' | 'outline' | 'destructive' | 'default'> = {
    active: 'secondary',
    approved: 'secondary',
    pending: 'default',
    inactive: 'outline',
    rejected: 'destructive',
    expired: 'destructive',
};

export function StatusBadge({ status }: { status: string }) {
    return <Badge variant={STATUS_VARIANT[status] ?? 'outline'}>{status === 'active' ? 'Open' : status === 'inactive' || status === 'expired' ? 'Closed' : status}</Badge>;
}

/** Title, status, who runs it and who it is for. The residents' read-aloud button reads the title and description. */
export function ProgramHeading({ program, isResident, as: Heading = 'h1' }: { program: Program; isResident: boolean; as?: 'h1' | 'h2' }) {
    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <Heading className="text-2xl font-semibold tracking-tight">{program.title}</Heading>
                <StatusBadge status={program.status} />
                {isResident && <ReadAloudButton text={`${program.title}. ${program.description ?? ''}`} />}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                    <Building2 className="size-4" />
                    {program.agency?.agency_name ?? 'Partner Agency'}
                </span>
                {program.barangay && (
                    <span className="flex items-center gap-1">
                        <MapPin className="size-4" />
                        {program.barangay.name} only
                    </span>
                )}
            </div>
            <SectorBadges sectors={program.sectors} />
        </div>
    );
}

/** What the program is, its dates and how many slots are left. */
export function ProgramOverview({ program }: { program: Program }) {
    const remaining = Math.max(0, program.slots_available - program.slots_filled);

    return (
        <Card>
            <CardContent className="grid gap-4 md:grid-cols-4">
                <div className="md:col-span-3">
                    <p className="text-sm">{program.description ?? '-'}</p>
                    {program.eligibility_criteria && (
                        <p className="mt-2 text-sm text-muted-foreground">
                            <span className="font-medium">Eligibility:</span> {program.eligibility_criteria}
                        </p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">
                        {program.start_date?.substring(0, 10) ?? '-'} to {program.end_date?.substring(0, 10) ?? '-'}
                    </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-semibold">
                        {program.slots_filled}/{program.slots_available}
                    </p>
                    <p className="text-xs text-muted-foreground">slots filled</p>
                    <p className="mt-1 text-xs font-medium text-emerald-600">{remaining} open</p>
                </div>
            </CardContent>
        </Card>
    );
}

/** Where a resident's application stands: sent, being reviewed, then approved or not. */
function ApplicationTimeline({ application }: { application: ProgramApplication }) {
    const { t } = useTranslation();
    const formatDate = useLongDate();
    const applied = application.applied_at ? formatDate(application.applied_at) : null;

    const steps: TimelineStep[] =
        application.status === 'rejected'
            ? [
                  { label: t('programs.step.applied'), date: applied, state: 'done' },
                  { label: t('programs.step.review'), state: 'done' },
                  { label: t('programs.step.rejected'), state: 'stopped' },
              ]
            : buildSteps(
                  [t('programs.step.applied'), t('programs.step.review'), t('programs.step.approved')],
                  1,
                  application.status === 'approved',
                  [applied],
              );

    return <StatusTimeline steps={steps} />;
}

/**
 * The resident's own part of a program: their application (or the button to apply), the
 * claim schedule once approved, and any claims already made. Shared by the program page and
 * the pop-up opened from the lists.
 */
export function ResidentProgramPanels({
    program,
    myApplication,
    isEligible,
    schedules,
    myClaims,
    onApply,
}: {
    program: Program;
    myApplication?: ProgramApplication | null;
    isEligible?: boolean;
    schedules: ProgramSchedule[];
    myClaims: { id: number; claimed_on: string }[];
    onApply: () => void;
}) {
    const { t } = useTranslation();
    const remaining = Math.max(0, program.slots_available - program.slots_filled);

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>{t('programs.yourApplication')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {myApplication ? (
                        <ApplicationTimeline application={myApplication} />
                    ) : isEligible ? (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-muted-foreground">{t('programs.qualify')}</p>
                            <Button size="lg" onClick={onApply} disabled={program.status !== 'active' || remaining === 0}>
                                {t('programs.applyNow')}
                            </Button>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">{t('programs.notQualify')}</p>
                    )}
                </CardContent>
            </Card>

            {myApplication?.status === 'approved' && (
                <Card className="border-primary/40">
                    <CardHeader>
                        <CardTitle>{t('programs.schedule.title')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {schedules.length > 0 ? <ScheduleList schedules={schedules} /> : <p className="text-sm text-muted-foreground">{t('programs.schedule.none')}</p>}
                    </CardContent>
                </Card>
            )}

            {myClaims.length > 0 && (
                <Card>
                    <CardContent className="space-y-1 text-sm">
                        {myClaims.map((claim) => (
                            <p key={claim.id}>{t('programs.claimedOn', { date: claim.claimed_on })}</p>
                        ))}
                    </CardContent>
                </Card>
            )}
        </>
    );
}
