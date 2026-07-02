import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { VulnerabilitySector } from '@/types';

// Consistent colour per vulnerability sector across the whole app.
const SECTOR_STYLES: Record<string, string> = {
    SENIOR: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    PWD: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    OSY: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
    SOLO_PARENT: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
    PREGNANT: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300',
};

export function SectorBadge({ code, label }: { code: string; label: string }) {
    return (
        <span
            className={cn(
                'inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-medium',
                SECTOR_STYLES[code] ?? 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
            )}
        >
            {label}
        </span>
    );
}

export function SectorBadges({ sectors }: { sectors?: VulnerabilitySector[] | null }) {
    if (!sectors || sectors.length === 0) {
        return <Badge variant="outline" className="text-muted-foreground">None</Badge>;
    }

    return (
        <div className="flex flex-wrap gap-1">
            {sectors.map((sector) => (
                <SectorBadge key={sector.id} code={sector.code} label={sector.sector_name} />
            ))}
        </div>
    );
}
