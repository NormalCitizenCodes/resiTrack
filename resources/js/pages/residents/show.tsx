import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Copy, Home, Pencil } from 'lucide-react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { confirmDialog } from '@/components/confirm-dialog';
import { SectorBadges } from '@/components/sector-badges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDay, humanize } from '@/lib/humanize';
import { formatResidentId } from '@/lib/resident-id';
import { dashboard } from '@/routes';
import type { Resident } from '@/types';

const MATCH_LABEL: Record<string, string> = {
    philsys: 'Identical PhilSys number',
    name_dob: 'Same name and date of birth',
    name_address: 'Same name and address',
    cross_barangay_transfer: 'Possible cross-barangay transfer',
};

type AlertRow = {
    id: number;
    match_basis: string;
    similarity_score: number;
    status: string;
    escalated: boolean;
    other: { id: number; name: string; barangay: string | null; can_open: boolean } | null;
};

type Props = {
    resident: Resident;
    alerts: AlertRow[];
    profiler: { name: string | null; role: string | null; at: string | null; registered: string | null };
    sector_reasons: Record<string, string[]>;
    household_member_total: number;
    is_household_leader: boolean;
    household_members: { id: number; name: string; is_leader: boolean; age: number | null; sex: string | null; is_active: boolean; sectors: string[] }[];
    programs: { id: number; title: string | null; agency: string | null; status: string; beneficiary: string | null; applied_on: string | null }[];
    requests: {
        certificates: { id: number; label: string; status: string; on: string | null }[];
        concerns: { id: number; label: string; status: string; on: string | null }[];
    } | null;
    history: { id: number; summary: string; by: string | null; at: string | null }[] | null;
    portal: { has_account: boolean; is_active: boolean | null; last_login: string | null } | null;
};

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium">{value !== null && value !== undefined && value !== '' ? value : '-'}</dd>
        </div>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

function Empty({ children }: { children: ReactNode }) {
    return <p className="text-sm text-muted-foreground">{children}</p>;
}

