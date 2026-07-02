import { Moon, Sun } from 'lucide-react';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

/**
 * Compact light/dark switch (as opposed to appearance-tabs.tsx's 3-way
 * light/dark/system segmented control, which is too wide for a header).
 * Toggling out of "system" is intentional here — a landing-page header
 * switch should reflect a direct choice, not the OS preference.
 */
export function ThemeToggle({ className }: { className?: string }) {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    return (
        <button
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => updateAppearance(isDark ? 'light' : 'dark')}
            className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border bg-muted transition-colors',
                className,
            )}
        >
            <Sun className="absolute left-1 size-3 text-muted-foreground" />
            <Moon className="absolute right-1 size-3 text-muted-foreground" />
            <span
                className={cn(
                    'z-10 block size-5 rounded-full bg-background shadow transition-transform',
                    isDark ? 'translate-x-5' : 'translate-x-0.5',
                )}
            />
        </button>
    );
}
