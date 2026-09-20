import { LegalSection, PublicPage } from '@/components/public-page';

export default function Privacy() {
    return (
        <PublicPage
            title="Privacy Notice"
            intro="How resiTrack collects, uses and protects your personal information, in plain language."
        >
            <p className="rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm leading-6 text-foreground">
                This is a draft notice. It should be reviewed by the barangay and its data protection officer before
                it is relied on publicly.
            </p>

            <div className="mt-8">
                <LegalSection title="Who is responsible">
                    <p>
                        resiTrack is a resident profiling and social services system for barangays in Cagayan de Oro
                        City, developed as a capstone project. The barangay office that registers you decides how your
                        information is used in the system, and its staff handle your record.
                    </p>
                </LegalSection>

                <LegalSection title="What we collect">
                    <ul>
                        <li>
                            <strong>Account details:</strong> your name, email address (if you have one), barangay and
                            a password. Passwords are stored in a scrambled (hashed) form that staff cannot read.
                        </li>
                        <li>
                            <strong>Your resident record,</strong> entered by a Barangay Health Worker when you are
                            verified in person: name, date of birth, sex, civil status, address, contact number,
                            PhilSys number if you provide it, occupation, employment and education status, and income.
                        </li>
                        <li>
                            <strong>Sector information:</strong> whether you are a senior citizen, out-of-school
                            youth, person with disability, solo parent or pregnant. Senior citizen and out-of-school
                            youth are worked out from your age and education. The others are recorded by staff after
                            checking your documents.
                        </li>
                        <li>
                            <strong>Household details</strong> such as address, house and utility information, number
                            of members and whether the household is a 4Ps beneficiary.
                        </li>
                        <li>
                            <strong>Program activity:</strong> the programs you apply for and the decisions on them.
                        </li>
                        <li>
                            <strong>Activity records:</strong> important actions in the system are logged with who did
                            them and when.
                        </li>
                        <li>
                            <strong>Preference cookies</strong> that remember your language, light or dark theme and
                            sidebar choice, plus the cookie that keeps you logged in.
                        </li>
                    </ul>
                </LegalSection>

                <LegalSection title="Why we use it">
                    <ul>
                        <li>To keep an accurate, verified record of the residents of each barangay.</li>
                        <li>To work out which vulnerable sectors a resident belongs to.</li>
                        <li>To match residents with programs they qualify for and let them apply.</li>
                        <li>To catch duplicate records and residents who move between barangays.</li>
                        <li>To produce summary reports so services can be shared by actual need.</li>
                    </ul>
                </LegalSection>

                <LegalSection title="Who can see it">
                    <ul>
                        <li>
                            <strong>You</strong> can see your own record and applications.
                        </li>
                        <li>
                            <strong>Barangay staff</strong> can see and manage residents of their own barangay only.
                        </li>
                        <li>
                            <strong>City-level administrators</strong> have read-only oversight across barangays.
                        </li>
                        <li>
                            <strong>Partner agencies</strong> only see the applications made to their own programs,
                            and only what is needed to review them.
                        </li>
                    </ul>
                    <p>We do not sell your information or use it for advertising.</p>
                </LegalSection>

                <LegalSection title="How it is protected">
                    <ul>
                        <li>Access is limited by role and by barangay, and this is enforced on the server.</li>
                        <li>Residents are verified in person before their account is linked to an official record.</li>
                        <li>Important actions are written to an audit trail.</li>
                    </ul>
                </LegalSection>

                <LegalSection title="How long we keep it">
                    <p>
                        Records are kept while your account and profile are active. You cannot delete your account
                        directly. Instead you can submit a deletion request, which an administrator reviews. If it is
                        approved, your account is deactivated and your record is preserved for program and audit
                        history. You can later ask for the account to be reactivated.
                    </p>
                </LegalSection>

                <LegalSection title="Your rights">
                    <p>
                        Under the Data Privacy Act of 2012 (Republic Act No. 10173) you have the right to be
                        informed, to access your information, to correct it, to object to certain uses, and to
                        complain to the National Privacy Commission.
                    </p>
                    <p>
                        To use any of these rights, visit your Barangay Hall and speak to a Barangay Health Worker or
                        the barangay administrator.
                    </p>
                </LegalSection>

                <LegalSection title="Changes to this notice">
                    <p>
                        If we change how resiTrack handles personal information, this page will be updated and the
                        change will be announced to users.
                    </p>
                </LegalSection>
            </div>
        </PublicPage>
    );
}
