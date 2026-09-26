import { createInertiaApp } from '@inertiajs/react';
import { ConfirmHost } from '@/components/confirm-dialog';
import { NetworkGuard } from '@/components/network-guard';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import ProgramsLayout from '@/layouts/programs-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'resiTrack';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    layout: (name) => {
        switch (true) {
            case name === 'welcome':
            case name === 'error':
            case name === 'reports/print':
            case name.startsWith('legal/'):
                return null;
            case name.startsWith('auth/'):
            case name === 'account-reactivation/create':
            case name === 'account-recovery/password':
                return AuthLayout;
            case name.startsWith('settings/'):
                return [AppLayout, SettingsLayout];
            case name === 'programs/index' || name === 'programs/show':
                return ProgramsLayout;
            default:
                return AppLayout;
        }
    },
    strictMode: true,
    withApp(app) {
        return (
            <TooltipProvider delayDuration={0}>
                {app}
                <Toaster />
                <NetworkGuard />
                <ConfirmHost />
            </TooltipProvider>
        );
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
