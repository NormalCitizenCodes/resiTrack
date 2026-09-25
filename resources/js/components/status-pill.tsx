import { cn } from '@/lib/utils';

/**
 * Status chip for request-style records (certificates, reports). The tone
 * says what the reader should feel, the label says what happened:
 * waiting = someone else's move, progress = being handled, good = act on it
 * (ready for pickup, resolved), done = finished, nothing to do, bad = declined.
 */
export type StatusTone = 'waiting' | 'progress' | 'good' | 'done' | 'bad';

const TONES: Record<StatusTone, string> = {
    waiting: 'bg-muted text-muted-foreground',
    progress: 'bg-info/15 text-info-text',
    good: 'bg-success/15 text-success-text',
    done: 'border border-border text-muted-foreground',
    bad: 'bg-destructive/10 text-destructive',
};

export function StatusPill({ tone, children, className }: { tone: StatusTone; children: React.ReactNode; className?: string }) {
    return (
        <span className={cn('inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', TONES[tone], className)}>
            {children}
        </span>
    );
}

export const DOCUMENT_TONE: Record<string, StatusTone> = {
    pending: 'waiting',
    ready: 'good',
    released: 'done',
    rejected: 'bad',
};

export const CONCERN_TONE: Record<string, StatusTone> = {
    open: 'waiting',
    in_progress: 'progress',
    resolved: 'good',
    closed: 'done',
};
