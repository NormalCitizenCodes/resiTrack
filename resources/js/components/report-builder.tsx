import { router } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type ReportType = 'summary' | 'residents' | 'programs' | 'leaders';

type Props = {
    sectors: { code: string; name: string }[];
    zones: { id: number; name: string; barangay_id: number }[];
    barangays: { id: number; name: string }[];
};

const ANY = 'any';
const NOTED_BY_KEY = 'resitrack_report_noted_by';

/**
 * Draws the report in an off-screen frame and prints that, so the print window opens
 * over the Reports page and nothing navigates. The frame tells us when it is fully
 * drawn; it is removed once the print window closes.
 */
function printInHiddenFrame(params: Record<string, string | number | boolean>, setPreparing: (value: boolean) => void) {
    const query = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)])), embed: '1' });

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.title = 'Report to print';
    // Off-screen but laid out at paper size (a display:none frame can print blank).
    Object.assign(frame.style, { position: 'fixed', left: '-10000px', top: '0', width: '210mm', height: '297mm', border: '0' });

    let timers: number[] = [];

    const cleanup = () => {
        window.removeEventListener('message', onMessage);
        timers.forEach((timer) => window.clearTimeout(timer));
        timers = [];
        frame.remove();
        setPreparing(false);
    };

    const onMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin || event.source !== frame.contentWindow || event.data?.type !== 'resitrack-report-ready') {
            return;
        }

        window.removeEventListener('message', onMessage);
        timers.forEach((timer) => window.clearTimeout(timer));

        const target = frame.contentWindow;

        if (!target) {
            cleanup();

            return;
        }

        target.addEventListener(
            'afterprint',
            () => {
                // The print was recorded when the page loaded; bring the recent-reports list up to date.
                router.reload({ only: ['generatedReports'] });
                timers.push(window.setTimeout(cleanup, 300));
            },
            { once: true },
        );
        // If the browser never reports the end of printing, do not leave the frame behind.
        timers = [window.setTimeout(cleanup, 5 * 60 * 1000)];
        target.focus();
        target.print();
    };

    setPreparing(true);
    window.addEventListener('message', onMessage);
    timers.push(
        window.setTimeout(() => {
            cleanup();
            toast.error('The report could not be prepared. Check the dates and filters, then try again.');
        }, 30000),
    );
    frame.src = `/reports/print?${query.toString()}`;
    document.body.appendChild(frame);
}

function readRememberedName(): string {
    try {
        return window.localStorage.getItem(NOTED_BY_KEY) ?? '';
    } catch {
        // Storage can be blocked; the field simply starts empty.
        return '';
    }
}

const TYPES: { key: ReportType; title: string; text: string }[] = [
    { key: 'summary', title: 'Barangay summary', text: 'Population, sectors, ages and activity, with the previous period beside it.' },
    { key: 'residents', title: 'Resident list', text: 'Residents filtered by sector, age, sex or purok, with or without names.' },
    { key: 'programs', title: 'Program reach', text: 'For each program: who could qualify, who applied and who was reached.' },
    { key: 'leaders', title: 'Household leaders', text: 'Each household\'s leader and contact number by purok, with a signature column for attendance or giveaways.' },
];

const iso = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Ready-made periods. Worked out when clicked, never during render. */
const PRESETS: { label: string; range: () => [string, string] }[] = [
    { label: 'This month', range: () => [iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), iso(new Date())] },
    { label: 'Last month', range: () => [iso(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)), iso(new Date(new Date().getFullYear(), new Date().getMonth(), 0))] },
    { label: 'This quarter', range: () => [iso(new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1)), iso(new Date())] },
    { label: 'This year', range: () => [iso(new Date(new Date().getFullYear(), 0, 1)), iso(new Date())] },
];

