import { router, usePage } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Input } from '@/components/ui/input';

const STAFF_ROLES = ['super_admin', 'barangay_admin', 'bhw'];

/**
 * Quick resident lookup from any page. It hands off to the existing Residents
 * list (which already searches name, resident ID, email and PhilSys number and
 * applies the user's barangay scope), so there is no separate search backend.
 */
export function StaffSearch() {
    const page = usePage();
    const role = page.props.auth?.user?.role;
    const [query, setQuery] = useState('');

    // The Residents list has its own, richer search: two search boxes on one screen is noise.
    const onResidentsList = page.url.split('?')[0] === '/residents';

    if (!role || !STAFF_ROLES.includes(role) || onResidentsList) {
        return null;
    }

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const search = query.trim();

        router.get('/residents', search ? { search } : {});
    };

    return (
        <form onSubmit={submit} role="search" className="relative hidden w-full max-w-xs md:block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search residents…"
                aria-label="Search residents"
                className="h-9 rounded-full pl-9"
            />
        </form>
    );
}
