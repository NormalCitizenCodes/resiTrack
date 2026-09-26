import { Head } from '@inertiajs/react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { DataPagination } from '@/components/data-pagination';
import { RecentReports } from '@/components/recent-reports';
import { ReportBuilder } from '@/components/report-builder';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboard } from '@/routes';
import type { AuditLogEntry, Paginated } from '@/types';

type SectorCount = { code: string; name: string; count: number };
type AgeBracket = { label: string; count: number };

type Props = {
    sectors: { code: string; name: string }[];
    zones: { id: number; name: string; barangay_id: number }[];
    barangays: { id: number; name: string }[];
    scope: string;
    totals: { residents: number };
    sectorSummary: { sectors: SectorCount[]; fourps_households: number };
    auditSummary: {
        records_updated: number;
        new_registrations: number;
        duplicates_resolved: number;
        program_applications: number;
    };
    ageDistribution: AgeBracket[];
    generatedReports: Paginated<AuditLogEntry>;
};

const REPORT_LABELS: Record<string, string> = {
    sector_dashboard: 'Sector Dashboard',
    resident_population: 'Resident Population',
    barangay_summary: 'Barangay Summary',
    resident_list: 'Resident List',
    program_reach: 'Program Reach',
    household_leaders: 'Household Leaders',
};

function AuditStat({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-lg border p-3">
            <p className="text-2xl font-semibold">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

export default function ReportsIndex({
    sectors,
    zones,
    barangays,
    scope,
    totals,
    sectorSummary,
    auditSummary,
    generatedReports,
}: Props) {
    return (
        <>
            <Head title="Reports" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Reports &amp; Sector Dashboard</h1>
                        <p className="text-sm text-muted-foreground">
                            {scope} &bull; {totals.residents.toLocaleString()} active residents. Export data for LGU
                            compliance and decision-making.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">Or download a file:</span>
                        {/* Downloads are file responses, so use plain anchors, not Inertia links. */}
                        <Button asChild variant="outline" size="sm">
                            <a href="/reports/export/pdf">
                                <FileText className="size-4" /> PDF
                            </a>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <a href="/reports/export/csv">
                                <FileSpreadsheet className="size-4" /> CSV
                            </a>
                        </Button>
                    </div>
                </div>

                {/* On wide screens the recent reports sit beside the builder; below that the full history table further down is enough. */}
                <div className="grid gap-4 2xl:grid-cols-[minmax(0,64rem)_minmax(22rem,1fr)]">
                    <ReportBuilder sectors={sectors} zones={zones} barangays={barangays} />
                    {/* The builder sets the row's height; the list fits inside it and scrolls, so it never leaves a gap under the builder. */}
                    <div className="relative hidden 2xl:block">
                        <div className="absolute inset-0">
                            <RecentReports entries={generatedReports.data} />
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {/* Sector Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Sector Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableBody>
                                    {sectorSummary.sectors.map((sector) => (
                                        <TableRow key={sector.code}>
                                            <TableCell>{sector.name}</TableCell>
                                            <TableCell className="text-right font-medium">{sector.count}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell>4Ps Beneficiary Households</TableCell>
                                        <TableCell className="text-right font-medium">
                                            {sectorSummary.fourps_households}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Audit Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Audit Summary (last 30 days)</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-3">
                            <AuditStat label="Records Updated" value={auditSummary.records_updated} />
                            <AuditStat label="New Registrations" value={auditSummary.new_registrations} />
                            <AuditStat label="Duplicate Alerts Resolved" value={auditSummary.duplicates_resolved} />
                            <AuditStat label="Program Applications" value={auditSummary.program_applications} />
                        </CardContent>
                    </Card>
                </div>

                {/* Generated report history */}
                <Card id="report-history" className="scroll-mt-4">
                    <CardHeader>
                        <CardTitle>Previously Generated Reports</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Report Type</TableHead>
                                    <TableHead>Format</TableHead>
                                    <TableHead>Generated By</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {generatedReports.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                            No reports generated yet. Use the export buttons above.
                                        </TableCell>
                                    </TableRow>
                                )}
                                {generatedReports.data.map((entry) => {
                                    let format: string | null = null;

                                    try {
                                        format = entry.new_value ? JSON.parse(entry.new_value).format : null;
                                    } catch {
                                        format = null;
                                    }

                                    return (
                                        <TableRow key={entry.id}>
                                            <TableCell className="font-medium">
                                                {REPORT_LABELS[entry.table_affected ?? ''] ?? entry.table_affected}
                                            </TableCell>
                                            <TableCell>
                                                {format && <Badge variant="outline">{format.toUpperCase()}</Badge>}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {entry.user?.name ?? '-'}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {entry.performed_at?.substring(0, 10) ?? '-'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <DataPagination meta={generatedReports} />
            </div>
        </>
    );
}

ReportsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Reports', href: '/reports' },
    ],
};
