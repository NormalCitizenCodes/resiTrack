import type { Auth } from '@/types/auth';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            flash: {
                success: string | null;
                error: string | null;
                residentRegistration?: {
                    residentId: string;
                    name: string;
                    householdId: string | number | null;
                    accountCreated: boolean;
                    accountLinked?: boolean;
                    emailLoginAvailable: boolean;
                } | null;
            };
            unreadNotifications: number;
            sidebarOpen: boolean;
            language: 'en' | 'fil' | 'ceb';
            [key: string]: unknown;
        };
    }
}
