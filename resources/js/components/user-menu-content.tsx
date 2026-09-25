import { Link, router } from '@inertiajs/react';
import { LogOut, Moon, Settings, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useAppearance } from '@/hooks/use-appearance';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { useTranslation } from '@/hooks/use-translation';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type { User } from '@/types';

type Props = {
    user: User;
};

const subscribeNever = () => () => {};

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const { t } = useTranslation();

    // False on the server and during hydration so the icon and label do not
    // change between the two renders and cause a mismatch. (Same trick as the
    // old sidebar switch.)
    const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);
    const isDark = mounted && resolvedAppearance === 'dark';
    const themeLabel = isDark ? t('nav.lightMode') : t('nav.darkMode');

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full cursor-pointer"
                        href={edit()}
                        prefetch
                        onClick={cleanup}
                    >
                        <Settings className="mr-2" />
                        Settings
                    </Link>
                </DropdownMenuItem>
                {/* Preventing the default keeps the menu open on click, so the
                    person can see the theme change and flip it back if they
                    want. The switch itself is on the right, matching where the
                    icon rail toggle used to sit. */}
                <DropdownMenuItem
                    onSelect={(event) => {
                        event.preventDefault();
                        updateAppearance(isDark ? 'light' : 'dark');
                    }}
                    aria-label={themeLabel}
                    className="cursor-pointer"
                >
                    {isDark ? <Moon className="mr-2" /> : <Sun className="mr-2" />}
                    <span>{themeLabel}</span>
                    <span
                        aria-hidden="true"
                        role="switch"
                        aria-checked={isDark}
                        className="ml-auto inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-border bg-muted p-0.5 transition-colors"
                    >
                        <span
                            className="flex size-4 shrink-0 items-center justify-center rounded-full bg-background shadow transition-transform duration-200 ease-out dark:translate-x-4"
                        />
                    </span>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link
                    className="block w-full cursor-pointer"
                    href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <LogOut className="mr-2" />
                    Log out
                </Link>
            </DropdownMenuItem>
        </>
    );
}
