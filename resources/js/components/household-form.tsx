import { Link, useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { AddressPicker, emptyAddress } from '@/components/address-picker';
import type { AddressValue } from '@/components/address-picker';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Zone = { id: number; zone_name: string };

export type AddressDefaults = { region: string | null; province: string | null; city: string | null; barangay: string | null };

/** The household fields the form edits. Everything is optional so the same form serves "register" and "edit". */
export type HouseholdRecord = {
    id?: number;
    household_number?: string | null;
    address?: string | null;
    address_region_code?: string | null;
    address_province_code?: string | null;
    address_city_code?: string | null;
    address_barangay_code?: string | null;
    address_street?: string | null;
    address_zip?: string | null;
    zone_id?: number | null;
    house_materials?: string | null;
    house_ownership?: string | null;
    water_source?: string | null;
    electricity_source?: string | null;
    waste_management?: string | null;
    toilet_facility?: string | null;
    member_count?: number | null;
    monthly_income?: string | number | null;
    is_4ps_beneficiary?: boolean;
};

type HouseholdFormData = {
    household_number: string;
    address: string;
    zone_id: string;
    house_materials: string;
    house_ownership: string;
    water_source: string;
    electricity_source: string;
    waste_management: string;
    toilet_facility: string;
    member_count: string;
    monthly_income: string;
    is_4ps_beneficiary: boolean;
    [key: string]: string | boolean;
};

const NONE = '__none__';

const text = (value: string | number | null | undefined) => (value === null || value === undefined ? '' : String(value));

export function HouseholdForm({
    household,
    zones,
    addressDefaults,
    submitLabel,
    cancelHref,
}: {
    household?: HouseholdRecord;
    zones: Zone[];
    addressDefaults?: AddressDefaults | null;
    submitLabel: string;
    cancelHref: string;
}) {
    const editing = household?.id !== undefined;

    // A new household starts on the staff member's own barangay. An existing one keeps what it has,
    // so an older record with only typed address text is not overwritten unless someone picks a new address.
    const start: AddressValue = editing
        ? {
              ...emptyAddress,
              region: text(household?.address_region_code),
              province: text(household?.address_province_code),
              city: text(household?.address_city_code),
              barangay: text(household?.address_barangay_code),
          }
        : {
              ...emptyAddress,
              region: addressDefaults?.region ?? '',
              province: addressDefaults?.province ?? '',
              city: addressDefaults?.city ?? '',
              barangay: addressDefaults?.barangay ?? '',
          };

    const { data, setData, post, put, processing, errors } = useForm<HouseholdFormData>({
        household_number: text(household?.household_number),
        address: text(household?.address),
        address_region_code: start.region,
        address_province_code: start.province,
        address_city_code: start.city,
        address_barangay_code: start.barangay,
        address_street: text(household?.address_street),
        address_zip: text(household?.address_zip),
        zone_id: text(household?.zone_id),
        house_materials: text(household?.house_materials),
        house_ownership: text(household?.house_ownership),
        water_source: text(household?.water_source),
        electricity_source: text(household?.electricity_source),
        waste_management: text(household?.waste_management),
        toilet_facility: text(household?.toilet_facility),
        member_count: text(household?.member_count),
        monthly_income: text(household?.monthly_income),
        is_4ps_beneficiary: household?.is_4ps_beneficiary ?? false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        if (editing) {
            put(`/households/${household?.id}`);
        } else {
            post('/households');
        }
    };

    const select = (label: string, key: keyof HouseholdFormData & string, options: { value: string; label: string }[]) => (
        <div className="min-w-0">
            <Label className="mb-1.5 block">{label}</Label>
            <Select value={(data[key] as string) || undefined} onValueChange={(v) => setData(key, v)}>
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
            <InputError message={errors[key]} className="mt-1" />
        </div>
    );

    const legacyAddress = editing && !household?.address_barangay_code && household?.address;

    return (
        <form onSubmit={submit} className="mx-auto w-full max-w-4xl flex-1 space-y-4 p-4">
            <Card>
                <CardHeader>
                    <CardTitle>Household Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                    <div className="min-w-0">
                        <Label className="mb-1.5 block">Household Number</Label>
                        <Input value={data.household_number} onChange={(e) => setData('household_number', e.target.value)} />
                        <InputError message={errors.household_number} className="mt-1" />
                    </div>
                    <div className="min-w-0">
                        <Label className="mb-1.5 block">Zone / Purok</Label>
                        <Select value={data.zone_id || NONE} onValueChange={(v) => setData('zone_id', v === NONE ? '' : v)}>
                            <SelectTrigger className="w-full min-w-0">
                                <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NONE}>Unassigned</SelectItem>
                                {zones.map((z) => (
                                    <SelectItem key={z.id} value={String(z.id)}>
                                        {z.zone_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.zone_id} className="mt-1" />
                    </div>
                    <div className="min-w-0">
                        <Label className="mb-1.5 block">Members</Label>
                        <Input type="number" min="0" value={data.member_count} onChange={(e) => setData('member_count', e.target.value)} />
                        <InputError message={errors.member_count} className="mt-1" />
                    </div>
                    <div className="md:col-span-3">
                        <Label className="mb-1.5 block">
                            Household Address <span className="text-red-500">*</span>
                        </Label>
                        {legacyAddress && (
                            <p className="mb-2 text-xs text-muted-foreground">
                                Saved as &quot;{household?.address}&quot;. It stays as it is unless you pick a new address from the lists.
                            </p>
                        )}
                        <AddressPicker
                            idPrefix="household"
                            value={{
                                region: String(data.address_region_code),
                                province: String(data.address_province_code),
                                city: String(data.address_city_code),
                                barangay: String(data.address_barangay_code),
                                street: String(data.address_street),
                                zip: String(data.address_zip),
                            }}
                            onChange={(next) =>
                                setData((current) => ({
                                    ...current,
                                    address_region_code: next.region,
                                    address_province_code: next.province,
                                    address_city_code: next.city,
                                    address_barangay_code: next.barangay,
                                    address_street: next.street,
                                    address_zip: next.zip,
                                }))
                            }
                            error={errors.address || errors.address_city_code}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Housing &amp; Utilities</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                    <div className="min-w-0">
                        <Label className="mb-1.5 block">House Materials</Label>
                        <Input value={data.house_materials} onChange={(e) => setData('house_materials', e.target.value)} />
                    </div>
                    {select('House Ownership', 'house_ownership', [
                        { value: 'owned', label: 'Owned' },
                        { value: 'rented', label: 'Rented' },
                        { value: 'shared', label: 'Shared' },
                    ])}
                    {select('Water Source', 'water_source', [
                        { value: 'pipe', label: 'Piped water' },
                        { value: 'well', label: 'Well' },
                        { value: 'others', label: 'Others' },
                    ])}
                    {select('Electricity', 'electricity_source', [
                        { value: 'metered', label: 'Metered' },
                        { value: 'shared', label: 'Shared' },
                        { value: 'none', label: 'None' },
                    ])}
                    {select('Waste Management', 'waste_management', [
                        { value: 'collected', label: 'Collected' },
                        { value: 'burned', label: 'Burned' },
                        { value: 'others', label: 'Others' },
                    ])}
                    {select('Toilet Facility', 'toilet_facility', [
                        { value: 'private', label: 'Private' },
                        { value: 'shared', label: 'Shared' },
                        { value: 'none', label: 'None' },
                    ])}
                    <div className="min-w-0">
                        <Label className="mb-1.5 block">Monthly Income (₱)</Label>
                        <Input type="number" min="0" step="0.01" value={data.monthly_income} onChange={(e) => setData('monthly_income', e.target.value)} />
                        <InputError message={errors.monthly_income} className="mt-1" />
                    </div>
                    <label className="flex items-center gap-2 self-end text-sm">
                        <Checkbox checked={data.is_4ps_beneficiary} onCheckedChange={(v) => setData('is_4ps_beneficiary', v === true)} />
                        4Ps Beneficiary Household
                    </label>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button asChild variant="outline" type="button">
                    <Link href={cancelHref}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={processing}>
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
