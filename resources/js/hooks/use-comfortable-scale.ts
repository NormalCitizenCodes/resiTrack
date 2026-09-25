import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import type { Role } from '@/types';

/**
 * Bumps the root font-size for resident-role sessions (see .comfortable-scale
 * in app.css) so text, spacing, and tap targets scale up together - aimed at
 * senior residents navigating on their own phone, not a user-facing toggle.
 */
export function useComfortableScale(): void {
    const role = usePage().props.auth?.user?.role as Role | undefined;

    useEffect(() => {
        const root = document.documentElement;

        root.classList.toggle('comfortable-scale', role === 'resident');

        // Leaving the app shell (logging out lands on the auth pages, which have
        // no shell) must not leave the bigger text behind.
        return () => root.classList.remove('comfortable-scale');
    }, [role]);
}
