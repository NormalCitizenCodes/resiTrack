import { Link, usePage } from '@inertiajs/react';
import { BarChart3, ClipboardCheck, CopyCheck, FileHeart, HandHeart, Home, LayoutGrid, Megaphone, ShieldCheck, UserCircle, UserCog, Users } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import type { NavItem, Role } from '@/types';

function navItemsForRole(role: Role | undefined, t: (key: string) => string): NavItem[] {
    const dashboardItem: NavItem = { title: t('nav.dashboard'), href: dashboard(), icon: LayoutGrid };
    const programsItem: NavItem = { title: t('nav.programs'), href: '/programs', icon: HandHeart };
    const announcementsItem: NavItem = { title: t('nav.announcements'), href: '/announcements', icon: Megaphone };

    switch (role) {
        case 'super_admin':
        case 'barangay_admin':
        case 'bhw': {
            // Resident-profiling module + partner-agency programs. Staff labels
            // stay in English regardless of language — this branch never reads t().
            const items = [
                { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
                { title: t('nav.residents'), href: '/residents', icon: Users },
                ...(role === 'bhw' ? [{ title: t('nav.pendingResidentAccounts'), href: '/resident-registrations', icon: ClipboardCheck }] : []),
                { title: t('nav.households'), href: '/households', icon: Home },
                { title: t('nav.duplicateAlerts'), href: '/duplicate-alerts', icon: CopyCheck },
                { title: t('nav.programs'), href: '/programs', icon: HandHeart },
                { title: t('nav.reports'), href: '/reports', icon: BarChart3 },
                { title: t('nav.announcements'), href: '/announcements', icon: Megaphone },
            ];

            // Staff account management is the one thing that actually
            // distinguishes barangay_admin from bhw — see StaffController.
            if (role !== 'bhw') {
                items.push({ title: t('nav.staff'), href: '/staff', icon: UserCog });
                items.push({ title: t('nav.accountDeletionRequests'), href: '/account-deletion-requests', icon: ShieldCheck });
                items.push({ title: t('nav.accountReactivationRequests'), href: '/account-reactivation-requests', icon: ShieldCheck });
                items.push({ title: t('nav.partnerAgencies'), href: '/partner-agencies', icon: HandHeart });
            }

            if (role === 'bhw') {
                items.push({ title: t('nav.accountRecovery'), href: '/account-recovery', icon: ShieldCheck });
            }

            return items;
        }
        case 'partner_agency':
            return [
                { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
                { title: 'Programs', href: '/programs', icon: HandHeart },
            ];
        default:
            // Residents: browse programs, announcements, and track their applications.
            return [
                dashboardItem,
                programsItem,
                { title: t('nav.myApplications'), href: '/my-applications', icon: FileHeart },
                announcementsItem,
                { title: t('nav.myProfile'), href: '/my-profile', icon: UserCircle },
            ];
    }
}

export function AppSidebar() {
    const role = usePage().props.auth?.user?.role as Role | undefined;
    const { t } = useTranslation();
    const mainNavItems = navItemsForRole(role, t);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
