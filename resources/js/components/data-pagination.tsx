import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';

type PaginationMeta = {
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
};

export function DataPagination({ meta }: { meta: PaginationMeta }) {
    if (meta.total === 0) {
        return null;
    }

    const prev = meta.links[0];
    const next = meta.links[meta.links.length - 1];

    const go = (url: string | null) => {
        if (url) {
            router.get(url, {}, { preserveState: true, preserveScroll: true });
        }
    };

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 py-2">
            <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{meta.from ?? 0}</span>–
                <span className="font-medium">{meta.to ?? 0}</span> of{' '}
                <span className="font-medium">{meta.total}</span>
            </p>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={!prev.url} onClick={() => go(prev.url)}>
                    Previous
                </Button>
                <span className="flex items-center px-2 text-sm text-muted-foreground">
                    Page {meta.current_page} of {meta.last_page}
                </span>
                <Button variant="outline" size="sm" disabled={!next.url} onClick={() => go(next.url)}>
                    Next
                </Button>
            </div>
        </div>
    );
}
