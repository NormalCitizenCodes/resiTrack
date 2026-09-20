import { usePage } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo() {
    const barangay = usePage().props.auth?.barangay?.name;

    return (
        <>
            <AppLogoIcon className="size-8 shrink-0 rounded-md bg-white/95 p-1" />
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="truncate leading-tight font-semibold">
                    resiTrack
                </span>
                {barangay && (
                    <span className="truncate text-xs leading-tight opacity-70">
                        {barangay}
                    </span>
                )}
            </div>
        </>
    );
}
