import { Head, Link, router } from '@inertiajs/react';
import { BadgeCheck, CircleX, HandHeart, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { SectorBadge } from '@/components/sector-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatResidentId } from '@/lib/resident-id';
import { dashboard } from '@/routes';

type Result = {
    id: number;
    full_name: string;
    resident_id: string;
    barangay: string | null;
    age: number | null;
    sex: string | null;
    is_active: boolean;
    sectors: { code: string; name: string }[];
    can_open_record: boolean;
    agency_programs:
        | { id: number; title: string; schedule_id: number | null; schedule_title: string | null; claimed_today: boolean; can_claim: boolean }[]
        | null;
};

/**
 * What staff or an agency sees after scanning a resident's ID card. Deliberately
 * short: enough to confirm the person at the counter, not their whole profile.
 */
export default function VerifyResident({ result, checkedId }: { result: Result | null; checkedId: string }) {
    const valid = result !== null;
    const good = valid && result.is_active;

    return (
        <>
            <Head title="Verify Resident ID" />
            <div className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 p-4">
                <h1 className="text-xl font-semibold tracking-tight">Verify Resident ID</h1>

                <div
                    role="status"
                    className={
                        good
                            ? 'flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 p-4 text-success-text'
                            : valid
                              ? 'flex items-center gap-3 rounded-xl border border-warning/50 bg-warning/10 p-4 text-warning-text'
                              : 'flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive'
                    }
                >
                    {good ? (
                        <BadgeCheck className="size-8 shrink-0" aria-hidden="true" />
                    ) : valid ? (
                        <TriangleAlert className="size-8 shrink-0" aria-hidden="true" />
                    ) : (
                        <CircleX className="size-8 shrink-0" aria-hidden="true" />
                    )}
                    <div>
                        <p className="text-lg font-bold">
                            {good ? 'Verified resident' : valid ? 'Record is inactive' : 'Not a valid resiTrack ID'}
                        </p>
                        <p className="text-sm opacity-90">
                            {good
                                ? 'This card matches an active resident record.'
                                : valid
                                  ? 'The card is genuine, but the record is inactive (moved out, deceased, or deactivated). Refer to the barangay.'
                                  : `No genuine card matches ${checkedId}. The code may be copied, altered, or from before a system reset.`}
                        </p>
                    </div>
                </div>

                {valid && (
                    <Card>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-xl font-bold tracking-tight">{result.full_name}</p>
                                <p className="font-mono text-sm text-muted-foreground">{formatResidentId(result.resident_id)}</p>
                            </div>
                            <dl className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                    <dt className="text-xs text-muted-foreground">Barangay</dt>
                                    <dd className="font-medium">{result.barangay ?? '-'}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground">Age</dt>
                                    <dd className="font-medium">{result.age ?? '-'}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground">Sex</dt>
                                    <dd className="font-medium capitalize">{result.sex ?? '-'}</dd>
                                </div>
                            </dl>
                            {result.sectors.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {result.sectors.map((sector) => (
                                        <SectorBadge key={sector.code} code={sector.code} label={sector.name} />
                                    ))}
                                </div>
                            )}

                            {result.agency_programs !== null && (
                                <div className="rounded-lg border p-3">
                                    <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                                        <HandHeart className="size-4" aria-hidden="true" /> Beneficiary of your programs
                                    </p>
                                    {result.agency_programs.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">Not an active beneficiary of any of your agency's programs.</p>
                                    ) : (
                                        <ul className="space-y-2 text-sm">
                                            {result.agency_programs.map((program) => (
                                                <li key={program.id} className="flex flex-wrap items-center justify-between gap-2">
                                                    <span>
                                                        <Link href={`/programs/${program.id}`} className="underline underline-offset-4">
                                                            {program.title}
                                                        </Link>
                                                        {program.schedule_title && <span className="text-muted-foreground"> · {program.schedule_title}</span>}
                                                    </span>
                                                    {program.claimed_today ? (
                                                        <span className="text-xs font-medium text-success-text">Already claimed today</span>
                                                    ) : (
                                                        program.can_claim &&
                                                        good && (
                                                            <Button
                                                                type="button"
                                                                size="sm"
                                                                onClick={() =>
                                                                    router.post(
                                                                        `/programs/${program.id}/claims`,
                                                                        { resident_id: result.id, schedule_id: program.schedule_id },
                                                                        { preserveScroll: true, onError: (errors) => toast.error(Object.values(errors)[0] ?? 'That could not be recorded.') },
                                                                    )
                                                                }
                                                            >
                                                                Record claim
                                                            </Button>
                                                        )
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}

                            {result.can_open_record && (
                                <Button asChild variant="outline" className="w-full">
                                    <Link href={`/residents/${result.id}`}>Open full record</Link>
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}

                <p className="text-center text-xs text-muted-foreground">Every check is recorded in the audit log.</p>
            </div>
        </>
    );
}

VerifyResident.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Verify ID', href: '#' },
    ],
};
