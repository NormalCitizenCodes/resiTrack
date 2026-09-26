import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';

type Count = { label: string; count: number };
type NamedCount = { name: string; count: number };
type Activity = { label: string; current: number; previous: number | null };

type Meta = {
    title: string;
    scope: string;
    city: string;
    period: string | null;
    filters: { label: string; value: string }[];
    generated_at: string;
    generated_by: string;
    generated_by_role: string;
    noted_by: string | null;
};

type SummaryReport = {
    totals: { residents: number; households: number; fourps_households: number; active_beneficiaries: number };
    sex: Count[];
    sectors: { code: string; name: string; count: number }[];
    ages: Count[];
    puroks: NamedCount[];
    activity: Activity[];
    compared_with: { from: string; to: string } | null;
};

type ResidentsReport = {
    show_names: boolean;
    total: number;
    truncated: boolean;
    rows: { name: string; sex: string; age: number | null; sectors: string; purok: string | null; household: string | null; active: boolean }[];
    sex: Count[];
    ages: Count[];
    sectors: NamedCount[];
    puroks: NamedCount[];
};

type ProgramsReport = {
    rows: {
        title: string;
        agency: string | null;
        status: string;
        city_wide: boolean;
        starts: string | null;
        ends: string | null;
        slots: number | null;
        eligible: number;
        applicants: number;
        pending: number;
        approved: number;
        rejected: number;
        beneficiaries: number;
        claimed: number;
        not_applied: number;
        reach: number | null;
    }[];
    totals: { programs: number; eligible_places: number; beneficiaries: number; applicants: number };
};

type LeadersReport = {
    groups: { purok: string; rows: { family: string; leader: string; contact: string | null; members: number; household: string | null }[] }[];
    total: number;
    without_leader: number;
};

type Props = { embed: boolean } & (
    | { type: 'summary'; report: SummaryReport; meta: Meta }
    | { type: 'residents'; report: ResidentsReport; meta: Meta }
    | { type: 'programs'; report: ProgramsReport; meta: Meta }
    | { type: 'leaders'; report: LeadersReport; meta: Meta }
);

const n = (value: number) => value.toLocaleString('en-US');

