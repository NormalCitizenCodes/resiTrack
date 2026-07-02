import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { SectorBadges } from '@/components/sector-badges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboard } from '@/routes';
import type { Household, HouseholdWellbeingAssessment, Resident, WellbeingLevel } from '@/types';

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium">{value !== null && value !== undefined && value !== '' ? value : '—'}</dd>
        </div>
    );
}

function WellbeingCard({
    household,
    levels,
    assessments,
}: {
    household: Household;
    levels: WellbeingLevel[];
    assessments: HouseholdWellbeingAssessment[];
}) {
    const current = assessments[0];
    const { data, setData, post, processing, errors, reset } = useForm({
        level_id: '',
        assessment_date: '',
        remarks: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(`/households/${household.id}/wellbeing-assessments`, {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Wellbeing Assessment
                    {current?.level && <Badge variant="secondary">{current.level.label}</Badge>}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <form onSubmit={submit} className="grid gap-3 md:grid-cols-4">
                    <div className="md:col-span-1">
                        <Label className="mb-1.5 block">Level</Label>
                        <Select value={data.level_id} onValueChange={(v) => setData('level_id', v)}>
                            <SelectTrigger>
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
                    <div>
                        <Label className="mb-1.5 block">Date</Label>
                        <Input
                            type="date"
                            value={data.assessment_date}
                            onChange={(e) => setData('assessment_date', e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-1">
                        <Label className="mb-1.5 block">Remarks</Label>
                        <Input value={data.remarks} onChange={(e) => setData('remarks', e.target.value)} />
                    </div>
                    <div className="flex items-end">
                        <Button type="submit" disabled={processing || !data.level_id}>
                            Record
                        </Button>
                    </div>
                    {errors.level_id && <p className="text-sm text-red-600 md:col-span-4">{errors.level_id}</p>}
                </form>

                {assessments.length > 0 && (
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
                                    <TableCell>{assessment.assessment_date?.substring(0, 10) ?? '—'}</TableCell>
                                    <TableCell>{assessment.level?.label ?? '—'}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {assessment.assessor?.name ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{assessment.remarks ?? '—'}</TableCell>
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
}: {
    household: Household & { residents?: Resident[]; zone?: { zone_name: string } };
    wellbeingLevels: WellbeingLevel[];
}) {
    const members = household.residents ?? [];
    const assessments = household.wellbeing_assessments ?? [];

    return (
        <>
            <Head title={household.household_number ?? `Household #${household.id}`} />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight">
                        {household.household_number ?? `Household #${household.id}`}
                    </h1>
                    {household.is_4ps_beneficiary && <Badge variant="secondary">4Ps</Badge>}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Household Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="grid gap-4 md:grid-cols-3">
                            <DetailRow label="Address" value={household.address} />
                            <DetailRow label="Zone / Purok" value={household.zone?.zone_name} />
                            <DetailRow label="Members" value={household.member_count} />
                            <DetailRow label="House Ownership" value={household.house_ownership} />
                            <DetailRow label="Water Source" value={household.water_source} />
                            <DetailRow label="Electricity" value={household.electricity_source} />
                            <DetailRow label="Waste Management" value={household.waste_management} />
                            <DetailRow label="Toilet Facility" value={household.toilet_facility} />
                            <DetailRow label="Monthly Income" value={household.monthly_income ? `₱${household.monthly_income}` : null} />
                        </dl>
                    </CardContent>
                </Card>

                <WellbeingCard household={household} levels={wellbeingLevels} assessments={assessments} />

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
                                        <TableCell className="font-medium">{member.full_name}</TableCell>
                                        <TableCell>
                                            {member.age ?? '—'}
                                            <span className="text-muted-foreground"> / {member.sex ?? '—'}</span>
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
