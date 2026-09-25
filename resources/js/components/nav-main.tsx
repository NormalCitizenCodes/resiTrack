import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import type { NavGroup } from '@/types';

export function NavMain({ groups = [] }: { groups: NavGroup[] }) {
    const { isCurrentUrl } = useCurrentUrl();

    return (
        <>
            {groups.map((group, index) => (
                <SidebarGroup key={group.label ?? index} className="px-2 py-0 not-first:mt-3">
                    {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
                    <SidebarMenu>
                {group.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={isCurrentUrl(item.href)}
                            tooltip={{ children: item.title }}
                            className={cn('data-[active=true]:[&>svg]:text-sidebar-primary', item.badge && 'pr-6')}
                        >
                            <Link href={item.href} prefetch>
                                {item.icon && <item.icon />}
                                <span className="truncate">{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                        {item.badge ? (
                            <SidebarMenuBadge className="rounded-full bg-white/15 px-1.5 text-sidebar-accent-foreground">
                                {item.badge > 99 ? '99+' : item.badge}
                            </SidebarMenuBadge>
                        ) : null}
                    </SidebarMenuItem>
                ))}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </>
    );
}
