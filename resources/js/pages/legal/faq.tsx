import { PublicPage } from '@/components/public-page';

const faqs: { id?: string; question: string; answer: string }[] = [
    {
        question: 'How do I register?',
        answer: 'Choose "Register as resident" on the home page, pick your barangay and create your account. You then finish verification in person at the Barangay Hall.',
    },
    {
        question: 'Why do I have to visit the Barangay Hall?',
        answer: 'So a Barangay Health Worker can confirm who you are and complete your official resident profile. Until then your account is marked "Pending Profiling" and some features are limited.',
    },
    {
        question: 'What should I bring?',
        answer: 'A valid ID. If needed, also bring a sitio clearance or other proof that you live in the barangay.',
    },
    {
        question: 'What is my Resident ID?',
        answer: 'A number in the form RES-2026-000123 that is assigned when your profile is completed. You can log in with either your Resident ID or your registered email address, together with your password.',
    },
    {
        question: 'I forgot my password. What do I do?',
        answer: 'Use "Forgot Password" on the login page. If you have no email linked to your account, visit your Barangay Hall and a Barangay Health Worker will help you recover access.',
    },
    {
        question: 'Who can see my information?',
        answer: 'You, the staff of your own barangay, and read-only city administrators. Partner agencies only see applications made to their own programs. See the Privacy Notice for details.',
    },
    {
        question: 'Can I delete my account?',
        answer: 'Not directly. You can submit a deletion request with a reason, and an administrator reviews it. If approved, your account is deactivated and your record is kept for program and audit history. You can ask for reactivation later.',
    },
    {
        question: 'How does my agency join resiTrack?',
        answer: 'Partner agency accounts are set up through your barangay office or city hall. Contact them to request access.',
    },
    {
        id: 'report-an-issue',
        question: 'How do I report a technical issue?',
        answer: 'Tell your Barangay Health Worker or the barangay office, who can pass it on to the system administrator. Please say which page you were on, what you were doing and what you expected to happen.',
    },
];

export default function Faq() {
    return (
        <PublicPage title="Frequently Asked Questions" intro="Quick answers for residents, barangay staff and partner agencies.">
            <div className="divide-y divide-border rounded-lg border border-border bg-card">
                {faqs.map((item) => (
                    <details key={item.question} id={item.id} className="group scroll-mt-6 p-5 open:bg-muted/40">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                            {item.question}
                            <span
                                aria-hidden="true"
                                className="shrink-0 text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45"
                            >
                                +
                            </span>
                        </summary>
                        <p className="mt-3 leading-7 text-muted-foreground">{item.answer}</p>
                    </details>
                ))}
            </div>
        </PublicPage>
    );
}
