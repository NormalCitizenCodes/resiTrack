import { Link, useForm } from '@inertiajs/react';
import type { FormEventHandler} from 'react';
import { useState } from 'react';
import { AddressPicker, emptyAddress } from '@/components/address-picker';
import type { AddressValue } from '@/components/address-picker';
import { FormProgress } from '@/components/form-progress';
import type { FormSection } from '@/components/form-progress';
import { HouseholdPicker } from '@/components/household-picker';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Household, Resident } from '@/types';

type ResidentFormData = {
    household_id: string;
    is_household_leader: boolean;
    pregnancy_expected_month: string;
    philsys_card_no: string;
    last_name: string;
    first_name: string;
    middle_name: string;
    suffix: string;
    date_of_birth: string;
    place_of_birth: string;
    sex: string;
    civil_status: string;
    religion: string;
    citizenship: string;
    contact_number: string;
    email: string;
    address: string;
    occupation: string;
    employment_status: string;
    education_level: string;
    education_status: string;
    monthly_income: string;
    is_pwd: boolean;
    is_solo_parent: boolean;
    is_pregnant: boolean;
    create_account: boolean;
    password: string;
    password_confirmation: string;
    linked_user_id: string;
    [key: string]: string | boolean;
};

/** The address picker's four codes, street and zip live in the form as flat `<prefix>_...` fields. */
type Prefix = 'address' | 'birth' | 'previous';

const readAddress = (data: ResidentFormData, prefix: Prefix): AddressValue => ({
    region: String(data[`${prefix}_region_code`] ?? ''),
    province: String(data[`${prefix}_province_code`] ?? ''),
    city: String(data[`${prefix}_city_code`] ?? ''),
    barangay: String(data[`${prefix}_barangay_code`] ?? ''),
    street: String(data[`${prefix}_street`] ?? ''),
    zip: String(data[`${prefix}_zip`] ?? ''),
});

const flattenAddress = (prefix: Prefix, value: AddressValue): Record<string, string> => ({
    [`${prefix}_region_code`]: value.region,
    [`${prefix}_province_code`]: value.province,
    [`${prefix}_city_code`]: value.city,
    [`${prefix}_barangay_code`]: value.barangay,
    [`${prefix}_street`]: value.street,
    [`${prefix}_zip`]: value.zip,
});

const savedAddress = (resident: Resident | undefined, prefix: Prefix): AddressValue => ({
    region: resident?.[`${prefix}_region_code` as keyof Resident] ? String(resident[`${prefix}_region_code` as keyof Resident]) : '',
    province: resident?.[`${prefix}_province_code` as keyof Resident] ? String(resident[`${prefix}_province_code` as keyof Resident]) : '',
    city: resident?.[`${prefix}_city_code` as keyof Resident] ? String(resident[`${prefix}_city_code` as keyof Resident]) : '',
    barangay: resident?.[`${prefix}_barangay_code` as keyof Resident] ? String(resident[`${prefix}_barangay_code` as keyof Resident]) : '',
    street: resident?.[`${prefix}_street` as keyof Resident] ? String(resident[`${prefix}_street` as keyof Resident]) : '',
    zip: resident?.[`${prefix}_zip` as keyof Resident] ? String(resident[`${prefix}_zip` as keyof Resident]) : '',
});

