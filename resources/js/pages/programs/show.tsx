import { Head, Link, router } from '@inertiajs/react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { confirmDialog } from '@/components/confirm-dialog';
import { ProgramClaims } from '@/components/program-claims';
import type { ProgramClaim } from '@/components/program-claims';
import { ProgramHeading, ProgramOverview, ResidentProgramPanels, StatusBadge } from '@/components/program-resident-panels';
import { ScheduleForm, ScheduleList, removeSchedule } from '@/components/program-schedules';
import type { ProgramSchedule } from '@/components/program-schedules';
import { SectorBadges } from '@/components/sector-badges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboard, login, register } from '@/routes';
import type { Beneficiary, Program, ProgramApplication, Resident, Role } from '@/types';

type Props = {
    program: Program;
    isOwner: boolean;
    viewerRole?: Role | null;
    applications?: ProgramApplication[];
    beneficiaries?: Beneficiary[];
    eligibleResidents?: Resident[];
    barangayApplications?: ProgramApplication[];
    myApplication?: ProgramApplication | null;
    isEligible?: boolean;
    schedules?: ProgramSchedule[];
    claims?: ProgramClaim[];
    canRecordClaims?: boolean;
    today?: string;
    myClaims?: { id: number; claimed_on: string }[];
};

export default function ProgramShow(props: Props) {
    const {
        program,
        isOwner,
        applications,
        beneficiaries,
        eligibleResidents,
        barangayApplications,
        myApplication,
        isEligible,
        schedules = [],
        claims = [],
        canRecordClaims = false,
        today = '',
        myClaims = [],
    } = props;
    const endorsedIds = new Set((barangayApplications ?? []).map((a) => a.resident_id));

    const review = (application: ProgramApplication, status: 'approved' | 'rejected') => {
        router.patch(`/applications/${application.id}`, { status }, { preserveScroll: true });
    };

    const endorse = (resident: Resident) => {
        router.post(`/programs/${program.id}/apply`, { resident_id: resident.id }, { preserveScroll: true });
    };

    const applySelf = () => {
        router.post(`/programs/${program.id}/apply`, {}, { preserveScroll: true });
    };

    const remove = () => {
        void confirmDialog({
            title: `Delete “${program.title}”?`,
            description: 'This cannot be undone.',
            confirmLabel: 'Delete',
            destructive: true,
        }).then((ok) => ok && router.delete(`/programs/${program.id}`));
    };

    return (
        <>
            <Head title={program.title} />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <ProgramHeading program={program} isResident={props.viewerRole === 'resident'} />
                    {isOwner && (
                        <div className="flex gap-2">
                            <Button asChild variant="outline">
                                <Link href={`/programs/${program.id}/edit`}>
                                    <Pencil className="size-4" /> Edit
                                </Link>
                            </Button>
                            <Button variant="destructive" onClick={remove}>
                                <Trash2 className="size-4" /> Delete
                            </Button>
                        </div>
                    )}
                </div>

                <ProgramOverview program={program} />

                {!props.viewerRole && (
                    <Card>
                        <CardHeader><CardTitle>Resident Login Required</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">Please log in to your resiTrack account to apply for this program.</p>
                            <div className="flex flex-wrap gap-2"><Button asChild><Link href={login()}>Log In</Link></Button><Button asChild variant="outline"><Link href={register()}>Create Account</Link></Button></div>
                        </CardContent>
                    </Card>
                )}

                {/* Resident self-service: application status, claim schedule, claims */}
                {props.viewerRole === 'resident' && (
                    <ResidentProgramPanels program={program} myApplication={myApplication} isEligible={isEligible} schedules={schedules} myClaims={myClaims} onApply={applySelf} />
                )}

                {/* Agency: payout / service-day schedule */}
                {isOwner && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Claim schedule</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Post when and where beneficiaries claim. Every active beneficiary with an account is notified, and it shows on
                                their dashboard.
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {schedules.length > 0 && <ScheduleList schedules={schedules} onRemove={removeSchedule} />}
                            <ScheduleForm programId={program.id} />
                        </CardContent>
                    </Card>
                )}

                {/* Agency: applications to review */}
                {isOwner && applications && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Applications ({applications.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Applicant</TableHead>
                                        <TableHead>Barangay</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Review</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {applications.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                                                No applications yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {applications.map((application) => (
                                        <TableRow key={application.id}>
                                            <TableCell className="font-medium">
                                                {application.resident?.full_name ?? `Resident #${application.resident_id}`}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {application.resident?.barangay?.name ?? '-'}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={application.status} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {application.status === 'pending' ? (
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => review(application, 'approved')}
                                                        >
                                                            <Check className="size-4" /> Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => review(application, 'rejected')}
                                                        >
                                                            <X className="size-4" /> Reject
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Reviewed</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {/* Agency: beneficiaries */}
                {isOwner && beneficiaries && beneficiaries.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Beneficiaries ({beneficiaries.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {beneficiaries.map((beneficiary) => (
                                    <Badge key={beneficiary.id} variant="secondary">
                                        {beneficiary.resident?.full_name ?? `Resident #${beneficiary.resident_id}`}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Agency: who has claimed */}
                {isOwner && beneficiaries && beneficiaries.length > 0 && (
                    <ProgramClaims
                        programId={program.id}
                        beneficiaries={beneficiaries}
                        claims={claims}
                        days={schedules}
                        today={today}
                        canRecord={canRecordClaims}
                    />
                )}

                {/* Barangay staff: endorse eligible residents */}
                {eligibleResidents && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Eligible Residents in Your Barangay ({eligibleResidents.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-3 text-sm text-muted-foreground">
                                Residents matched to this program's target sectors. Endorse them to submit an
                                application on their behalf.
                            </p>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Sectors</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {eligibleResidents.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                                                No eligible residents remaining (all matched residents have applied).
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {eligibleResidents.map((resident) => (
                                        <TableRow key={resident.id}>
                                            <TableCell className="font-medium">
                                                <Link href={`/residents/${resident.id}`} className="hover:underline">
                                                    {resident.full_name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <SectorBadges sectors={resident.sectors} />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {endorsedIds.has(resident.id) ? (
                                                    <span className="text-xs text-muted-foreground">Endorsed</span>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={program.status !== 'active'}
                                                        onClick={() => endorse(resident)}
                                                    >
                                                        Endorse
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

ProgramShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Programs', href: '/programs' },
        { title: 'Details', href: '#' },
    ],
};
