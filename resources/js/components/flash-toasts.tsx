import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Surfaces the `flash.success` / `flash.error` shared props as toasts after
 * each Inertia visit (e.g. after saving a resident or resolving a duplicate).
 */
export function FlashToasts() {
    const flash = usePage().props.flash;

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    return null;
}