function toInitial(resident?: Resident, addressDefaults?: AddressDefaults | null): ResidentFormData {
    // New records start on the staff member's own barangay; saved ones show what was saved.
    const home = resident?.address_city_code ? savedAddress(resident, 'address') : { ...emptyAddress, ...(resident ? {} : toValue(addressDefaults)) };

    return {
        ...flattenAddress('address', home),
        ...flattenAddress('birth', savedAddress(resident, 'birth')),
        ...flattenAddress('previous', savedAddress(resident, 'previous')),

        household_id: resident?.household_id ? String(resident.household_id) : '',
        philsys_card_no: resident?.philsys_card_no ?? '',
        last_name: resident?.last_name ?? '',
        first_name: resident?.first_name ?? '',
        middle_name: resident?.middle_name ?? '',
        suffix: resident?.suffix ?? '',
        date_of_birth: resident?.date_of_birth ? resident.date_of_birth.substring(0, 10) : '',
        place_of_birth: resident?.place_of_birth ?? '',
        sex: resident?.sex ?? '',
        civil_status: resident?.civil_status ?? '',
        religion: resident?.religion ?? '',
        citizenship: resident?.citizenship ?? 'Filipino',
        contact_number: resident?.contact_number ?? '',
        email: resident?.email ?? '',
        address: resident?.address ?? '',
        previous_address: resident?.previous_address ?? '',
        occupation: resident?.occupation ?? '',
        employment_status: resident?.employment_status ?? '',
        education_level: resident?.education_level ?? '',
        education_status: resident?.education_status ?? '',
        monthly_income: resident?.monthly_income ?? '',
        is_pwd: resident?.is_pwd ?? false,
        is_solo_parent: resident?.is_solo_parent ?? false,
        is_pregnant: resident?.is_pregnant ?? false,
        pregnancy_expected_month: resident?.pregnancy_expected_month?.substring(0, 7) ?? '',
        is_household_leader: (resident as (Resident & { is_household_leader?: boolean }) | undefined)?.is_household_leader ?? false,
        create_account: false,
        password: '',
        password_confirmation: '',
        linked_user_id: '',
    };
}

export type AddressDefaults = { region: string | null; province: string | null; city: string | null; barangay: string | null };

const toValue = (defaults?: AddressDefaults | null): Partial<AddressValue> =>
    defaults ? { region: defaults.region ?? '', province: defaults.province ?? '', city: defaults.city ?? '', barangay: defaults.barangay ?? '' } : {};