export default function ResidentShow({ resident, alerts, profiler, sector_reasons, household_member_total, is_household_leader, household_members, programs, requests, history, portal }: Props) {
    const { flash } = usePage().props;
    const role = usePage().props.auth.user.role;
    const canEdit = role !== 'super_admin';
    const canManageStatus = role === 'barangay_admin';
    const canPermanentlyDelete = role === 'super_admin';
    const pending = alerts.filter((alert) => alert.status === 'pending');

    const toggleActive = () => {
        const action = resident.is_active ? 'deactivate' : 'restore';
        void confirmDialog({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resident.full_name}?`,
            confirmLabel: action.charAt(0).toUpperCase() + action.slice(1),
            destructive: resident.is_active,
        }).then((ok) => ok && router.post(`/residents/${resident.id}/toggle`));
    };

    const permanentlyDelete = () => {
        void confirmDialog({
            title: `Permanently delete ${resident.full_name}?`,
            description: 'The record and everything attached to it will be removed. This cannot be undone.',
            confirmLabel: 'Delete permanently',
            destructive: true,
        }).then((ok) => ok && router.delete(`/residents/${resident.id}/permanent`));
    };

    const copyId = () => {
        if (!resident.resident_id) {
            return;
        }

        navigator.clipboard
            .writeText(resident.resident_id)
            .then(() => toast.success('Resident ID copied'))
            .catch(() => toast.error('Could not copy the ID'));
    };

    return (
        <>
            <Head title={resident.full_name} />
            <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4">
                {flash.residentRegistration && (
                    <Card className="border-primary/30 bg-primary/5">
                        <CardHeader><CardTitle>{flash.residentRegistration.accountLinked ? 'Official profiling completed' : 'Resident Successfully Registered'}</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p className="text-lg font-semibold">{flash.residentRegistration.name}</p>
                            <p>Resident ID: <strong>{flash.residentRegistration.residentId}</strong></p>
                            <p>Household: <strong>{flash.residentRegistration.householdId ?? 'Unassigned'}</strong></p>
                            {flash.residentRegistration.accountLinked && (
                                <p>The existing resident account is now linked to this official record. The resident can log in using their Resident ID or email and password.</p>
                            )}
                            {!flash.residentRegistration.accountLinked && (
                                <>
                                    <p>Resident Portal: <strong>{flash.residentRegistration.accountCreated ? 'Account created' : 'No account created'}</strong></p>
                                    {flash.residentRegistration.accountCreated && <p>The resident can log in using their Resident ID and password{flash.residentRegistration.emailLoginAvailable ? ' or email and password.' : '.'}</p>}
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight">{resident.full_name}</h1>
                            {resident.is_duplicate_flagged && <Badge variant="destructive">Flagged</Badge>}
                            {!resident.is_active && <Badge variant="outline">Inactive</Badge>}
                            {is_household_leader && <Badge variant="secondary">Household leader</Badge>}
                        </div>
                        <SectorBadges sectors={resident.sectors} />
                        <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                            {resident.resident_id && (
                                <>
                                    <span className="font-mono tracking-wide text-foreground">{formatResidentId(resident.resident_id)}</span>
                                    <button
                                        type="button"
                                        onClick={copyId}
                                        className="inline-flex items-center gap-1 rounded px-1 text-muted-foreground underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                                        aria-label="Copy the Resident ID"
                                    >
                                        <Copy className="size-3" aria-hidden="true" /> Copy
                                    </button>
                                    <span aria-hidden="true">·</span>
                                </>
                            )}
                            {profiler.name ? (
                                <span>
                                    Profiled by <strong className="font-medium text-foreground">{profiler.name}</strong>
                                    {profiler.role ? `, ${profiler.role}` : ''}
                                    {profiler.at ? `, on ${profiler.at}` : ''}
                                </span>
                            ) : (
                                <span>Profiler not recorded{profiler.registered ? ` · registered ${profiler.registered}` : ''}</span>
                            )}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {resident.household && (
                            <Button asChild variant="outline">
                                <Link href={`/households/${resident.household.id}`}>
                                    <Home className="size-4" /> View household
                                </Link>
                            </Button>
                        )}
                        {canEdit && (
                            <Button asChild variant="outline">
                                <Link href={`/residents/${resident.id}/edit`}>
                                    <Pencil className="size-4" /> Edit
                                </Link>
                            </Button>
                        )}
                        {canManageStatus && (
                            <Button variant={resident.is_active ? 'destructive' : 'secondary'} onClick={toggleActive}>
                                {resident.is_active ? 'Deactivate' : 'Activate / Restore'}
                            </Button>
                        )}
                        {canPermanentlyDelete && (
                            <Button variant="outline" onClick={permanentlyDelete}>
                                Permanent Delete
                            </Button>
                        )}
                    </div>
                </div>

                {pending.length > 0 && (
                    <div role="alert" className="rounded-lg border border-warning/50 bg-warning/10 p-4">
                        <p className="flex items-center gap-2 text-sm font-semibold text-warning-text">
                            <AlertTriangle className="size-4" aria-hidden="true" />
                            {pending.length === 1 ? 'This record may be a duplicate' : `This record matches ${pending.length} others`}
                        </p>
                        <ul className="mt-2 space-y-1.5">
                            {pending.map((alert) => (
                                <li key={alert.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                    <span>
                                        {alert.other ? (
                                            alert.other.can_open ? (
                                                <Link href={`/residents/${alert.other.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                                                    {alert.other.name}
                                                </Link>
                                            ) : (
                                                <span className="font-medium" title={`This record belongs to ${alert.other.barangay ?? 'another barangay'}. Only their barangay can open it.`}>
                                                    {alert.other.name}
                                                </span>
                                            )
                                        ) : (
                                            'Another record'
                                        )}
                                        {alert.other?.barangay && <span className="text-muted-foreground"> ({alert.other.barangay})</span>}
                                        <span className="text-muted-foreground">
                                            {' '}
                                            · {MATCH_LABEL[alert.match_basis] ?? alert.match_basis}, {Math.round(alert.similarity_score * 100)}% match
                                            {alert.escalated ? ', escalated to the admin' : ''}
                                        </span>
                                    </span>
                                    <Button asChild variant="link" size="sm" className="h-auto p-0">
                                        <Link href="/duplicate-alerts">Review</Link>
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
                    <div className="space-y-4">
                        <Section title="Personal Information">
                            <dl className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                                <DetailRow label="PhilSys Card No." value={resident.philsys_card_no} />
                                <DetailRow label="Date of Birth" value={formatDay(resident.date_of_birth)} />
                                <DetailRow label="Age" value={resident.age} />
                                <DetailRow label="Sex" value={humanize(resident.sex)} />
                                <DetailRow label="Civil Status" value={humanize(resident.civil_status)} />
                                <DetailRow label="Citizenship" value={resident.citizenship} />
                                <DetailRow label="Place of Birth" value={resident.place_of_birth} />
                                <DetailRow label="Religion" value={resident.religion} />
                                <DetailRow label="Barangay" value={resident.barangay?.name} />
                            </dl>
                        </Section>

                        <Section title="Contact & Socio-economic">
                            <dl className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                                <DetailRow label="Contact Number" value={resident.contact_number} />
                                <DetailRow label="Email" value={resident.email} />
                                <DetailRow label="Address" value={resident.address} />
                                <DetailRow label="Occupation" value={resident.occupation} />
                                <DetailRow label="Employment Status" value={humanize(resident.employment_status)} />
                                <DetailRow label="Monthly Income" value={resident.monthly_income ? `₱${Number(resident.monthly_income).toLocaleString('en-US')}` : null} />
                                <DetailRow label="Education Level" value={humanize(resident.education_level)} />
                                <DetailRow label="Education Status" value={humanize(resident.education_status)} />
                                <DetailRow label="Household" value={resident.household?.household_number} />
                            </dl>
                        </Section>

                        {resident.household && (
                            <Section title="Household members">
                                {household_members.length === 0 ? (
                                    <Empty>No one else is recorded in this household.</Empty>
                                ) : (
                                    <ul className="divide-y">
                                        {household_members.map((member) => (
                                            <li key={member.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 first:pt-0 last:pb-0">
                                                <Link href={`/residents/${member.id}`} className="text-sm font-medium hover:underline">
                                                    {member.name}
                                                    {!member.is_active && <span className="font-normal text-muted-foreground"> (inactive)</span>}
                                                    {member.is_leader && <span className="font-normal text-muted-foreground"> · household leader</span>}
                                                </Link>
                                                <span className="text-xs text-muted-foreground">
                                                    {[member.age !== null ? `${member.age} yrs` : null, humanize(member.sex), member.sectors.join(', ') || null].filter(Boolean).join(' · ')}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {household_member_total > household_members.length && (
                                    <p className="mt-3 text-xs text-muted-foreground">
                                        And {household_member_total - household_members.length} more.{' '}
                                        <Link href={`/households/${resident.household.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                                            See the whole household
                                        </Link>
                                    </p>
                                )}
                            </Section>
                        )}

                        <Section title="Programs">
                            {programs.length === 0 ? (
                                <Empty>No program applications yet.</Empty>
                            ) : (
                                <ul className="divide-y">
                                    {programs.map((program) => (
                                        <li key={program.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 first:pt-0 last:pb-0">
                                            <span className="text-sm">
                                                <span className="font-medium">{program.title ?? 'Removed program'}</span>
                                                {program.agency && <span className="text-muted-foreground"> · {program.agency}</span>}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {program.beneficiary === 'active' ? 'Active beneficiary' : `Application ${program.status}`}
                                                {program.applied_on ? ` · ${program.applied_on}` : ''}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>

                        {requests && (
                            <div className="grid gap-4 md:grid-cols-2">
                                <Section title="Certificate requests">
                                    {requests.certificates.length === 0 ? (
                                        <Empty>None.</Empty>
                                    ) : (
                                        <ul className="divide-y">
                                            {requests.certificates.map((item) => (
                                                <li key={item.id} className="flex items-baseline justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                                                    <span className="font-medium">{item.label}</span>
                                                    <span className="shrink-0 text-xs text-muted-foreground">
                                                        {humanize(item.status)} · {item.on}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </Section>
                                <Section title="Reports to the barangay">
                                    {requests.concerns.length === 0 ? (
                                        <Empty>None.</Empty>
                                    ) : (
                                        <ul className="divide-y">
                                            {requests.concerns.map((item) => (
                                                <li key={item.id} className="flex items-baseline justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                                                    <span className="font-medium">{item.label}</span>
                                                    <span className="shrink-0 text-xs text-muted-foreground">
                                                        {humanize(item.status)} · {item.on}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </Section>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <Section title="Why these sectors">
                            {(resident.sectors ?? []).length === 0 ? (
                                <Empty>Not in any vulnerable sector. The system checks this every time the record is saved.</Empty>
                            ) : (
                                <div className="space-y-3">
                                    {(resident.sectors ?? []).map((sector) => (
                                        <div key={sector.code}>
                                            <p className="text-sm font-medium">{sector.sector_name}</p>
                                            {(sector_reasons[sector.code] ?? []).length > 0 ? (
                                                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                                                    {sector_reasons[sector.code].map((reason) => (
                                                        <li key={reason}>{reason}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="mt-1 text-xs text-muted-foreground">Assigned by the barangay.</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Section>

                        <Section title="Record">
                            <dl className="space-y-3">
                                <DetailRow label="Profiled by" value={profiler.name ? `${profiler.name}${profiler.role ? `, ${profiler.role}` : ''}` : 'Not recorded'} />
                                <DetailRow label="Profiled on" value={profiler.at} />
                                <DetailRow label="Registered" value={profiler.registered} />
                                {portal && (
                                    <DetailRow
                                        label="Resident portal login"
                                        value={
                                            portal.has_account
                                                ? `${portal.is_active ? 'Active' : 'Deactivated'}${portal.last_login ? `, last signed in ${portal.last_login}` : ', never signed in'}`
                                                : 'No login yet'
                                        }
                                    />
                                )}
                            </dl>
                        </Section>

                        {history && (
                            <Section title="Changes to this record">
                                {history.length === 0 ? (
                                    <Empty>No changes recorded.</Empty>
                                ) : (
                                    <ul className="space-y-2.5">
                                        {history.map((entry) => (
                                            <li key={entry.id} className="text-sm">
                                                <p className="font-medium">{entry.summary}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {entry.by ?? 'The system'} · {entry.at}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </Section>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

ResidentShow.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Residents', href: '/residents' },
        { title: 'Profile', href: '#' },
    ],
};
