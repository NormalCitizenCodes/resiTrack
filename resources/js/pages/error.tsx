import { Head, usePage } from '@inertiajs/react';
import { ErrorScreen, KINDS, STATUS_KIND } from '@/components/error-screen';

export default function ErrorPage({ status, detail }: { status: number; detail?: string | null }) {
    const kind = STATUS_KIND[status] ?? 'server';
    const signedIn = Boolean(usePage().props.auth?.user);

    return (
        <>
            <Head title={KINDS[kind].title.replace(/\.$/, '')} />
            <ErrorScreen kind={kind} detail={detail} signedIn={signedIn} />
        </>
    );
}
