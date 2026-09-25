import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, LifeBuoy, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import type { Role } from '@/types';

type Task = { question: string; steps: string[]; link?: { label: string; href: string } };
type Guide = { roleName: string; intro: string; tasks: Task[]; notes: string[] };

// Staff guides stay in English, like the rest of the staff screens.
const RECORD_TASKS: Task[] = [
    {
        question: 'How do I register a resident?',
        steps: [
            'Click Register resident at the top of the sidebar.',
            'Fill in the personal details. The address already starts on your barangay: pick the barangay if different and type the house number, street or purok.',
            'Save. Vulnerability sectors are classified automatically, and possible duplicates are flagged for review.',
        ],
        link: { label: 'Register a resident', href: '/residents/create' },
    },
    {
        question: 'How do I register a household?',
        steps: ['Open Households and choose New household.', 'Pick the address from the lists and fill in the housing details.', 'Then place residents in it from the resident form (Household field).'],
        link: { label: 'Register a household', href: '/households/create' },
    },
    {
        question: 'How do I handle a duplicate alert?',
        steps: [
            'Open Duplicate Alerts. Records that may be the same person are grouped, and the fields that differ are highlighted.',
            'Choose Keep this record on the correct one (the other is deactivated), or Not a duplicate if they are different people.',
        ],
        link: { label: 'Open Duplicate Alerts', href: '/duplicate-alerts' },
    },
    {
        question: 'How do I apply for a program on behalf of a resident?',
        steps: ['Open Programs and choose a program.', 'Under Eligible residents in your barangay, choose Endorse next to the resident.'],
        link: { label: 'Open Programs', href: '/programs' },
    },
];

const GUIDES: Record<Exclude<Role, 'resident'>, Guide> = {
    bhw: {
        roleName: 'Barangay Health Worker',
        intro: 'You do the day-to-day profiling for your barangay: registering residents and households, verifying people who signed up online, and checking possible duplicates.',
        tasks: [
            ...RECORD_TASKS,
            {
                question: 'How do I verify a resident who signed up online?',
                steps: [
                    'Open Pending Resident Accounts (the badge shows how many are waiting).',
                    'Meet the resident in person and check a valid ID.',
                    'Complete their profile. Their account is linked and a Resident ID is assigned when you save.',
                ],
                link: { label: 'Open Pending Resident Accounts', href: '/resident-registrations' },
            },
            {
                question: 'A duplicate is too hard to decide. What now?',
                steps: ['Choose Escalate to admin on the alert and add a note.', 'Your barangay admin is notified and makes the final call.'],
            },
            {
                question: 'A resident forgot their password and has no email.',
                steps: ['Open Account Recovery, check the request in person, and approve it.', 'Set a new password with the resident present.'],
                link: { label: 'Open Account Recovery', href: '/account-recovery' },
            },
        ],
        notes: [
            'You only see residents and households in your own barangay.',
            'Posting announcements and managing staff accounts are done by your barangay admin.',
            'Everything you save is recorded in the audit trail with your name.',
        ],
    },
    barangay_admin: {
        roleName: 'Barangay Admin',
        intro: 'You run resiTrack for your barangay: you set up staff and partner agency accounts, post announcements, handle account requests and make the final call on escalated duplicates.',
        tasks: [
            {
                question: 'How do I add a Barangay Health Worker?',
                steps: ['Open Staff and choose Add Staff.', 'Enter their name and email and set a temporary password. They can change it after logging in.'],
                link: { label: 'Add staff', href: '/staff/create' },
            },
            {
                question: 'How do I give a partner agency access?',
                steps: ['Open Partner Agencies.', 'Under Add Agency Account, choose the agency and enter the staff member\'s details. The account is locked to your barangay.'],
                link: { label: 'Open Partner Agencies', href: '/partner-agencies' },
            },
            {
                question: 'How do I post an announcement?',
                steps: ['Open Announcements and choose New announcement.', 'Send it to everyone, or pick sectors (for example Senior Citizen) to reach only them. Residents are notified.'],
                link: { label: 'New announcement', href: '/announcements/create' },
            },
            {
                question: 'How do I handle account deletion or reactivation requests?',
                steps: ['Open Deletion Requests or Reactivation Requests.', 'Verify the resident\'s identity, add remarks, then approve or reject. Records are kept either way.'],
            },
            {
                question: 'How do I get a report for the city?',
                steps: ['Open Reports.', 'Export the sector dashboard as PDF, or the resident roster as CSV.'],
                link: { label: 'Open Reports', href: '/reports' },
            },
            ...RECORD_TASKS,
        ],
        notes: [
            'Only you can resolve duplicates that a BHW escalated (the Escalated tab).',
            'You only see your own barangay; the super admin sees all barangays.',
        ],
    },
    super_admin: {
        roleName: 'Super Admin',
        intro: 'You oversee every barangay using resiTrack. Resident and household records are read-only for you by design: the barangays keep the records, you watch the whole city.',
        tasks: [
            {
                question: 'How do I set up a new barangay\'s admin?',
                steps: ['Open Staff and choose Add Staff.', 'Choose the Barangay Admin role and the barangay.'],
                link: { label: 'Add staff', href: '/staff/create' },
            },
            {
                question: 'How do I add a partner agency?',
                steps: ['Open Partner Agencies and use Add Partner Agency.', 'Then create accounts for its staff, each assigned to a barangay.'],
                link: { label: 'Open Partner Agencies', href: '/partner-agencies' },
            },
            {
                question: 'How do I compare barangays?',
                steps: [
                    'The dashboard map colors each barangay by residents or by a sector (Color by).',
                    'Hover a row in the table beside it to find that barangay on the map, or click a barangay to open its residents.',
                ],
                link: { label: 'Open the dashboard', href: '/dashboard' },
            },
            {
                question: 'How do I get city-wide reports?',
                steps: ['Open Reports. Totals cover every barangay, and can be exported as PDF or CSV.'],
                link: { label: 'Open Reports', href: '/reports' },
            },
        ],
        notes: [
            'You cannot edit residents or households; ask the barangay concerned.',
            'Permanent deletion of a resident record is a super admin action and cannot be undone.',
        ],
    },
    partner_agency: {
        roleName: 'Partner Agency',
        intro: 'You publish programs and decide who receives them. resiTrack finds the residents who qualify, so your slots reach the right households.',
        tasks: [
            {
                question: 'How do I publish a program?',
                steps: [
                    'Choose New program at the top of the sidebar.',
                    'Pick the sectors it serves (for example Senior Citizen), the barangay (or the whole city), the dates and the number of slots.',
                    'When you publish, qualifying residents are notified.',
                ],
                link: { label: 'New program', href: '/programs/create' },
            },
            {
                question: 'How do I review applications?',
                steps: ['Open Applications to Review. Every pending applicant across your programs is in one list.', 'Approve (the resident becomes a beneficiary and takes a slot) or reject.'],
                link: { label: 'Open Applications to Review', href: '/applications/review' },
            },
            {
                question: 'Where do I see who received a program?',
                steps: ['Open Beneficiaries and filter by program.'],
                link: { label: 'Open Beneficiaries', href: '/beneficiaries' },
            },
            {
                question: 'How do I update our contact details?',
                steps: ['Open Agency Profile. The change applies to every account of your agency.'],
                link: { label: 'Open Agency Profile', href: '/agency-profile' },
            },
        ],
        notes: [
            'You only see your own agency\'s programs and applicants.',
            'Residents\' personal details stay with barangay staff.',
        ],
    },
};