function Bars({ items, unit = '' }: { items: { label: string; count: number }[]; unit?: string }) {
    const max = Math.max(1, ...items.map((item) => item.count));

    return (
        <table className="rp-table rp-bars">
            <tbody>
                {items.map((item) => (
                    <tr key={item.label}>
                        <td className="rp-bars-label">{item.label}</td>
                        <td className="rp-bars-track">
                            <span style={{ width: `${(item.count / max) * 100}%` }} />
                        </td>
                        <td className="rp-num">
                            {n(item.count)}
                            {unit}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function Kpis({ items }: { items: { label: string; value: number | string }[] }) {
    return (
        <div className="rp-kpis">
            {items.map((item) => (
                <div key={item.label} className="rp-kpi">
                    <strong>{typeof item.value === 'number' ? n(item.value) : item.value}</strong>
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
    );
}

function Change({ current, previous }: { current: number; previous: number | null }) {
    if (previous === null) {
        return <span>-</span>;
    }

    const diff = current - previous;

    if (diff === 0) {
        return <span>No change</span>;
    }

    const pct = previous > 0 ? ` (${Math.round((Math.abs(diff) / previous) * 100)}%)` : '';

    return (
        <span>
            {diff > 0 ? '+' : '-'}
            {n(Math.abs(diff))}
            {pct}
        </span>
    );
}

function SummaryBody({ report, meta }: { report: SummaryReport; meta: Meta }) {
    return (
        <>
            <h2 className="rp-h2">At a glance</h2>
            <Kpis
                items={[
                    { label: 'Active residents', value: report.totals.residents },
                    { label: 'Households', value: report.totals.households },
                    { label: '4Ps households', value: report.totals.fourps_households },
                    { label: 'Active program beneficiaries', value: report.totals.active_beneficiaries },
                ]}
            />

            <h2 className="rp-h2">Activity{meta.period ? `, ${meta.period}` : ''}</h2>
            <table className="rp-table">
                <thead>
                    <tr>
                        <th>Measure</th>
                        <th className="rp-num">This period</th>
                        {report.compared_with && <th className="rp-num">Previous period</th>}
                        {report.compared_with && <th className="rp-num">Change</th>}
                    </tr>
                </thead>
                <tbody>
                    {report.activity.map((row) => (
                        <tr key={row.label}>
                            <td>{row.label}</td>
                            <td className="rp-num">{n(row.current)}</td>
                            {report.compared_with && <td className="rp-num">{row.previous === null ? '-' : n(row.previous)}</td>}
                            {report.compared_with && (
                                <td className="rp-num">
                                    <Change current={row.current} previous={row.previous} />
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
            {report.compared_with && (
                <p className="rp-note">
                    Previous period: {report.compared_with.from} to {report.compared_with.to}, the same number of days just before this one.
                </p>
            )}

            <div className="rp-cols">
                <section>
                    <h2 className="rp-h2">Vulnerable sectors</h2>
                    <Bars items={report.sectors.map((s) => ({ label: s.name, count: s.count }))} />
                    <p className="rp-note">A resident can belong to more than one sector.</p>
                </section>
                <section>
                    <h2 className="rp-h2">Age groups</h2>
                    <Bars items={report.ages} />
                    <h2 className="rp-h2">Sex</h2>
                    <Bars items={report.sex} />
                </section>
            </div>

            {report.puroks.length > 0 && (
                <>
                    <h2 className="rp-h2">Residents by purok</h2>
                    <Bars items={report.puroks.map((p) => ({ label: p.name, count: p.count }))} />
                </>
            )}
        </>
    );
}

function ResidentsBody({ report }: { report: ResidentsReport }) {
    return (
        <>
            <Kpis
                items={[
                    { label: 'Residents in this report', value: report.total },
                    { label: 'Female', value: report.sex[0]?.count ?? 0 },
                    { label: 'Male', value: report.sex[1]?.count ?? 0 },
                ]}
            />

            <div className="rp-cols">
                <section>
                    <h2 className="rp-h2">Age groups</h2>
                    <Bars items={report.ages} />
                </section>
                <section>
                    <h2 className="rp-h2">Sectors</h2>
                    {report.sectors.length === 0 ? <p className="rp-note">No sector recorded.</p> : <Bars items={report.sectors.map((s) => ({ label: s.name, count: s.count }))} />}
                </section>
            </div>

            {report.show_names ? (
                <>
                    <h2 className="rp-h2">List of residents</h2>
                    <table className="rp-table rp-list">
                        <thead>
                            <tr>
                                <th className="rp-idx">#</th>
                                <th>Name</th>
                                <th>Sex</th>
                                <th className="rp-num">Age</th>
                                <th>Sector</th>
                                <th>Purok</th>
                                <th>Household</th>
                            </tr>
                        </thead>
                        <tbody>
                            {report.rows.map((row, index) => (
                                <tr key={index}>
                                    <td className="rp-idx">{index + 1}</td>
                                    <td>
                                        {row.name}
                                        {!row.active && <em> (inactive)</em>}
                                    </td>
                                    <td>{row.sex}</td>
                                    <td className="rp-num">{row.age ?? '-'}</td>
                                    <td>{row.sectors || '-'}</td>
                                    <td className="rp-nowrap">{row.purok ?? '-'}</td>
                                    <td className="rp-nowrap">{row.household ?? '-'}</td>
                                </tr>
                            ))}
                            {report.rows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="rp-empty">
                                        No residents match these filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    {report.truncated && (
                        <p className="rp-note">
                            Only the first {n(report.rows.length)} of {n(report.total)} residents are listed. Add a filter to narrow the list.
                        </p>
                    )}
                </>
            ) : (
                <>
                    <h2 className="rp-h2">Residents by purok</h2>
                    <Bars items={report.puroks.map((p) => ({ label: p.name, count: p.count }))} />
                    <p className="rp-note">This copy shows counts only. No names are printed.</p>
                </>
            )}
        </>
    );
}

function ProgramsBody({ report }: { report: ProgramsReport }) {
    return (
        <>
            <Kpis
                items={[
                    { label: 'Programs', value: report.totals.programs },
                    { label: 'Applications', value: report.totals.applicants },
                    { label: 'Active beneficiaries', value: report.totals.beneficiaries },
                ]}
            />
            <table className="rp-table rp-list">
                <thead>
                    <tr>
                        <th>Program</th>
                        <th className="rp-num">Could qualify</th>
                        <th className="rp-num">Applied</th>
                        <th className="rp-num">Approved</th>
                        <th className="rp-num">Beneficiaries</th>
                        <th className="rp-num">Claimed</th>
                        <th className="rp-num">Reached</th>
                        <th className="rp-num">Not yet applied</th>
                    </tr>
                </thead>
                <tbody>
                    {report.rows.map((row, index) => (
                        <tr key={index}>
                            <td>
                                <strong>{row.title}</strong>
                                <div className="rp-sub">
                                    {[row.agency, row.city_wide ? 'City-wide' : 'This barangay', row.status].filter(Boolean).join(' · ')}
                                </div>
                            </td>
                            <td className="rp-num">{n(row.eligible)}</td>
                            <td className="rp-num">{n(row.applicants)}</td>
                            <td className="rp-num">{n(row.approved)}</td>
                            <td className="rp-num">{n(row.beneficiaries)}</td>
                            <td className="rp-num">{n(row.claimed)}</td>
                            <td className="rp-num">{row.reach === null ? '-' : `${row.reach}%`}</td>
                            <td className="rp-num">{n(row.not_applied)}</td>
                        </tr>
                    ))}
                    {report.rows.length === 0 && (
                        <tr>
                            <td colSpan={8} className="rp-empty">
                                No programs in this period.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
            <p className="rp-note">
                &quot;Could qualify&quot; counts active residents whose sector matches the program (all residents if it targets none). &quot;Reached&quot; is active beneficiaries
                as a share of those who could qualify. &quot;Claimed&quot; is beneficiaries who came to claim at least once. &quot;Not yet applied&quot; is the gap.
            </p>
        </>
    );
}

/** An attendance or claim sheet: one line per household leader, a blank to sign. */
function LeadersBody({ report }: { report: LeadersReport }) {
    // Rows are numbered straight through the sheet, not per purok, so each line has one number.
    const offsets = report.groups.map((_, index) => report.groups.slice(0, index).reduce((sum, group) => sum + group.rows.length, 0));

    return (
        <>
            <Kpis
                items={[
                    { label: 'Households with a leader', value: report.total },
                    { label: 'Without a leader yet', value: report.without_leader },
                ]}
            />
            {report.groups.length === 0 && <p className="rp-note">No household has a leader recorded yet.</p>}
            {report.groups.map((group, groupIndex) => (
                <section key={group.purok}>
                    <h2 className="rp-h2">
                        {group.purok} <span className="rp-sub">({group.rows.length})</span>
                    </h2>
                    <table className="rp-table rp-list">
                        <thead>
                            <tr>
                                <th className="rp-idx">#</th>
                                <th>Household</th>
                                <th>Leader</th>
                                <th>Contact</th>
                                <th className="rp-sign-col">Signature</th>
                            </tr>
                        </thead>
                        <tbody>
                            {group.rows.map((row, index) => (
                                <tr key={index}>
                                    <td className="rp-idx">{offsets[groupIndex] + index + 1}</td>
                                    <td>{row.family} household</td>
                                    <td>{row.leader}</td>
                                    <td className="rp-nowrap">{row.contact ?? '-'}</td>
                                    <td className="rp-sign-col" />
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            ))}
        </>
    );
}

export default function ReportPrint(props: Props) {
    const { meta, embed } = props;

    useEffect(() => {
        // Inside the report builder's hidden frame, tell the builder when the page is
        // fully drawn (fonts and logo included) so it can open the print window.
        if (embed) {
            let cancelled = false;

            Promise.all([document.fonts.ready, ...Array.from(document.images).map((image) => image.decode().catch(() => undefined))]).then(() => {
                if (!cancelled) {
                    window.requestAnimationFrame(() => window.parent.postMessage({ type: 'resitrack-report-ready' }, window.location.origin));
                }
            });

            return () => {
                cancelled = true;
            };
        }

        // Opened on its own: show the print window once the page has painted, like
        // pressing Ctrl+P. The toolbar's button prints again if it is closed.
        const timer = window.setTimeout(() => window.print(), 700);

        return () => window.clearTimeout(timer);
    }, [embed]);

    const confidential = props.type === 'residents' && props.report.show_names;

    return (
        <>
            <Head title={`${meta.title} - ${meta.scope}`} />
            <div className="report-screen">
                {!embed && (
                    <div className="report-toolbar">
                        <Link href="/reports" className="report-toolbar-btn">
                            <ArrowLeft className="size-4" /> Back to Reports
                        </Link>
                        <span className="report-toolbar-hint">In the print window, choose &quot;Save as PDF&quot; as the destination to get a file.</span>
                        <button type="button" className="report-toolbar-btn report-toolbar-primary" onClick={() => window.print()}>
                            <Printer className="size-4" /> Print / Save as PDF
                        </button>
                    </div>
                )}

                <div className="report-sheet">
                    <table className="report-frame">
                        <thead>
                            <tr>
                                <td>
                                    <div className="report-running-head">
                                        <AppLogoIcon className="size-7" />
                                        <span>
                                            <strong>resiTrack</strong> · {meta.scope}
                                        </span>
                                        <span className="report-running-title">{meta.title}</span>
                                    </div>
                                </td>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="report-body">
                                    <header className="rp-title-block">
                                        <p className="rp-eyebrow">
                                            {meta.scope}
                                            {meta.city && meta.scope !== meta.city ? ` · ${meta.city}` : ''}
                                        </p>
                                        <h1 className="rp-title">{meta.title}</h1>
                                        <dl className="rp-meta">
                                            {meta.period && (
                                                <div>
                                                    <dt>Period</dt>
                                                    <dd>{meta.period}</dd>
                                                </div>
                                            )}
                                            {meta.filters.map((filter) => (
                                                <div key={filter.label}>
                                                    <dt>{filter.label}</dt>
                                                    <dd>{filter.value}</dd>
                                                </div>
                                            ))}
                                            <div>
                                                <dt>Generated</dt>
                                                <dd>{meta.generated_at}</dd>
                                            </div>
                                        </dl>
                                    </header>

                                    {props.type === 'summary' && <SummaryBody report={props.report} meta={meta} />}
                                    {props.type === 'residents' && <ResidentsBody report={props.report} />}
                                    {props.type === 'programs' && <ProgramsBody report={props.report} />}
                                    {props.type === 'leaders' && <LeadersBody report={props.report} />}

                                    <div className="rp-signatures">
                                        <div>
                                            <div className="rp-sign-line">{meta.generated_by}</div>
                                            <span>Prepared by, {meta.generated_by_role}</span>
                                        </div>
                                        <div>
                                            <div className="rp-sign-line">{meta.noted_by ?? ''}</div>
                                            <span>Noted by, Punong Barangay</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td>
                                    <div className="report-running-foot">
                                        {confidential
                                            ? 'Confidential. This report lists residents by name and is for official barangay use only. Handle and dispose of it as personal data.'
                                            : 'Generated by resiTrack, a resident profiling and social services platform. Figures are as of the time generated.'}
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </>
    );
}
