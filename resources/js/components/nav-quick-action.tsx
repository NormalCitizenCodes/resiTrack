import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

export type QuickAction = { label: string; href: string; icon: LucideIcon };

/**
 * The one primary task for the current role, pinned above the navigation so it
 * is a single click from anywhere. Rendered as a quiet filled row rather than
 * a loud button: the sidebar is navigation first, and the brand spec keeps
 * chrome calm.
 */
export function NavQuickAction({ action }: { action: QuickAction }) {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    tooltip={{ children: action.label }}
                    className="h-10 border border-white/15 bg-white/10 text-sidebar-accent-foreground hover:bg-white/15"
                >
                    <Link href={action.href} prefetch>
                        <action.icon className="text-sidebar-primary" />
                        <span className="font-medium">{action.label}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