const RESIDENT_KEYS = [
    { key: 'verify' },
    { key: 'profile', href: '/my-profile', label: 'nav.myProfile' },
    { key: 'programs', href: '/programs', label: 'nav.programs' },
    { key: 'language' },
    { key: 'password' },
];

function Accordion({ items }: { items: { question: string; body: React.ReactNode }[] }) {
    return (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
            {items.map((item) => (
                <details key={item.question} className="group p-4 open:bg-muted/40">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                        {item.question}
                        <span aria-hidden="true" className="shrink-0 text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45">
                            +
                        </span>
                    </summary>
                    <div className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</div>
                </details>
            ))}
        </div>
    );
}

export default function Help({ checklistHidden }: { checklistHidden: boolean }) {
    const role = usePage().props.auth.user.role as Role;
    const { t } = useTranslation();
    const isResident = role === 'resident';
    const guide = isResident ? null : GUIDES[role];

    const faqItems = guide
        ? guide.tasks.map((task) => ({
              question: task.question,
              body: (
                  <>
                      <ol className="list-decimal space-y-1 pl-5">
                          {task.steps.map((step) => (
                              <li key={step}>{step}</li>
                          ))}
                      </ol>
                      {task.link && (
                          <Link href={task.link.href} className="mt-3 inline-flex items-center gap-1 font-medium text-primary hover:underline">
                              {task.link.label}
                              <ArrowRight className="size-3.5" aria-hidden="true" />
                          </Link>
                      )}
                  </>
              ),
          }))
        : RESIDENT_KEYS.map((item) => ({
              question: t(`help.r.${item.key}.q`),
              body: (
                  <>
                      <p>{t(`help.r.${item.key}.a`)}</p>
                      {item.href && item.label && (
                          <Link href={item.href} className="mt-3 inline-flex items-center gap-1 font-medium text-primary hover:underline">
                              {t(item.label)}
                              <ArrowRight className="size-3.5" aria-hidden="true" />
                          </Link>
                      )}
                  </>
              ),
          }));

    return (
        <>
            <Head title={isResident ? t('help.title') : 'Help'} />
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">{isResident ? t('help.title') : 'Help'}</h1>
                    <p className="mt-1 text-muted-foreground">
                        {guide ? (
                            <>
                                You are signed in as a <span className="font-medium text-foreground">{guide.roleName}</span>. {guide.intro}
                            </>
                        ) : (
                            t('help.subtitle')
                        )}
                    </p>
                </div>

                {guide && checklistHidden && (
                    <Card>
                        <CardContent className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <ListChecks className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                                <div>
                                    <p className="font-medium">Getting started checklist</p>
                                    <p className="text-sm text-muted-foreground">You hid it from your dashboard. Bring it back any time.</p>
                                </div>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => router.post('/onboarding/restore')}>
                                Show it again
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <section className="space-y-3">
                    <h2 className="text-lg font-semibold tracking-tight">{isResident ? t('help.common') : 'How do I...'}</h2>
                    <Accordion items={faqItems} />
                </section>

                {guide && (
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold tracking-tight">Good to know</h2>
                        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                            {guide.notes.map((note) => (
                                <li key={note}>{note}</li>
                            ))}
                        </ul>
                    </section>
                )}

                <Card className="bg-muted/40">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <LifeBuoy className="size-4" aria-hidden="true" />
                            {isResident ? t('help.stillStuck') : 'Still stuck?'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                        <p>
                            {isResident
                                ? t('help.stillStuckBody')
                                : 'The FAQ covers questions from residents, staff and agencies. For a problem with the system itself, tell your barangay office which page you were on, what you did, and what you expected to happen.'}
                        </p>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/faq">{isResident ? t('help.openFaq') : 'Open the FAQ'}</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

Help.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Help', href: '/help' },
    ],
};
