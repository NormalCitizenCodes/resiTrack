import { Link, router, usePage } from '@inertiajs/react';
import { BarChart3, Building2, LifeBuoy, ClipboardCheck, CopyCheck, FileHeart, HandHeart, Home, LayoutGrid, Megaphone, ShieldCheck, UserCircle, UserCog, UserPlus, Users } from 'lucide-react';
import { useEffect } from 'react';
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
import type { NavGroup, NavItem, Role } from '@/types';

type NavCounts = { duplicates?: number; registrations?: number; pendingApplications?: number };

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

function navGroupsForRole(role: Role | undefined, t: (key: string) => string, counts: NavCounts = {}): NavGroup[] {
    const dashboardItem: NavItem = { title: t('nav.dashboard'), href: dashboard(), icon: LayoutGrid };
    const programsItem: NavItem = { title: t('nav.programs'), href: '/programs', icon: HandHeart };
    const announcementsItem: NavItem = { title: t('nav.announcements'), href: '/announcements', icon: Megaphone };

    switch (role) {
        case 'super_admin':
        case 'barangay_admin':
        case 'bhw': {
            // Staff labels stay in English regardless of language - this branch never reads t().
            const isBhw = role === 'bhw';

            const records: NavItem[] = [
                { title: t('nav.residents'), href: '/residents', icon: Users },
                ...(isBhw ? [{ title: t('nav.pendingResidentAccounts'), href: '/resident-registrations', icon: ClipboardCheck, badge: counts.registrations }] : []),
                { title: t('nav.households'), href: '/households', icon: Home },
                { title: t('nav.duplicateAlerts'), href: '/duplicate-alerts', icon: CopyCheck, badge: counts.duplicates },
                { title: t('nav.reports'), href: '/reports', icon: BarChart3 },
            ];

            const outreach: NavItem[] = [
                { title: t('nav.programs'), href: '/programs', icon: HandHeart },
                ...(!isBhw ? [{ title: t('nav.announcements'), href: '/announcements', icon: Megaphone }] : []),
                ...(!isBhw ? [{ title: t('nav.partnerAgencies'), href: '/partner-agencies', icon: Building2 }] : []),
            ];

            // Staff account management is the one thing that actually
            // distinguishes barangay_admin from bhw - see StaffController.
            const admin: NavItem[] = isBhw
                ? [{ title: t('nav.accountRecovery'), href: '/account-recovery', icon: ShieldCheck }]
                : [
                      { title: t('nav.staff'), href: '/staff', icon: UserCog },
                      { title: t('nav.accountDeletionRequests'), href: '/account-deletion-requests', icon: ShieldCheck },
                      { title: t('nav.accountReactivationRequests'), href: '/account-reactivation-requests', icon: ShieldCheck },
                  ];

            return [
                { items: [{ title: 'Dashboard', href: dashboard(), icon: LayoutGrid }] },
                { label: 'Records', items: records },
                { label: 'Outreach', items: outreach },
                { label: isBhw ? 'Support' : 'Admin', items: admin },
            ];
        }
        case 'partner_agency':
            return [
                {
                    label: 'Platform',
                    items: [
                        { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
                        { title: 'Programs', href: '/programs', icon: HandHeart },
                        { title: 'Applications to Review', href: '/applications/review', icon: ClipboardCheck, badge: counts.pendingApplications },
                        { title: 'Beneficiaries', href: '/beneficiaries', icon: Users },
                        // Agencies already had read access to /announcements (broadcast
                        // posts only, see AnnouncementController::index) but no link to it.
                        { title: t('nav.announcements'), href: '/announcements', icon: Megaphone },
                        { title: 'Agency Profile', href: '/agency-profile', icon: Building2 },
                    ],
                },
            ];
        default:
            // Residents: browse programs, announcements, and track their applications.
            return [
                {
                    label: 'Platform',
                    items: [
                        dashboardItem,
                        programsItem,
                        { title: t('nav.myApplications'), href: '/my-applications', icon: FileHeart },
                        announcementsItem,
                        { title: t('nav.myProfile'), href: '/my-profile', icon: UserCircle },
                    ],
                },
            ];
    }
}

export function AppSidebar() {
    const { auth, navCounts } = usePage().props;
    const currentPath = usePage().url.split('?')[0];
    const role = auth?.user?.role as Role | undefined;
    const { t } = useTranslation();
    const navGroups = navGroupsForRole(role, t, navCounts);
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
                <NavMain groups={navGroups} />
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={currentPath === '/help'} tooltip={{ children: role === 'resident' ? t('nav.help') : 'Help' }}>
                            <Link href="/help" prefetch>
                                <LifeBuoy />
                                <span>{role === 'resident' ? t('nav.help') : 'Help'}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <NavThemeToggle />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