export function ResidentForm({
    mode,
    action,
    households,
    resident,
    submitLabel,
    linkedUserId,
    addressDefaults,
}: {
    mode: 'create' | 'edit';
    action: string;
    households: Household[];
    resident?: Resident;
    submitLabel: string;
    linkedUserId?: number;
    addressDefaults?: AddressDefaults | null;
}) {
    const { data, setData, post, put, processing, errors } = useForm<ResidentFormData>({
        ...toInitial(resident, addressDefaults),
        linked_user_id: linkedUserId ? String(linkedUserId) : '',
    });

    const [hasPrevious, setHasPrevious] = useState(Boolean(resident?.previous_address || resident?.previous_city_code));

    const setAddress = (prefix: Prefix) => (value: AddressValue) => setData((current) => ({ ...current, ...flattenAddress(prefix, value) }));

    const togglePrevious = (on: boolean) => {
        setHasPrevious(on);

        if (!on) {
            setAddress('previous')(emptyAddress);
            setData('previous_address', '');
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (mode === 'create') {
            post(action);
        } else {
            put(action);
        }
    };

    // Progress only reports what the server will require; it never blocks saving.
    const filled = (value: string | boolean) => String(value).trim() !== '' && value !== false;
    const personal = [data.last_name, data.first_name, data.date_of_birth, data.sex, data.civil_status];
    const wantsAccount = mode === 'create' && !linkedUserId && data.create_account;
    const account = wantsAccount ? [data.email, data.password, data.password_confirmation] : [];
    const pregnancy = data.is_pregnant ? [data.pregnancy_expected_month] : [];
    const required = [...personal, ...account, ...pregnancy];
    const progress = { done: required.filter(filled).length, total: required.length };

    const allIn = (values: (string | boolean)[]) => values.every(filled);
    const sections: FormSection[] = [
        { id: 'section-personal', label: 'Personal', state: allIn(personal) ? 'done' : 'todo' },
        ...(mode === 'create' && !linkedUserId
            ? [{ id: 'section-account', label: 'Portal account', state: !wantsAccount ? 'open' : allIn(account) ? 'done' : 'todo' } as FormSection]
            : []),
        { id: 'section-address', label: 'Address', state: filled(data.address_barangay_code) || filled(data.address_city_code) || filled(data.address) ? 'done' : 'open' },
        {
            id: 'section-contact',
            label: 'Contact',
            state: [data.contact_number, data.email, data.household_id, data.occupation, data.employment_status, data.monthly_income, data.education_level, data.education_status].some(filled) ? 'done' : 'open',
        },
        { id: 'section-sectors', label: 'Sectors', state: data.is_pregnant && !allIn(pregnancy) ? 'todo' : data.is_pwd || data.is_solo_parent || data.is_pregnant ? 'done' : 'open' },
    ];

        return (
            <form onSubmit={submit} className="space-y-4">
            <FormProgress done={progress.done} total={progress.total} sections={sections} />
            {linkedUserId ? (
                <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="py-4 text-sm">
                        This profile will be linked to the existing resident account. An official Resident ID will be assigned after you submit. Do not create a second login.
                    </CardContent>
                </Card>
            ) : null}
            <Card id="section-personal" className="scroll-mt-40">
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                    <Field label="PhilSys Card No." error={errors.philsys_card_no}>
                        <Input
                            value={data.philsys_card_no}
                            onChange={(e) => setData('philsys_card_no', e.target.value)}
                            placeholder="0000-0000-0000"
                        />
                    </Field>
                    <Field label="Last Name" required error={errors.last_name}>
                        <Input value={data.last_name} onChange={(e) => setData('last_name', e.target.value)} />
                    </Field>
                    <Field label="First Name" required error={errors.first_name}>
                        <Input value={data.first_name} onChange={(e) => setData('first_name', e.target.value)} />
                    </Field>
                    <Field label="Middle Name" error={errors.middle_name}>
                        <Input value={data.middle_name} onChange={(e) => setData('middle_name', e.target.value)} />
                    </Field>
                    <Field label="Suffix" error={errors.suffix}>
                        <Input value={data.suffix} onChange={(e) => setData('suffix', e.target.value)} placeholder="Jr., Sr., III" />
                    </Field>
                    <Field label="Date of Birth" required error={errors.date_of_birth}>
                        <Input type="date" value={data.date_of_birth} onChange={(e) => setData('date_of_birth', e.target.value)} />
                    </Field>
                    <Field label="Place of Birth" error={errors.place_of_birth || errors.birth_city_code} className="md:col-span-3">
                        {data.place_of_birth && !data.birth_city_code && (
                            <p className="mb-2 text-xs text-muted-foreground">Saved as "{data.place_of_birth}". Pick from the lists to replace it.</p>
                        )}
                        <AddressPicker idPrefix="birth" value={readAddress(data, 'birth')} onChange={setAddress('birth')} showBarangay={false} showStreetAndZip={false} />
                    </Field>
                    <Field label="Sex" required error={errors.sex}>
                        <SelectField
                            value={data.sex}
                            onChange={(v) => setData('sex', v)}
                            options={[
                                { value: 'male', label: 'Male' },
                                { value: 'female', label: 'Female' },
                            ]}
                        />
                    </Field>
                    <Field label="Civil Status" required error={errors.civil_status}>
                        <SelectField
                            value={data.civil_status}
                            onChange={(v) => setData('civil_status', v)}
                            options={[
                                { value: 'single', label: 'Single' },
                                { value: 'married', label: 'Married' },
                                { value: 'widowed', label: 'Widowed' },
                                { value: 'separated', label: 'Separated' },
                            ]}
                        />
                    </Field>
                    <Field label="Religion" error={errors.religion}>
                        <Input value={data.religion} onChange={(e) => setData('religion', e.target.value)} />
                    </Field>
                    <Field label="Citizenship" error={errors.citizenship}>
                        <Input value={data.citizenship} onChange={(e) => setData('citizenship', e.target.value)} />
                    </Field>
                </CardContent>
            </Card>

            {mode === 'create' && !linkedUserId && (
                <Card id="section-account" className="scroll-mt-40">
                    <CardHeader><CardTitle>Resident Portal Account</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">Ask the resident to enter their own password. The password will be hidden and cannot be viewed by the BHW.</p>
                        <div className="flex items-center gap-3"><Checkbox id="create_account" checked={data.create_account} onCheckedChange={(checked) => setData('create_account', checked === true)} /><Label htmlFor="create_account">Create Resident Portal Account</Label></div>
                        {data.create_account && <div className="grid gap-4 md:grid-cols-2"><Field label="Password" required error={errors.password}><PasswordInput value={data.password} onChange={(e) => setData('password', e.target.value)} autoComplete="new-password" /></Field><Field label="Confirm Password" required error={errors.password_confirmation}><PasswordInput value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} autoComplete="new-password" /></Field></div>}
                    </CardContent>
                </Card>
            )}

            <Card id="section-address" className="scroll-mt-40">
                <CardHeader>
                    <CardTitle>Home Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {data.address && !data.address_city_code && (
                        <p className="text-xs text-muted-foreground">Saved as "{data.address}". Pick from the lists to replace it.</p>
                    )}
                    <AddressPicker
                        idPrefix="address"
                        value={readAddress(data, 'address')}
                        onChange={setAddress('address')}
                        error={errors.address || errors.address_city_code}
                    />

                    <div className="border-t pt-4">
                        <div className="flex items-center gap-3">
                            <Checkbox id="has_previous" checked={hasPrevious} onCheckedChange={(checked) => togglePrevious(checked === true)} />
                            <Label htmlFor="has_previous">This resident moved here from another place</Label>
                        </div>
                        {hasPrevious && (
                            <div className="mt-4 space-y-3">
                                {data.previous_address && !data.previous_city_code && (
                                    <p className="text-xs text-muted-foreground">Saved as "{data.previous_address}". Pick from the lists to replace it.</p>
                                )}
                                <AddressPicker
                                    idPrefix="previous"
                                    value={readAddress(data, 'previous')}
                                    onChange={setAddress('previous')}
                                    streetLabel="Previous house no., street or purok"
                                    error={errors.previous_city_code}
                                />
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card id="section-contact" className="scroll-mt-40">
                <CardHeader>
                    <CardTitle>Contact &amp; Socio-economic</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                    <Field label="Contact Number" error={errors.contact_number}>
                        <Input value={data.contact_number} onChange={(e) => setData('contact_number', e.target.value)} placeholder="09XXXXXXXXX" />
                    </Field>
                        <Field label={data.create_account && !linkedUserId ? 'Email' : 'Email (optional)'} required={data.create_account && !linkedUserId} error={errors.email}>
                        <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                    </Field>
                    <Field label="Household" error={errors.household_id}>
                        <HouseholdPicker value={data.household_id} initial={households} onChange={(id) => setData((current) => ({ ...current, household_id: id, is_household_leader: id === '' ? false : current.is_household_leader }))} />
                    </Field>
                    {data.household_id !== '' && (
                        <label className="flex items-start gap-2 text-sm md:col-span-3">
                            <Checkbox
                                className="mt-0.5"
                                checked={data.is_household_leader}
                                onCheckedChange={(checked) => setData('is_household_leader', checked === true)}
                            />
                            <span>
                                This person is the household leader
                                <span className="block text-xs text-muted-foreground">
                                    The one member, 18 or older, whom the family chose to represent it. Tick this only if the family picked them.
                                </span>
                            </span>
                        </label>
                    )}
                    <Field label="Occupation" error={errors.occupation}>
                        <Input value={data.occupation} onChange={(e) => setData('occupation', e.target.value)} />
                    </Field>
                    <Field label="Employment Status" error={errors.employment_status}>
                        <SelectField
                            value={data.employment_status}
                            onChange={(v) => setData('employment_status', v)}
                            options={[
                                { value: 'employed', label: 'Employed' },
                                { value: 'unemployed', label: 'Unemployed' },
                                { value: 'self_employed', label: 'Self-employed' },
                            ]}
                        />
                    </Field>
                    <Field label="Monthly Income (₱)" error={errors.monthly_income}>
                        <Input type="number" min="0" step="0.01" value={data.monthly_income} onChange={(e) => setData('monthly_income', e.target.value)} />
                    </Field>
                    <Field label="Education Level" error={errors.education_level}>
                        <SelectField
                            value={data.education_level}
                            onChange={(v) => setData('education_level', v)}
                            options={[
                                { value: 'none', label: 'None' },
                                { value: 'elementary', label: 'Elementary' },
                                { value: 'highschool', label: 'High School' },
                                { value: 'vocational', label: 'Vocational' },
                                { value: 'college', label: 'College' },
                            ]}
                        />
                    </Field>
                    <Field label="Education Status" error={errors.education_status}>
                        <SelectField
                            value={data.education_status}
                            onChange={(v) => setData('education_status', v)}
                            options={[
                                { value: 'enrolled', label: 'Enrolled' },
                                { value: 'not_enrolled', label: 'Not Enrolled' },
                                { value: 'graduated', label: 'Graduated' },
                            ]}
                        />
                    </Field>
                </CardContent>
            </Card>

            <Card id="section-sectors" className="scroll-mt-40">
                <CardHeader>
                    <CardTitle>Vulnerability Sector Flags</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Tick the certified sectors below. Senior Citizen and Out-of-School Youth are detected
                        automatically from age and education status.
                    </p>
                    <div className="flex flex-wrap gap-6">
                        <CheckboxField label="Person with Disability (PWD)" checked={data.is_pwd} onChange={(v) => setData('is_pwd', v)} />
                        <CheckboxField label="Solo Parent" checked={data.is_solo_parent} onChange={(v) => setData('is_solo_parent', v)} />
                        <CheckboxField label="Pregnant" checked={data.is_pregnant} onChange={(v) => setData('is_pregnant', v)} />
                    </div>
                    <InputError message={errors.is_pregnant} />
                    {data.is_pregnant && (
                        <div className="max-w-xs">
                            <Label htmlFor="pregnancy_expected_month" className="mb-1.5 block">
                                Expected month of delivery <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="pregnancy_expected_month"
                                type="month"
                                value={data.pregnancy_expected_month}
                                onChange={(e) => setData('pregnancy_expected_month', e.target.value)}
                            />
                            <p className="mt-1 text-xs text-muted-foreground">The Pregnant tag is removed by itself 30 days after the end of this month.</p>
                            <InputError message={errors.pregnancy_expected_month} className="mt-1" />
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button asChild variant="outline" type="button">
                    <Link href={cancelTarget(resident)}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={processing}>
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}

/** Where Cancel goes: the record being edited, the household "Add member" came from, or the list. */
function cancelTarget(resident?: Resident): string {
    if (resident?.id) {
        return `/residents/${resident.id}`;
    }

    if (resident?.household_id) {
        return `/households/${resident.household_id}`;
    }

    return '/residents';
}

function Field({
    label,
    required,
    error,
    className,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        // min-w-0 lets a long value (a household with a long address) shrink to the column instead of pushing past the card.
        <div className={cn('min-w-0', className)}>
            <Label className="mb-1.5 block">
                {label} {required && <span className="text-red-500">*</span>}
            </Label>
            {children}
            <InputError message={error} className="mt-1" />
        </div>
    );
}

function SelectField({
    value,
    onChange,
    options,
}: {
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
}) {
    return (
        <Select value={value || undefined} onValueChange={onChange}>
            <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
                {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                        {o.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
            {label}
        </label>
    );
}
