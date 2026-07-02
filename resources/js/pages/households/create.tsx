import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import InputError from '@/components/input-error';
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
import { dashboard } from '@/routes';

type Zone = { id: number; zone_name: string };

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

export default function HouseholdCreate({ zones }: { zones: Zone[] }) {
    const { data, setData, post, processing, errors } = useForm<HouseholdFormData>({
        household_number: '',
        address: '',
        zone_id: '',
        house_materials: '',
        house_ownership: '',
        water_source: '',
        electricity_source: '',
        waste_management: '',
        toilet_facility: '',
        member_count: '',
        monthly_income: '',
        is_4ps_beneficiary: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/households');
    };

    const select = (label: string, key: keyof HouseholdFormData & string, options: { value: string; label: string }[]) => (
        <div>
            <Label className="mb-1.5 block">{label}</Label>
            <Select value={(data[key] as string) || undefined} onValueChange={(v) => setData(key, v)}>
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
            <InputError message={errors[key]} className="mt-1" />
        </div>
    );

    return (
        <>
            <Head title="Register Household" />
            <form onSubmit={submit} className="mx-auto w-full max-w-4xl flex-1 space-y-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Register Household (RBI Form A)</h1>
                    <p className="text-sm text-muted-foreground">Record a household in the Record of Barangay Inhabitants.</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Household Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <div>
                            <Label className="mb-1.5 block">Household Number</Label>
                            <Input value={data.household_number} onChange={(e) => setData('household_number', e.target.value)} />
                            <InputError message={errors.household_number} className="mt-1" />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Zone / Purok</Label>
                            <Select
                                value={data.zone_id || NONE}
                                onValueChange={(v) => setData('zone_id', v === NONE ? '' : v)}
                            >
                                <SelectTrigger>
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
                        <div>
                            <Label className="mb-1.5 block">Members</Label>
                            <Input type="number" min="0" value={data.member_count} onChange={(e) => setData('member_count', e.target.value)} />
                            <InputError message={errors.member_count} className="mt-1" />
                        </div>
                        <div className="md:col-span-3">
                            <Label className="mb-1.5 block">
                                Household Address <span className="text-red-500">*</span>
                            </Label>
                            <Input value={data.address} onChange={(e) => setData('address', e.target.value)} />
                            <InputError message={errors.address} className="mt-1" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Housing &amp; Utilities</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <div>
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
                        <div>
                            <Label className="mb-1.5 block">Monthly Income (₱)</Label>
                            <Input type="number" min="0" step="0.01" value={data.monthly_income} onChange={(e) => setData('monthly_income', e.target.value)} />
                            <InputError message={errors.monthly_income} className="mt-1" />
                        </div>
                        <label className="flex items-center gap-2 self-end text-sm">
                            <Checkbox
                                checked={data.is_4ps_beneficiary}
                                onCheckedChange={(v) => setData('is_4ps_beneficiary', v === true)}
                            />
                            4Ps Beneficiary Household
                        </label>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" disabled={processing}>
                        Save Household
                    </Button>
                </div>
            </form>
        </>
    );
}

HouseholdCreate.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Households', href: '/households' },
        { title: 'Register', href: '/households/create' },
    ],
};