export function ReportBuilder({ sectors, zones, barangays }: Props) {
    const [type, setType] = useState<ReportType>('summary');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [compare, setCompare] = useState(true);
    const [barangay, setBarangay] = useState(ANY);
    const [sector, setSector] = useState(ANY);
    const [sex, setSex] = useState(ANY);
    const [zone, setZone] = useState(ANY);
    const [ageMin, setAgeMin] = useState('');
    const [ageMax, setAgeMax] = useState('');
    const [everyone, setEveryone] = useState(false);
    const [names, setNames] = useState(true);
    const [preparing, setPreparing] = useState(false);
    const [problem, setProblem] = useState<string | null>(null);

    // The "Noted by" name is asked for once and remembered in this browser. The server
    // renders it empty; the browser fills it in without a hydration mismatch.
    const remembered = useSyncExternalStore(
        () => () => undefined,
        readRememberedName,
        () => '',
    );
    const [typedName, setTypedName] = useState<string | null>(null);
    const notedBy = typedName ?? remembered;
    const setNotedBy = setTypedName;

    const visibleZones = zones.filter((z) => barangay === ANY || z.barangay_id === Number(barangay));

    const preview = () => {
        try {
            window.localStorage.setItem(NOTED_BY_KEY, notedBy);
        } catch {
            // Not remembering is fine.
        }

        if (from !== '' && to !== '' && to < from) {
            setProblem('The end date is before the start date.');

            return;
        }

        if (ageMin !== '' && ageMax !== '' && Number(ageMax) < Number(ageMin)) {
            setProblem('The oldest age is below the youngest age.');

            return;
        }

        setProblem(null);

        const params: Record<string, string | number | boolean> = { type };

        const add = (key: string, value: string) => {
            if (value !== '' && value !== ANY) {
                params[key] = value;
            }
        };

        add('from', from);
        add('to', to);
        add('barangay_id', barangay);
        add('noted_by', notedBy.trim());

        if (type === 'summary') {
            params.compare = compare ? 1 : 0;
        }

        if (type === 'leaders') {
            add('zone_id', zone);
        }

        if (type === 'residents') {
            add('sector', sector);
            add('sex', sex);
            add('zone_id', zone);
            add('age_min', ageMin);
            add('age_max', ageMax);
            params.status = everyone ? 'all' : 'active';
            params.names = names ? 1 : 0;
        }

        printInHiddenFrame(params, setPreparing);
    };


    const chooseByKey = (event: KeyboardEvent<HTMLButtonElement>) => {
        const step = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 0;

        if (step === 0) {
            return;
        }

        event.preventDefault();
        const next = TYPES[(TYPES.findIndex((option) => option.key === type) + step + TYPES.length) % TYPES.length];
        setType(next.key);
        document.getElementById(`report-type-${next.key}`)?.focus();
    };

    return (
        <Card className="max-w-5xl">
            <CardHeader>
                <CardTitle>Create a report</CardTitle>
                <CardDescription>
                    The print window opens with your report ready. Choose &quot;Save as PDF&quot; there to keep a file, or pick a printer.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
                    <div role="radiogroup" aria-label="Kind of report" className="flex flex-col gap-1">
                        {TYPES.map((option) => {
                            const selected = type === option.key;

                            return (
                                <button
                                    key={option.key}
                                    id={`report-type-${option.key}`}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    tabIndex={selected ? 0 : -1}
                                    onClick={() => setType(option.key)}
                                    onKeyDown={chooseByKey}
                                    className={cn(
                                        'flex items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                        selected ? 'bg-primary/10' : 'hover:bg-muted/60',
                                    )}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border', selected ? 'border-primary' : 'border-input')}
                                    >
                                        {selected && <span className="size-2 rounded-full bg-primary" />}
                                    </span>
                                    <span>
                                        <span className="block text-sm font-medium">{option.title}</span>
                                        <span className="mt-0.5 block text-xs text-pretty text-muted-foreground">{option.text}</span>
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="space-y-6">
                        {(barangays.length > 0 || type === 'residents' || type === 'leaders') && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {barangays.length > 0 && (
                                    <div className="grid gap-1.5">
                                        <Label>Barangay</Label>
                                        <Select
                                            value={barangay}
                                            onValueChange={(value) => {
                                                setBarangay(value);
                                                setZone(ANY);
                                            }}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={ANY}>Whole city</SelectItem>
                                                {barangays.map((b) => (
                                                    <SelectItem key={b.id} value={String(b.id)}>
                                                        {b.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {type === 'residents' && (
                                    <>
                                        <div className="grid gap-1.5">
                                            <Label>Sector</Label>
                                            <Select value={sector} onValueChange={setSector}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={ANY}>All sectors</SelectItem>
                                                    {sectors.map((s) => (
                                                        <SelectItem key={s.code} value={s.code}>
                                                            {s.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label>Sex</Label>
                                            <Select value={sex} onValueChange={setSex}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={ANY}>Any</SelectItem>
                                                    <SelectItem value="female">Female</SelectItem>
                                                    <SelectItem value="male">Male</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label>Purok</Label>
                                            <Select value={zone} onValueChange={setZone} disabled={visibleZones.length === 0}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value={ANY}>All puroks</SelectItem>
                                                    {visibleZones.map((z) => (
                                                        <SelectItem key={z.id} value={String(z.id)}>
                                                            {z.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid gap-1.5">
                                            <Label htmlFor="age-min">Age</Label>
                                            <div className="flex items-center gap-2">
                                                <Input id="age-min" className="w-24" type="number" min={0} max={130} inputMode="numeric" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} placeholder="From" aria-label="Youngest age" />
                                                <span className="text-sm text-muted-foreground">to</span>
                                                <Input id="age-max" className="w-24" type="number" min={0} max={130} inputMode="numeric" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} placeholder="To" aria-label="Oldest age" />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {type === 'leaders' && (
                                    <div className="grid gap-1.5">
                                        <Label>Purok</Label>
                                        <Select value={zone} onValueChange={setZone} disabled={visibleZones.length === 0}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value={ANY}>All puroks</SelectItem>
                                                {visibleZones.map((z) => (
                                                    <SelectItem key={z.id} value={String(z.id)}>
                                                        {z.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        )}

                        {type === 'leaders' && (
                            <p className="max-w-prose text-xs text-pretty text-muted-foreground">
                                Lists only households whose family has chosen a leader. Households without one are counted at the end, so you know who is missing.
                            </p>
                        )}

                        {type !== 'leaders' && (
                        <div className="space-y-2.5">
                            <Label>{type === 'residents' ? 'Registered between (optional)' : 'Period'}</Label>
                            {type !== 'residents' && (
                                <div className="flex flex-wrap gap-2">
                                    {PRESETS.map((preset) => (
                                        <Button
                                            key={preset.label}
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const [start, end] = preset.range();
                                                setFrom(start);
                                                setTo(end);
                                            }}
                                        >
                                            {preset.label}
                                        </Button>
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-wrap items-center gap-2">
                                <Input type="date" className="min-w-32 flex-1 sm:w-40 sm:flex-none" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
                                <span className="text-sm text-muted-foreground">to</span>
                                <Input type="date" className="min-w-32 flex-1 sm:w-40 sm:flex-none" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
                            </div>
                            {type === 'summary' && from === '' && to === '' && <p className="text-xs text-muted-foreground">Left blank, the summary covers this month so far.</p>}
                            {type === 'programs' && from === '' && to === '' && <p className="text-xs text-muted-foreground">Left blank, every program is included.</p>}
                        </div>
                        )}

                        {(type === 'summary' || type === 'residents') && (
                            <div className="space-y-2.5">
                                <div className="flex flex-wrap gap-x-6 gap-y-3">
                                    {type === 'summary' && (
                                        <label className="flex items-center gap-2 text-sm">
                                            <Checkbox checked={compare} onCheckedChange={(value) => setCompare(value === true)} />
                                            Compare with the period just before
                                        </label>
                                    )}
                                    {type === 'residents' && (
                                        <>
                                            <label className="flex items-center gap-2 text-sm">
                                                <Checkbox checked={names} onCheckedChange={(value) => setNames(value === true)} />
                                                Print names
                                            </label>
                                            <label className="flex items-center gap-2 text-sm">
                                                <Checkbox checked={everyone} onCheckedChange={(value) => setEveryone(value === true)} />
                                                Include inactive records
                                            </label>
                                        </>
                                    )}
                                </div>
                                {type === 'residents' && names && (
                                    <p className="max-w-prose text-xs text-pretty text-muted-foreground">
                                        Names are personal data. The list shows name, sex, age, sector, purok and household only, is marked confidential, and every print is recorded in the Activity Log.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-end sm:justify-between">
                    <div className="grid gap-1.5 sm:w-80">
                        <Label htmlFor="noted-by">Noted by (Punong Barangay)</Label>
                        <Input id="noted-by" maxLength={100} value={notedBy} onChange={(e) => setNotedBy(e.target.value)} placeholder="Name printed under the signature line" />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                        {problem && (
                            <p role="alert" className="text-sm text-destructive">
                                {problem}
                            </p>
                        )}
                        <Button type="button" onClick={preview} disabled={preparing}>
                            <Printer className="size-4" /> {preparing ? 'Preparing...' : 'Preview and print'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
