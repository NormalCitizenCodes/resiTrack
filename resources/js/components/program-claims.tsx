import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDay } from '@/lib/humanize';
import type { Beneficiary } from '@/types';

export type ProgramClaim = { id: number; resident_id: number; schedule_id: number | null; claimed_at: string; recorded_by: string | null };

type Day = { id: number; title: string; starts_at: string };

const NONE = 'none';

/** "2026-09-30T14:05" as "2:05 PM", without touching the clock or the time zone. */
function timeOf(value: string): string {
    const [hour, minute] = value.substring(11, 16).split(':').map(Number);

    return `${hour % 12 === 0 ? 12 : hour % 12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

/**
 * Who has claimed what the program gives, for one claim day at a time. Only the owning agency
 * can record or undo a claim; anyone else who can open this card sees it read-only.
 */
export function ProgramClaims({
    programId,
    beneficiaries,
    claims,
    days,
    today,
    canRecord,
}: {
    programId: number;
    beneficiaries: Beneficiary[];
    claims: ProgramClaim[];
    days: Day[];
    /** Today as YYYY-MM-DD, from the server. */
    today: string;
    canRecord: boolean;
}) {
    const [day, setDay] = useState<string>(NONE);
    const [onlyMissing, setOnlyMissing] = useState(false);

    const active = beneficiaries.filter((beneficiary) => beneficiary.status === 'active');

    // Claims that count for the chosen day: that claim day's own, or, with none set, today's.
    const forDay = claims.filter((claim) => (day === NONE ? claim.schedule_id === null && claim.claimed_at.startsWith(today) : claim.schedule_id === Number(day)));
    const claimFor = (residentId: number) => forDay.find((claim) => claim.resident_id === residentId);
    const claimed = active.filter((beneficiary) => claimFor(beneficiary.resident_id)).length;
    const rows = onlyMissing ? active.filter((beneficiary) => !claimFor(beneficiary.resident_id)) : active;

    const failed = (errors: Record<string, string>) => toast.error(Object.values(errors)[0] ?? 'That could not be recorded.');

    const record = (residentId: number) =>
        router.post(`/programs/${programId}/claims`, { resident_id: residentId, schedule_id: day === NONE ? null : Number(day) }, { preserveScroll: true, onError: failed });

    const undo = (claimId: number) => router.delete(`/programs/${programId}/claims/${claimId}`, { preserveScroll: true, onError: failed });

    return (
        <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <CardTitle>
                    Claims{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                        {claimed} of {active.length} claimed
                    </span>
                </CardTitle>
                <Select value={day} onValueChange={setDay}>
                    <SelectTrigger className="w-64" aria-label="Claim day">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={NONE}>Today (no set claim day)</SelectItem>
                        {days.map((option) => (
                            <SelectItem key={option.id} value={String(option.id)}>
                                {option.title} · {formatDay(option.starts_at) ?? option.starts_at.substring(0, 10)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={onlyMissing} onCheckedChange={(value) => setOnlyMissing(value === true)} />
                    Show only those who have not claimed
                </label>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Beneficiary</TableHead>
                            <TableHead>Claim</TableHead>
                            {canRecord && <TableHead className="text-right">Action</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={canRecord ? 3 : 2} className="py-6 text-center text-muted-foreground">
                                    {onlyMissing ? 'Everyone has claimed.' : 'No active beneficiaries yet.'}
                                </TableCell>
                            </TableRow>
                        )}
                        {rows.map((beneficiary) => {
                            const claim = claimFor(beneficiary.resident_id);

                            return (
                                <TableRow key={beneficiary.id}>
                                    <TableCell className="font-medium">{beneficiary.resident?.full_name ?? `Resident #${beneficiary.resident_id}`}</TableCell>
                                    <TableCell>
                                        {claim ? (
                                            <span className="text-sm">
                                                <Badge variant="secondary">Claimed</Badge>{' '}
                                                <span className="text-muted-foreground">
                                                    {timeOf(claim.claimed_at)}
                                                    {claim.recorded_by ? ` · by ${claim.recorded_by}` : ''}
                                                </span>
                                            </span>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">Not yet</span>
                                        )}
                                    </TableCell>
                                    {canRecord && (
                                        <TableCell className="text-right">
                                            {claim ? (
                                                <Button type="button" variant="ghost" size="sm" onClick={() => undo(claim.id)}>
                                                    Undo
                                                </Button>
                                            ) : (
                                                <Button type="button" variant="outline" size="sm" onClick={() => record(beneficiary.resident_id)}>
                                                    Record claim
                                                </Button>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
