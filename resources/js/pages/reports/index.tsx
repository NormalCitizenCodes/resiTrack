import { Head } from '@inertiajs/react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { DataPagination } from '@/components/data-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboard } from '@/routes';
import type { AuditLogEntry, Paginated } from '@/types';

type SectorCount = { code: string; name: string; count: number };
type AgeBracket = { label: string; count: number };

type Props = {
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
                    <div className="flex gap-2">
                        {/* Downloads are file responses, so use plain anchors, not Inertia links. */}
                        <Button asChild variant="outline">
                            <a href="/reports/export/pdf">
                                <FileText className="size-4" /> Export PDF
                            </a>
                        </Button>
                        <Button asChild variant="outline">
                            <a href="/reports/export/csv">
                                <FileSpreadsheet className="size-4" /> Export CSV
                            </a>
                        </Button>
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
                <Card>
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
