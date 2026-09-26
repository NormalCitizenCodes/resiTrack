import { Head } from '@inertiajs/react';
import { ResidentForm } from '@/components/resident-form';
import type { AddressDefaults } from '@/components/resident-form';
import { dashboard } from '@/routes';
import type { Household, Resident } from '@/types';

export default function ResidentCreate({
    households,
    linkedAccount,
    addressDefaults,
    prefillHouseholdId = null,
}: {
    households: Household[];
    /** Set by "Add member" on a household page. */
    prefillHouseholdId?: number | null;
    addressDefaults?: AddressDefaults | null;
    linkedAccount?: {
        id: number;
        name: string;
        email: string | null;
        first_name: string;
        last_name: string;
    } | null;
}) {
    const prefill =
        linkedAccount || prefillHouseholdId
            ? ({
                  ...(linkedAccount ? { first_name: linkedAccount.first_name, last_name: linkedAccount.last_name, email: linkedAccount.email } : {}),
                  ...(prefillHouseholdId ? { household_id: prefillHouseholdId } : {}),
              } as Resident)
            : undefined;

    return (
        <>
            <Head title={linkedAccount ? `Profile ${linkedAccount.name}` : 'Register Resident'} />
            <div className="mx-auto w-full max-w-5xl flex-1 p-4">
                <div className="mb-4">
                    <h1 className="text-xl font-semibold tracking-tight">
                        {linkedAccount ? 'Complete Official Resident Profile' : 'Register Resident (RBI Form B)'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        {linkedAccount
                            ? `Verify ${linkedAccount.name} in person, then complete all required resident information. The existing account will be linked and an official Resident ID will be assigned on save.`
                            : 'Add an individual to the Record of Barangay Inhabitants. Vulnerability sectors are classified automatically on save.'}
                    </p>
                </div>
                <ResidentForm
                    mode="create"
                    action="/residents"
                    households={households}
                    addressDefaults={addressDefaults}
                    resident={prefill}
                    linkedUserId={linkedAccount?.id}
                    submitLabel={linkedAccount ? 'Complete profiling' : 'Save Resident'}
                />
            </div>
        </>
    );
}

ResidentCreate.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Residents', href: '/residents' },
        { title: 'Register', href: '/residents/create' },
    ],
};
