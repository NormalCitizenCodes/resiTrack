import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ProgramHeading, ProgramOverview, ResidentProgramPanels } from '@/components/program-resident-panels';
import type { ProgramSchedule } from '@/components/program-schedules';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/use-translation';
import type { Program, ProgramApplication } from '@/types';

type ProgramData = {
    program: Program;
    myApplication?: ProgramApplication | null;
    isEligible?: boolean;
    schedules?: ProgramSchedule[];
    myClaims?: { id: number; claimed_on: string }[];
};

/** What was fetched, tagged with the program it belongs to so a stale answer is never shown for another one. */
type Loaded = { id: number; data: ProgramData | null };

/**
 * A resident's program page as a pop-up, so a short read does not cost a whole page. It asks the
 * program page itself for its data (the same request Inertia makes when navigating), so what shows
 * here, including the eligibility check and claim dates, can never drift from the page.
 * The full page stays for links and notifications.
 */
export function ProgramDialog({ programId, open, onOpenChange }: { programId: number | null; open: boolean; onOpenChange: (open: boolean) => void }) {
    const { t } = useTranslation();
    const { version } = usePage();
    const [loaded, setLoaded] = useState<Loaded | null>(null);
    const [refresh, setRefresh] = useState(0);

    useEffect(() => {
        if (programId === null || !open) {
            return;
        }

        const controller = new AbortController();

        fetch(`/programs/${programId}`, {
            signal: controller.signal,
            credentials: 'same-origin',
            headers: {
                Accept: 'text/html, application/xhtml+xml',
                'X-Requested-With': 'XMLHttpRequest',
                'X-Inertia': 'true',
                'X-Inertia-Version': version ?? '',
            },
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(String(response.status));
                }

                return response.json() as Promise<{ props: ProgramData }>;
            })
            .then((page) => setLoaded({ id: programId, data: page.props }))
            .catch((error: unknown) => {
                if (!(error instanceof DOMException && error.name === 'AbortError')) {
                    setLoaded({ id: programId, data: null });
                }
            });

        return () => controller.abort();
    }, [programId, open, refresh, version]);

    const ready = loaded !== null && loaded.id === programId;
    const data = ready ? loaded.data : null;
    const failed = ready && data === null;

    const apply = () => {
        if (programId === null) {
            return;
        }

        router.post(`/programs/${programId}/apply`, {}, { preserveScroll: true, onSuccess: () => setRefresh((count) => count + 1) });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] gap-4 overflow-y-auto sm:max-w-2xl" bottomSheetOnPhone aria-describedby={undefined}>
                {data ? (
                    <>
                        <DialogTitle className="sr-only">{data.program.title}</DialogTitle>
                        <DialogDescription className="sr-only">{data.program.description ?? ''}</DialogDescription>
                        <div className="pr-6">
                            <ProgramHeading program={data.program} isResident as="h2" />
                        </div>
                        <ProgramOverview program={data.program} />
                        <ResidentProgramPanels
                            program={data.program}
                            myApplication={data.myApplication}
                            isEligible={data.isEligible}
                            schedules={data.schedules ?? []}
                            myClaims={data.myClaims ?? []}
                            onApply={apply}
                        />
                        <div className="flex justify-end">
                            <Button asChild variant="ghost" size="sm">
                                <Link href={`/programs/${data.program.id}`}>{t('programs.openPage')}</Link>
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <DialogTitle className="sr-only">{t('programs.available')}</DialogTitle>
                        {failed ? (
                            <div className="space-y-3 py-6 text-center">
                                <p className="text-sm text-muted-foreground">{t('programs.loadFailed')}</p>
                                {programId !== null && (
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/programs/${programId}`}>{t('programs.openPage')}</Link>
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3" aria-busy="true">
                                <Skeleton className="h-7 w-2/3" />
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-28 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
