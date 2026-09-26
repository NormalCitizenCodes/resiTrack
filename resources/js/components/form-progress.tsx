import { Check, CircleCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FormSection = {
    id: string;
    label: string;
    /** done: filled in. todo: something required is missing. open: optional and still empty. */
    state: 'done' | 'todo' | 'open';
};

const DOT: Record<FormSection['state'], string> = {
    done: 'border-success bg-success text-white',
    todo: 'border-warning bg-warning/15 text-warning-text',
    open: 'border-border bg-card text-transparent',
};

/**
 * A slim bar pinned above a long form: how many of the required details are in,
 * and one chip per section that jumps to it. It only reports; nothing here blocks
 * saving, the server still validates.
 */
export function FormProgress({ done, total, sections }: { done: number; total: number; sections: FormSection[] }) {
    const percent = total === 0 ? 100 : Math.round((done / total) * 100);
    const complete = done >= total;

    const jump = (id: string) => {
        const target = document.getElementById(id);

        if (target) {
            const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        }
    };

    return (
        <div className="sticky top-0 z-20 rounded-xl border border-border bg-card/95 px-4 py-2.5 shadow-md sm:rounded-2xl sm:px-5 sm:py-4 sm:shadow-lg shadow-brand-navy/10 backdrop-blur supports-[backdrop-filter]:bg-card/85">
            <p className="hidden text-xs font-medium text-muted-foreground sm:block">Registration progress</p>
            <div className="flex items-end justify-between gap-3 sm:mt-1">
                <p className={cn('text-base font-bold tracking-tight tabular-nums sm:text-xl', complete ? 'text-success-text' : 'text-primary')}>
                    {complete ? 'Ready to save' : `${percent}% complete`}
                </p>
                <p className="flex items-center gap-1.5 pb-0.5 text-sm font-medium text-muted-foreground tabular-nums">
                    <CircleCheck className="hidden size-4 sm:block" aria-hidden="true" />
                    {done} of {total} required
                </p>
            </div>
            <div
                role="progressbar"
                aria-label="Required details filled in"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={done}
                className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10 sm:mt-3 sm:h-3"
            >
                <div
                    className={cn(
                        'h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none',
                        complete ? 'bg-success' : 'bg-gradient-to-r from-primary to-brand-cyan',
                    )}
                    style={{ width: `${percent}%` }}
                />
            </div>
            <ul className="-mx-1 mt-4 hidden gap-1.5 sm:flex overflow-x-auto px-1 pb-0.5">
                {sections.map((section) => (
                    <li key={section.id} className="shrink-0">
                        <button
                            type="button"
                            onClick={() => jump(section.id)}
                            className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                        >
                            <span className={cn('flex size-4 items-center justify-center rounded-full border-2 transition-colors', DOT[section.state])} aria-hidden="true">
                                {section.state === 'done' && <Check className="size-2.5" strokeWidth={4} />}
                                {section.state === 'todo' && <span className="size-1 rounded-full bg-warning" />}
                            </span>
                            {section.label}
                            <span className="sr-only">
                                {section.state === 'done' ? ', filled in' : section.state === 'todo' ? ', needs required details' : ', optional'}
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
