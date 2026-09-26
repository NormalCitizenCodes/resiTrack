import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AuditLogEntry } from '@/types';

const LABELS: Record<string, string> = {
    sector_dashboard: 'Sector dashboard',
    resident_population: 'Resident population',
    barangay_summary: 'Barangay summary',
    resident_list: 'Resident list',
    program_reach: 'Program reach',
    household_leaders: 'Household leaders',
};

type Payload = { format?: string; scope?: string; period?: string | null; names?: boolean | null; filters?: string[] };

function readPayload(entry: AuditLogEntry): Payload {
    try {
        return entry.new_value ? (JSON.parse(entry.new_value) as Payload) : {};
    } catch {
        return {};
    }
}

/**
 * The last few reports printed or downloaded, next to where new ones are made. The full
 * history stays in the table further down the page, which this links to.
 */
export function RecentReports({ entries }: { entries: AuditLogEntry[] }) {
    const recent = entries.slice(0, 10);

    return (
        <Card className="h-full min-h-0 gap-4">
            <CardHeader>
                <CardTitle>Recent reports</CardTitle>
                <CardDescription>Printed or downloaded from this barangay.</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-y-auto">
                {recent.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing yet. Reports you create will be listed here.</p>
                ) : (
                    <ul className="divide-y">
                        {recent.map((entry) => {
                            const payload = readPayload(entry);
                            const details = [payload.scope, payload.period, payload.names === true ? 'with names' : payload.names === false ? 'counts only' : null, ...(payload.filters ?? [])].filter(Boolean);

                            return (
                                <li key={entry.id} className="py-2.5 first:pt-0 last:pb-0">
                                    <p className="flex items-baseline justify-between gap-3 text-sm">
                                        <span className="font-medium">{LABELS[entry.table_affected ?? ''] ?? entry.table_affected}</span>
                                        <span className="shrink-0 text-xs text-muted-foreground">{entry.performed_at?.substring(0, 10) ?? '-'}</span>
                                    </p>
                                    <p className="mt-0.5 text-xs text-pretty text-muted-foreground">
                                        {entry.user?.name ?? 'Someone'}
                                        {payload.format ? ` · ${payload.format === 'print' ? 'printed' : payload.format.toUpperCase()}` : ''}
                                    </p>
                                    {details.length > 0 && <p className="text-xs text-pretty text-muted-foreground">{details.join(' · ')}</p>}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
            {recent.length > 0 && (
                <div className="px-6">
                    <a href="#report-history" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
                        See the full history
                    </a>
                </div>
            )}
        </Card>
    );
}
