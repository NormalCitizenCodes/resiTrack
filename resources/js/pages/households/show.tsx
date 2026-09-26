import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Pencil, UserPlus, UserRound } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { useState } from 'react';
import { confirmDialog } from '@/components/confirm-dialog';
import { SectorBadge, SectorBadges } from '@/components/sector-badges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDay, humanize } from '@/lib/humanize';
import { dashboard } from '@/routes';
import type { Household, HouseholdWellbeingAssessment, Resident, WellbeingLevel } from '@/types';

type Summary = {
    members: number;
    children: number;
    seniors: number;
    average_age: number | null;
    sectors: { code: string; name: string; count: number }[];
};

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium">{value !== null && value !== undefined && value !== '' ? value : '-'}</dd>
        </div>
    );
}

function Stat({ label, value }: { label: string; value: string | number }) {
    return (
        <div>
            <p className="text-xl leading-tight font-semibold tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

type Leader = { id: number; name: string; age: number | null; contact_number: string | null };
type Candidate = { id: number; name: string; age: number | null };

/** The one member the family chose to represent it. Staff record the family's choice here. */
function LeaderCard({ household, leader, candidates, canWrite }: { household: Household; leader: Leader | null; candidates: Candidate[]; canWrite: boolean }) {
    const [open, setOpen] = useState(false);
    const { data, setData, put, processing, errors, reset, clearErrors } = useForm<{ resident_id: string }>({ resident_id: '' });

    const close = () => {
        setOpen(false);
        reset();
        clearErrors();
    };

    const save = () => {
        put(`/households/${household.id}/leader`, { preserveScroll: true, onSuccess: close });
    };

    const clear = () => {
        void confirmDialog({
            title: 'Clear the household leader?',
            description: 'The household will show no leader until the family picks one again.',
            confirmLabel: 'Clear leader',
            destructive: true,
        }).then((ok) => ok && router.put(`/households/${household.id}/leader`, { resident_id: null }, { preserveScroll: true }));
    };

    return (
        <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Household leader</p>
                    {leader ? (
                        <>
                            <p className="text-base font-semibold">
                                <Link href={`/residents/${leader.id}`} className="hover:underline">
                                    {leader.name}
                                </Link>
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {[leader.age !== null ? `${leader.age} yrs` : null, leader.contact_number].filter(Boolean).join(' · ') || 'No contact number recorded'}
                            </p>
                        </>
                    ) : (
                        <p className="text-sm text-pretty text-muted-foreground">
                            {candidates.length > 0
                                ? 'No leader recorded yet. Ask the family who they chose to represent them, then record it here.'
                                : 'No leader yet, and no adult member is recorded to choose from.'}
                        </p>
                    )}
                </div>
                {canWrite && (
                    <div className="flex items-center gap-2">
                        {leader && (
                            <Button type="button" variant="ghost" onClick={clear}>
                                Clear
                            </Button>
                        )}
                        <Button type="button" variant="outline" disabled={candidates.length === 0} onClick={() => setOpen(true)}>
                            <UserRound className="size-4" /> {leader ? 'Change leader' : 'Set leader'}
                        </Button>
                    </div>
                )}
            </CardContent>

            <Dialog open={open} onOpenChange={(next) => !next && close()}>
                <DialogContent bottomSheetOnPhone>
                    <DialogHeader>
                        <DialogTitle>Who did the family choose?</DialogTitle>
                        <DialogDescription>Any member aged 18 or older can represent the household. Record the family&apos;s choice, not your own.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-1.5">
                        <Label>Household leader</Label>
                        <Select value={data.resident_id} onValueChange={(value) => setData('resident_id', value)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a member" />
                            </SelectTrigger>
                            <SelectContent>
                                {candidates.map((candidate) => (
                                    <SelectItem key={candidate.id} value={String(candidate.id)}>
                                        {candidate.name}
                                        {candidate.age !== null ? `, ${candidate.age}` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.resident_id && <p className="text-sm text-red-600">{errors.resident_id}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={save} disabled={processing || data.resident_id === ''}>
                            Save leader
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function WellbeingCard({
    household,
    levels,
    assessments,
    canRecord,
}: {
    household: Household;
    levels: WellbeingLevel[];
    assessments: HouseholdWellbeingAssessment[];
    canRecord: boolean;
}) {
    const [recording, setRecording] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        level_id: '',
        assessment_date: '',
        remarks: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(`/households/${household.id}/wellbeing-assessments`, {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setRecording(false);
            },
        });
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle>Wellbeing Assessment</CardTitle>
                {canRecord && !recording && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setRecording(true)}>
                        Record assessment
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                {canRecord && recording && (
                    <form onSubmit={submit} className="grid gap-3 rounded-lg border bg-muted/30 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] md:items-end">
                        <div className="min-w-0">
                            <Label className="mb-1.5 block">Level</Label>
                            <Select value={data.level_id} onValueChange={(v) => setData('level_id', v)}>
                                <SelectTrigger className="w-full min-w-0">
                                    <SelectValue placeholder="Select…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {levels.map((level) => (
                                        <SelectItem key={level.id} value={String(level.id)}>
                                            {level.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="min-w-0">
                            <Label className="mb-1.5 block">Date</Label>
                            <Input type="date" value={data.assessment_date} onChange={(e) => setData('assessment_date', e.target.value)} />
                        </div>
                        <div className="min-w-0">
                            <Label className="mb-1.5 block">Remarks</Label>
                            <Input value={data.remarks} onChange={(e) => setData('remarks', e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={() => {
 reset(); setRecording(false); 
}}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing || !data.level_id}>
                                Record
                            </Button>
                        </div>
                        {errors.level_id && <p className="text-sm text-red-600 md:col-span-4">{errors.level_id}</p>}
                    </form>
                )}

                {assessments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No assessment has been recorded for this household yet.</p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Level</TableHead>
                                <TableHead>Assessed By</TableHead>
                                <TableHead>Remarks</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assessments.map((assessment) => (
                                <TableRow key={assessment.id}>
                                    <TableCell>{formatDay(assessment.assessment_date) ?? '-'}</TableCell>
                                    <TableCell>{assessment.level?.label ?? '-'}</TableCell>
                                    <TableCell className="text-muted-foreground">{assessment.assessor?.name ?? '-'}</TableCell>
                                    <TableCell className="text-muted-foreground">{assessment.remarks ?? '-'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}

export default function HouseholdShow({
    household,
    wellbeingLevels,
    summary,
    family_name,
    leader,
    eligible_leaders,
}: {
    household: Household & { residents?: Resident[]; zone?: { zone_name: string } };
    wellbeingLevels: WellbeingLevel[];
    summary: Summary;
    family_name: string | null;
    leader: Leader | null;
    eligible_leaders: Candidate[];
}) {
    const role = usePage().props.auth.user?.role;
    const canWrite = role !== 'super_admin';
    const members = household.residents ?? [];
    const assessments = household.wellbeing_assessments ?? [];
    const current = assessments[0];
    const name = household.household_number ?? `Household #${household.id}`;
    const declared = household.member_count;

    return (
        <>
            <Head title={name} />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight">{family_name ? `${family_name} household` : name}</h1>
                            {family_name && <span className="text-sm text-muted-foreground">{name}</span>}
                            {household.zone && <Badge variant="outline">{household.zone.zone_name}</Badge>}
                            {household.is_4ps_beneficiary && <Badge variant="secondary">4Ps</Badge>}
                            {current?.level ? (
                                <Badge variant="secondary">Wellbeing: {current.level.label}</Badge>
                            ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                    Not assessed
                                </Badge>
                            )}
                        </div>
                        {household.address && <p className="max-w-2xl text-sm text-pretty text-muted-foreground">{household.address}</p>}
                    </div>
                    {canWrite && (
                        <div className="flex flex-wrap gap-2">
                            <Button asChild variant="outline">
                                <Link href={`/residents/create?household_id=${household.id}`}>
                                    <UserPlus className="size-4" /> Add member
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href={`/households/${household.id}/edit`}>
                                    <Pencil className="size-4" /> Edit household
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>

                <LeaderCard household={household} leader={leader} candidates={eligible_leaders} canWrite={canWrite} />

                <Card>
                    <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3">
                        <Stat label={summary.members === 1 ? 'Member' : 'Members'} value={summary.members} />
                        <Stat label="Children (under 18)" value={summary.children} />
                        <Stat label="Seniors (60+)" value={summary.seniors} />
                        <Stat label="Average age" value={summary.average_age ?? '-'} />
                        {summary.sectors.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 md:ml-auto">
                                {summary.sectors.map((sector) => (
                                    <SectorBadge key={sector.code} code={sector.code} label={`${sector.count} ${sector.name}`} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Household Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                            <DetailRow label="Address" value={household.address} />
                            <DetailRow label="Zone / Purok" value={household.zone?.zone_name} />
                            <DetailRow
                                label="Members"
                                value={declared === null || declared === undefined || declared === summary.members ? declared : `${declared} declared, ${summary.members} recorded`}
                            />
                            <DetailRow label="House Ownership" value={humanize(household.house_ownership)} />
                            <DetailRow label="Water Source" value={humanize(household.water_source)} />
                            <DetailRow label="Electricity" value={humanize(household.electricity_source)} />
                            <DetailRow label="Waste Management" value={humanize(household.waste_management)} />
                            <DetailRow label="Toilet Facility" value={humanize(household.toilet_facility)} />
                            <DetailRow label="Monthly Income" value={household.monthly_income ? `₱${Number(household.monthly_income).toLocaleString('en-US')}` : null} />
                        </dl>
                    </CardContent>
                </Card>

                <WellbeingCard household={household} levels={wellbeingLevels} assessments={assessments} canRecord={canWrite} />

                <Card>
                    <CardHeader>
                        <CardTitle>Household Members ({members.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Age / Sex</TableHead>
                                    <TableHead>Sectors</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                                            No members assigned to this household yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {members.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium">
                                            {member.full_name}
                                            {leader?.id === member.id && (
                                                <Badge variant="secondary" className="ml-2">
                                                    Leader
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {member.age ?? '-'}
                                            <span className="text-muted-foreground"> / {humanize(member.sex) ?? '-'}</span>
                                        </TableCell>
                                        <TableCell>
                                            <SectorBadges sectors={member.sectors} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/residents/${member.id}`}>View</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

HouseholdShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Households', href: '/households' },
        { title: 'Details', href: '#' },
    ],
};
