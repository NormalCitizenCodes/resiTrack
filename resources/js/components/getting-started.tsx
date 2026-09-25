import { Link, router } from '@inertiajs/react';
import { CheckCircle2, Circle, LifeBuoy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type Onboarding = {
    steps: { key: string; href: string; done: boolean }[];
    done: number;
    total: number;
};

/** Staff-facing copy (staff UI stays in English, like the rest of the staff screens). */
const COPY: Record<string, { label: string; hint: string }> = {
    add_barangay_admin: { label: 'Add a barangay admin', hint: 'Each barangay needs an admin before its staff can be set up.' },
    add_agency_org: { label: 'Add a partner agency', hint: 'The organizations (DSWD, PESO...) that publish programs.' },
    add_agency_account: { label: 'Create a partner agency account', hint: 'Give an agency staff member a login so they can publish programs.' },
    add_bhw: { label: 'Add your first BHW', hint: 'Barangay Health Workers do the day-to-day profiling.' },
    register_household: { label: 'Register a household', hint: 'Households come first, so residents can be placed in them.' },
    register_resident: { label: 'Register a resident', hint: 'Sectors are classified automatically when you save.' },
    assign_household: { label: 'Place a resident in a household', hint: 'Pick the household on the resident form.' },
    verify_account: { label: 'Verify a self-registered resident', hint: 'Residents who signed up online wait here for you to meet them.' },
    post_announcement: { label: 'Post an announcement', hint: 'Reach every resident, or only certain sectors.' },
    agency_profile: { label: 'Complete your agency profile', hint: 'Add a contact person and number so staff can reach you.' },
    publish_program: { label: 'Publish your first program', hint: 'Choose the sectors and barangay it serves; matching residents are found for you.' },
    review_application: { label: 'Review an application', hint: 'Approve or reject applicants from one queue.' },
};

/**
 * First-run checklist on the dashboard. Steps tick themselves off from real
 * data, and the whole card can be hidden (and brought back from Help).
 */
export function GettingStarted({ onboarding }: { onboarding: Onboarding }) {
    const allDone = onboarding.done === onboarding.total;
    const percent = Math.round((onboarding.done / onboarding.total) * 100);

    const hide = () => router.post('/onboarding/dismiss', {}, { preserveScroll: true });

    return (
        <section aria-labelledby="getting-started" className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 id="getting-started" className="font-semibold tracking-tight">
                        {allDone ? 'You are all set up' : 'Getting started'}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {allDone
                            ? 'Every first step is done. You can hide this card.'
                            : `${onboarding.done} of ${onboarding.total} done. Steps tick themselves off as you work.`}
                    </p>
                </div>
                <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0" onClick={hide} aria-label="Hide the getting started checklist">
                    <X className="size-4" />
                </Button>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/15" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Setup progress">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
            </div>

            <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                {onboarding.steps.map((step) => {
                    const copy = COPY[step.key] ?? { label: step.key, hint: '' };

                    return (
                        <li key={step.key}>
                            <Link
                                href={step.href}
                                className={cn(
                                    'flex h-full items-start gap-3 rounded-lg border bg-card p-3 transition-colors outline-none hover:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/50',
                                    step.done && 'opacity-70',
                                )}
                            >
                                {step.done ? (
                                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success-text" aria-label="Done" />
                                ) : (
                                    <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-label="Not done yet" />
                                )}
                                <span>
                                    <span className={cn('block text-sm font-medium', step.done && 'line-through decoration-muted-foreground/60')}>{copy.label}</span>
                                    <span className="block text-xs text-muted-foreground">{copy.hint}</span>
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ol>

            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <LifeBuoy className="size-3.5" aria-hidden="true" />
                Need more detail?{' '}
                <Link href="/help" className="font-medium text-foreground underline underline-offset-2">
                    Open the Help guide
                </Link>
            </p>
        </section>
    );
}
