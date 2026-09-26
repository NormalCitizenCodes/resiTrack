import { useSyncExternalStore } from 'react';
import { ErrorScreen } from '@/components/error-screen';

const subscribe = (callback: () => void) => {
    window.addEventListener('online', callback);
    window.addEventListener('offline', callback);

    return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
    };
};

/**
 * Covers the app with the "No internet connection" screen while the browser
 * reports it is offline, and takes it away by itself when the connection
 * returns. The server always renders "online", so nothing differs on hydration.
 * It does not store anything: resiTrack does not work offline.
 */
export function NetworkGuard() {
    const online = useSyncExternalStore(
        subscribe,
        () => navigator.onLine,
        () => true,
    );

    return online ? null : <ErrorScreen kind="offline" overlay />;
}
