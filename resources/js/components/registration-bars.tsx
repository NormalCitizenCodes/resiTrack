import { cn } from '@/lib/utils';

export type RegistrationMonth = { month: string; label: string; count: number };

const HEIGHT = 56;

/**
 * New registrations per month for the last six months. The current month is drawn in
 * the accent colour (it is still filling up); earlier months are the same hue, lighter.
 * Every bar carries its own number, so nothing has to be read off an axis.
 */
export function RegistrationBars({ months }: { months: RegistrationMonth[] }) {
    const max = Math.max(1, ...months.map((month) => month.count));
    const summary = months.map((month) => `${month.label}: ${month.count}`).join(', ');

    return (
        <div role="img" aria-label={`New registrations per month. ${summary}`} className="grid w-full max-w-72 grid-cols-6 gap-2">
            {months.map((month, index) => {
                const current = index === months.length - 1;

                return (
                    <div key={month.label} title={`${month.label}: ${month.count} new`} className="flex flex-col items-center gap-1" aria-hidden="true">
                        <span className={cn('text-xs tabular-nums', current ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{month.count}</span>
                        <div className="flex items-end" style={{ height: HEIGHT }}>
                            <span
                                className={cn('block w-full min-w-6 rounded-t-[4px]', current ? 'bg-primary' : 'bg-primary/35')}
                                style={{ height: Math.max(3, Math.round((month.count / max) * HEIGHT)) }}
                            />
                        </div>
                        <span className={cn('text-[11px]', current ? 'font-medium text-foreground' : 'text-muted-foreground')}>{month.month}</span>
                    </div>
                );
            })}
        </div>
    );
}

/** "38 new this month, 12% more than last month", in words so it does not depend on colour. */
export function registrationNote(months: RegistrationMonth[]): string {
    const current = months[months.length - 1]?.count ?? 0;
    const previous = months[months.length - 2]?.count ?? 0;

    if (current === 0 && previous === 0) {
        return 'No new registrations in the last two months';
    }

    const base = `${current.toLocaleString('en-US')} new this month so far`;

    if (previous === 0) {
        return base;
    }

    const change = Math.round((Math.abs(current - previous) / previous) * 100);

    if (change === 0) {
        return `${base}, the same as last month`;
    }

    return `${base}, ${change}% ${current > previous ? 'more' : 'fewer'} than all of last month`;
}
