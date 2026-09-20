import { Link, router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { BarChart3, ClipboardCheck, CopyCheck, FileHeart, HandHeart, Home, LayoutGrid, Megaphone, ShieldCheck, UserCircle, UserCog, UserPlus, Users } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavQuickAction } from '@/components/nav-quick-action';
import type { QuickAction } from '@/components/nav-quick-action';
import { NavThemeToggle } from '@/components/nav-theme-toggle';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import type { NavItem, Role } from '@/types';

type NavCounts = { duplicates?: number; registrations?: number };

// One primary task per role. The super admin is read-only and residents have
// nothing to "create", so neither gets one. Staff labels stay in English, as
// the rest of the staff navigation does.
function quickActionForRole(role: Role | undefined): QuickAction | null {
    switch (role) {
        case 'barangay_admin':
        case 'bhw':
            return { label: 'Register resident', href: '/residents/create', icon: UserPlus };
        case 'partner_agency':
            return { label: 'New program', href: '/programs/create', icon: HandHeart };
        default:
            return null;
    }
}

function navItemsForRole(role: Role | undefined, t: (key: string) => string, counts: NavCounts = {}): NavItem[] {
    const dashboardItem: NavItem = { title: t('nav.dashboard'), href: dashboard(), icon: LayoutGrid };
    const programsItem: NavItem = { title: t('nav.programs'), href: '/programs', icon: HandHeart };
    const announcementsItem: NavItem = { title: t('nav.announcements'), href: '/announcements', icon: Megaphone };

    switch (role) {
        case 'super_admin':
        case 'barangay_admin':
        case 'bhw': {
            // Resident-profiling module + partner-agency programs. Staff labels
            // stay in English regardless of language - this branch never reads t().
            const items = [
                { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
                { title: t('nav.residents'), href: '/residents', icon: Users },
                ...(role === 'bhw' ? [{ title: t('nav.pendingResidentAccounts'), href: '/resident-registrations', icon: ClipboardCheck, badge: counts.registrations }] : []),
                { title: t('nav.households'), href: '/households', icon: Home },
                { title: t('nav.duplicateAlerts'), href: '/duplicate-alerts', icon: CopyCheck, badge: counts.duplicates },
                { title: t('nav.programs'), href: '/programs', icon: HandHeart },
                { title: t('nav.reports'), href: '/reports', icon: BarChart3 },
                ...(role !== 'bhw' ? [{ title: t('nav.announcements'), href: '/announcements', icon: Megaphone }] : []),
            ];

            // Staff account management is the one thing that actually
            // distinguishes barangay_admin from bhw - see StaffController.
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
    const { auth, navCounts } = usePage().props;
    const role = auth?.user?.role as Role | undefined;
    const { t } = useTranslation();
    const mainNavItems = navItemsForRole(role, t, navCounts);
    const quickAction = quickActionForRole(role);
    const { setOpenMobile } = useSidebar();

    // On phones and tablets the sidebar is a drawer: close it once a link has
    // been followed. (Desktop keeps whatever state the user chose.)
    useEffect(() => router.on('navigate', () => setOpenMobile(false)), [setOpenMobile]);

    return (
        <Sidebar collapsible="icon" variant="floating">
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
                {quickAction && <NavQuickAction action={quickAction} />}
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavThemeToggle />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
