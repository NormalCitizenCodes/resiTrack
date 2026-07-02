import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, Pencil } from 'lucide-react';
import { SectorBadges } from '@/components/sector-badges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard } from '@/routes';
import type { DuplicateAlert, Resident } from '@/types';

const MATCH_LABEL: Record<string, string> = {
    philsys: 'Identical PhilSys number',
    name_dob: 'Same name & date of birth',
    name_address: 'Same name & address',
    cross_barangay_transfer: 'Possible cross-barangay transfer',
};

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
    return (
        <div>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-sm font-medium">{value !== null && value !== undefined && value !== '' ? value : '—'}</dd>
        </div>
    );
}

export default function ResidentShow({ resident, alerts }: { resident: Resident; alerts: DuplicateAlert[] }) {
    const deactivate = () => {
        if (confirm(`Deactivate ${resident.full_name}? The record is kept for audit but marked inactive.`)) {
            router.delete(`/residents/${resident.id}`);
        }
    };

    return (
        <>
            <Head title={resident.full_name} />
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight">{resident.full_name}</h1>
                            {resident.is_duplicate_flagged && <Badge variant="destructive">Flagged</Badge>}
                            {!resident.is_active && <Badge variant="outline">Inactive</Badge>}
                        </div>
                        <SectorBadges sectors={resident.sectors} />
                    </div>
                    <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <Link href={`/residents/${resident.id}/edit`}>
                                <Pencil className="size-4" /> Edit
                            </Link>
                        </Button>
                        {resident.is_active && (
                            <Button variant="destructive" onClick={deactivate}>
                                Deactivate
                            </Button>
                        )}
                    </div>
                </div>

                {alerts.length > 0 && (
                    <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="size-5" /> Duplicate / Transfer Alerts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {alerts.map((alert) => (
                                <div key={alert.id} className="flex items-center justify-between text-sm">
                                    <span>
                                        {MATCH_LABEL[alert.match_basis] ?? alert.match_basis}{' '}
                                        <span className="text-muted-foreground">
                                            ({Math.round(alert.similarity_score * 100)}% match, {alert.status})
                                        </span>
                                    </span>
                                    <Button asChild variant="link" size="sm">
                                        <Link href="/duplicate-alerts">Review</Link>
                                    </Button>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="grid gap-4 md:grid-cols-3">
                            <DetailRow label="PhilSys Card No." value={resident.philsys_card_no} />
                            <DetailRow label="Date of Birth" value={resident.date_of_birth?.substring(0, 10)} />
                            <DetailRow label="Age" value={resident.age} />
                            <DetailRow label="Sex" value={resident.sex} />
                            <DetailRow label="Civil Status" value={resident.civil_status} />
                            <DetailRow label="Place of Birth" value={resident.place_of_birth} />
                            <DetailRow label="Religion" value={resident.religion} />
                            <DetailRow label="Citizenship" value={resident.citizenship} />
                            <DetailRow label="Barangay" value={resident.barangay?.name} />
                        </dl>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Contact &amp; Socio-economic</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <dl className="grid gap-4 md:grid-cols-3">
                            <DetailRow label="Contact Number" value={resident.contact_number} />
                            <DetailRow label="Email" value={resident.email} />
                            <DetailRow label="Address" value={resident.address} />
                            <DetailRow label="Occupation" value={resident.occupation} />
                            <DetailRow label="Employment Status" value={resident.employment_status} />
                            <DetailRow label="Monthly Income" value={resident.monthly_income ? `₱${resident.monthly_income}` : null} />
                            <DetailRow label="Education Level" value={resident.education_level} />
                            <DetailRow label="Education Status" value={resident.education_status} />
                            <DetailRow label="Household" value={resident.household?.household_number} />
                        </dl>
                    </CardContent>
                </Card>
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
