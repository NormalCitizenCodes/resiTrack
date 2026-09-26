import { Link, router, useForm } from '@inertiajs/react';
import { CalendarPlus, Clock, MapPin, Package, Trash2 } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { confirmDialog } from '@/components/confirm-dialog';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useScheduleTime } from '@/hooks/use-relative-date';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export type ProgramSchedule = {
    id: number;
    program_id: number;
    program_title?: string | null;
    title: string;
    starts_at: string;
    location: string;
    what_to_bring: string | null;
    notes: string | null;
};

/** Calendar-page style date block: big day number, short month. */
function DateBlock({ value, soon }: { value: string; soon: boolean }) {
    const date = new Date(`${value}:00Z`);

    return (
        <div
            aria-hidden="true"
            className={cn(
                'flex w-14 shrink-0 flex-col items-center justify-center self-start rounded-lg border py-1.5',
                soon ? 'border-primary bg-primary text-primary-foreground' : 'bg-card',
            )}
        >
            <span className="text-[0.65rem] font-semibold tracking-wider uppercase opacity-80">
                {date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}
            </span>
            <span className="text-xl leading-none font-bold tabular-nums">{date.getUTCDate()}</span>
        </div>
    );
}

export function ScheduleList({
    schedules,
    showProgram = false,
    onRemove,
}: {
    schedules: ProgramSchedule[];
    showProgram?: boolean;
    onRemove?: (schedule: ProgramSchedule) => void;
}) {
    const { t } = useTranslation();
    const describe = useScheduleTime();

    return (
        <ul className="space-y-3">
            {schedules.map((schedule) => {
                const { day, time, daysAway } = describe(schedule.starts_at);
                const past = daysAway !== null && daysAway < 0;
                const soon = daysAway === 0 || daysAway === 1;

                return (
                    <li key={schedule.id} className={cn('flex gap-3', past && 'opacity-60')}>
                        <DateBlock value={schedule.starts_at} soon={soon} />
                        <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold">{schedule.title}</p>
                                {daysAway === 0 && <Badge>{t('dashboard.schedules.today')}</Badge>}
                                {daysAway === 1 && <Badge>{t('dashboard.schedules.tomorrow')}</Badge>}
                            </div>
                            {showProgram && schedule.program_title && (
                                <Link href={`/programs/${schedule.program_id}`} className="block text-sm text-primary underline-offset-4 hover:underline">
                                    {schedule.program_title}
                                </Link>
                            )}
                            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                                <Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                                <span>
                                    {day}, {time}
                                </span>
                            </p>
                            <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                                <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                                <span>{schedule.location}</span>
                            </p>
                            {schedule.what_to_bring && (
                                <p className="flex items-start gap-1.5 text-sm">
                                    <Package className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                                    <span>
                                        <span className="font-medium">{t('dashboard.schedules.bring')}:</span> {schedule.what_to_bring}
                                    </span>
                                </p>
                            )}
                            {schedule.notes && <p className="text-sm whitespace-pre-line text-muted-foreground">{schedule.notes}</p>}
                        </div>
                        {onRemove && (
                            <Button variant="ghost" size="icon" aria-label={`Remove ${schedule.title}`} onClick={() => onRemove(schedule)}>
                                <Trash2 className="size-4" />
                            </Button>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

/** The agency's form for posting a new date. Staff-facing, so English. */
export function ScheduleForm({ programId }: { programId: number }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        title: 'Payout',
        starts_at: '',
        location: '',
        what_to_bring: '',
        notes: '',
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post(`/programs/${programId}/schedules`, { preserveScroll: true, onSuccess: () => reset() });
    };

    return (
        <form onSubmit={submit} className="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
                <Label htmlFor="schedule-title">What is happening</Label>
                <Input id="schedule-title" value={data.title} placeholder="Payout, distribution, check-up day" onChange={(e) => setData('title', e.target.value)} />
                <InputError message={errors.title} />
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="schedule-when">Date and time</Label>
                <Input id="schedule-when" type="datetime-local" value={data.starts_at} onChange={(e) => setData('starts_at', e.target.value)} />
                <InputError message={errors.starts_at} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="schedule-where">Where</Label>
                <Input id="schedule-where" value={data.location} placeholder="e.g. Barangay 22 covered court" onChange={(e) => setData('location', e.target.value)} />
                <InputError message={errors.location} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="schedule-bring">What to bring (optional)</Label>
                <Input id="schedule-bring" value={data.what_to_bring} placeholder="e.g. Valid ID, resiTrack ID card, claim stub" onChange={(e) => setData('what_to_bring', e.target.value)} />
                <InputError message={errors.what_to_bring} />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="schedule-notes">Notes (optional)</Label>
                <textarea
                    id="schedule-notes"
                    rows={2}
                    value={data.notes}
                    onChange={(e) => setData('notes', e.target.value)}
                    className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <InputError message={errors.notes} />
            </div>
            <div className="sm:col-span-2">
                <Button type="submit" disabled={processing}>
                    <CalendarPlus className="size-4" /> Post and notify beneficiaries
                </Button>
            </div>
        </form>
    );
}

export function removeSchedule(schedule: ProgramSchedule) {
    void confirmDialog({
        title: `Remove "${schedule.title}"?`,
        description: 'Beneficiaries will be told it was cancelled.',
        confirmLabel: 'Remove',
        destructive: true,
    }).then((ok) => ok && router.delete(`/program-schedules/${schedule.id}`, { preserveScroll: true }));
}
