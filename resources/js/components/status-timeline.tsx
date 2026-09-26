import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

export type TimelineStep = {
    label: string;
    /** Already formatted for the reader; leave empty when the date is not known. */
    date?: string | null;
    state: 'done' | 'current' | 'upcoming' | 'stopped';
};

const DOT: Record<TimelineStep['state'], string> = {
    done: 'border-success bg-success text-white',
    current: 'border-primary bg-card text-primary',
    upcoming: 'border-border bg-card text-transparent',
    stopped: 'border-destructive bg-destructive text-white',
};

/**
 * Where a request stands, one row per step: finished steps are ticked, the step
 * being worked on is ringed, later ones are empty, and a declined request ends
 * in a red cross. The steps and their states come from the caller, because each
 * kind of request has its own path.
 */
export function StatusTimeline({ steps, className }: { steps: TimelineStep[]; className?: string }) {
    const { t } = useTranslation();

    return (
        <ol aria-label={t('timeline.updates')} className={cn('space-y-0', className)}>
            {steps.map((step, index) => {
                const last = index === steps.length - 1;

                return (
                    <li key={`${index}-${step.label}`} aria-current={step.state === 'current' ? 'step' : undefined} className="relative flex gap-3 pb-4 last:pb-0">
                        {!last && (
                            <span
                                aria-hidden="true"
                                className={cn(
                                    'absolute top-6 left-[0.6875rem] h-[calc(100%-1.5rem)] w-0.5 rounded-full transition-colors duration-500',
                                    step.state === 'done' ? 'bg-success' : 'bg-border',
                                )}
                            />
                        )}
                        <span className={cn('relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2', DOT[step.state])} aria-hidden="true">
                            {step.state === 'done' && <Check className="size-3.5" strokeWidth={3} />}
                            {step.state === 'stopped' && <X className="size-3.5" strokeWidth={3} />}
                            {step.state === 'current' && (
                                <span className="size-2 rounded-full bg-primary motion-safe:animate-pulse" />
                            )}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p
                                className={cn(
                                    'text-sm leading-7',
                                    step.state === 'upcoming' ? 'text-muted-foreground' : 'font-medium text-foreground',
                                    step.state === 'stopped' && 'text-destructive',
                                )}
                            >
                                {step.label}
                            </p>
                            {step.date && <p className="-mt-1 text-xs text-muted-foreground">{step.date}</p>}
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

/**
 * The timeline inside a card. Open while the request is still moving; a finished
 * one starts folded away so a long history stays short to scan.
 */
export function RequestProgress({ steps, defaultOpen }: { steps: TimelineStep[]; defaultOpen: boolean }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className="rounded-lg bg-muted/50 px-3 py-2.5">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
                {open ? t('timeline.hide') : t('timeline.show')}
            </button>
            {open && <StatusTimeline steps={steps} className="mt-3" />}
        </div>
    );
}

/**
 * Builds the steps for a path of labels. `reached` is how many steps are done or
 * under way: the step at that position is the current one, unless the request
 * has finished, in which case everything is done.
 */
export function buildSteps(labels: string[], reached: number, finished: boolean, dates: (string | null | undefined)[] = []): TimelineStep[] {
    return labels.map((label, index) => ({
        label,
        date: dates[index] ?? null,
        state: finished || index < reached ? 'done' : index === reached ? 'current' : 'upcoming',
    }));
}
