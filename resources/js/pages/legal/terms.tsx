import { LegalSection, PublicPage } from '@/components/public-page';

export default function Terms() {
    return (
        <PublicPage
            title="Terms of Use"
            intro="The simple rules for using resiTrack as a resident, barangay staff member or partner agency."
        >
            <p className="rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm leading-6 text-foreground">
                These terms are a draft and should be reviewed by the barangay before they are relied on publicly.
            </p>

            <div className="mt-8">
                <LegalSection title="Using resiTrack">
                    <p>
                        resiTrack helps barangays keep resident records and connect residents with social service
                        programs. By creating an account or logging in you agree to these terms.
                    </p>
                </LegalSection>

                <LegalSection title="Your account">
                    <ul>
                        <li>Give accurate information when you register and keep it up to date.</li>
                        <li>Keep your password private. Do not share your account with anyone.</li>
                        <li>Tell a Barangay Health Worker if you think someone else has used your account.</li>
                    </ul>
                </LegalSection>

                <LegalSection title="Verification">
                    <p>
                        Registering online does not by itself make you an official resident record. You are verified
                        in person at the Barangay Hall with a valid ID, and a sitio clearance if needed. Some features
                        depend on that verification.
                    </p>
                </LegalSection>

                <LegalSection title="Barangay staff and partner agencies">
                    <ul>
                        <li>Use resident information only for your official duties.</li>
                        <li>Do not share personal information outside the system or outside your role.</li>
                        <li>
                            Agencies manage only their own programs. Barangay staff work only within their own
                            barangay.
                        </li>
                        <li>Your actions in the system are recorded.</li>
                    </ul>
                </LegalSection>

                <LegalSection title="Programs and applications">
                    <p>
                        resiTrack connects residents with programs, but it does not run them. The agency that offers a
                        program decides who is approved, and applying does not guarantee a benefit.
                    </p>
                </LegalSection>

                <LegalSection title="Correcting your record">
                    <p>
                        If something in your record is wrong, tell a Barangay Health Worker so it can be corrected
                        after checking your documents.
                    </p>
                </LegalSection>

                <LegalSection title="Suspending accounts">
                    <p>
                        An account may be deactivated for misuse, such as false information or sharing an account.
                        You can ask for a deactivated account to be reactivated, and an administrator will review the
                        request.
                    </p>
                </LegalSection>

                <LegalSection title="Availability">
                    <p>
                        resiTrack is a capstone project and may change, be unavailable at times, or be updated
                        without notice.
                    </p>
                </LegalSection>

                <LegalSection title="Changes to these terms">
                    <p>These terms may be updated. The latest version is always on this page.</p>
                </LegalSection>
            </div>
        </PublicPage>
    );
}
