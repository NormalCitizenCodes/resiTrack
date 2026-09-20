import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar';
import { useAppearance } from '@/hooks/use-appearance';
import { useTranslation } from '@/hooks/use-translation';

const subscribeNever = () => () => {};

/**
 * Sidebar light/dark switch: just the pill, with the sun or moon carried on
 * the knob. The mode it switches to is exposed through aria-label and the
 * tooltip rather than visible text.
 *
 * Two things keep it well behaved:
 *
 * - The knob position and icon follow the `dark` class on <html> in CSS, not
 *   React state. The server cannot know whether the OS prefers dark, so state
 *   rendered on the server would differ from the client and force a full
 *   re-render on every page load.
 * - Collapsing to the icon rail is done with `group-data-[collapsible=icon]`
 *   variants on this one element, so its width, border and padding transition
 *   in step with the sidebar's own 200ms width animation. Swapping between two
 *   different elements (pill and knob) made it jump at the start of a collapse
 *   and overflow the still-narrow rail at the start of an expand.
 */
export function NavThemeToggle() {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const { t } = useTranslation();

    // false while rendering on the server and during hydration, true afterwards.
    const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
    const isDark = mounted && resolvedAppearance === 'dark';
    const label = isDark ? t('nav.lightMode') : t('nav.darkMode');

    return (
        <SidebarMenu>
            <SidebarMenuItem className="flex pl-2 transition-[padding] duration-200 ease-linear group-data-[collapsible=icon]:pl-1">
                <button
                    type="button"
                    role="switch"
                    aria-checked={isDark}
                    aria-label={label}
                    title={label}
                    onClick={() => updateAppearance(isDark ? 'light' : 'dark')}
                    className="inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-white/25 bg-black/25 p-0.5 outline-none transition-[width,padding,background-color,border-color] duration-200 ease-linear hover:bg-black/35 focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:hover:bg-white/10"
                >
                    <span className="flex size-5 shrink-0 translate-x-0 items-center justify-center rounded-full bg-white text-brand-navy shadow transition-transform duration-200 ease-linear group-data-[collapsible=icon]:mx-auto dark:translate-x-5 dark:group-data-[collapsible=icon]:translate-x-0">
                        <Sun className="size-3 dark:hidden" />
                        <Moon className="hidden size-3 dark:block" />
                    </span>
                </button>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
