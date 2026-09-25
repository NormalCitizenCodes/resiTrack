import { useForm } from '@inertiajs/react';
import type { FormEventHandler} from 'react';
import { useState } from 'react';
import { AddressPicker, emptyAddress } from '@/components/address-picker';
import type { AddressValue } from '@/components/address-picker';
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
import type { Household, Resident } from '@/types';

type ResidentFormData = {
    household_id: string;
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
        create_account: false,
        password: '',
        password_confirmation: '',
        linked_user_id: '',
    };
}

const NONE = '__none__';

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

        return (
            <form onSubmit={submit} className="space-y-4">
            {linkedUserId ? (
                <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="py-4 text-sm">
                        This profile will be linked to the existing resident account. An official Resident ID will be assigned after you submit. Do not create a second login.
                    </CardContent>
                </Card>
            ) : null}
            <Card>
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
                <Card>
                    <CardHeader><CardTitle>Resident Portal Account</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">Ask the resident to enter their own password. The password will be hidden and cannot be viewed by the BHW.</p>
                        <div className="flex items-center gap-3"><Checkbox id="create_account" checked={data.create_account} onCheckedChange={(checked) => setData('create_account', checked === true)} /><Label htmlFor="create_account">Create Resident Portal Account</Label></div>
                        {data.create_account && <div className="grid gap-4 md:grid-cols-2"><Field label="Password" required error={errors.password}><PasswordInput value={data.password} onChange={(e) => setData('password', e.target.value)} autoComplete="new-password" /></Field><Field label="Confirm Password" required error={errors.password_confirmation}><PasswordInput value={data.password_confirmation} onChange={(e) => setData('password_confirmation', e.target.value)} autoComplete="new-password" /></Field></div>}
                    </CardContent>
                </Card>
            )}

            <Card>
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

            <Card>
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
                        <Select
                            value={data.household_id || NONE}
                            onValueChange={(v) => setData('household_id', v === NONE ? '' : v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NONE}>Unassigned</SelectItem>
                                {households.map((h) => (
                                    <SelectItem key={h.id} value={String(h.id)}>
                                        {[h.household_number ?? `Household #${h.id}`, h.family_name, h.address].filter(Boolean).join(' - ')}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
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

            <Card>
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
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button type="submit" disabled={processing}>
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
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
        <div className={className}>
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
            <SelectTrigger>
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
