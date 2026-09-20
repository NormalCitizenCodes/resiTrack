import { useForm } from '@inertiajs/react';
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
import type { Barangay, Program, VulnerabilitySector } from '@/types';

const CITYWIDE = '__citywide__';

type ProgramFormData = {
    title: string;
    description: string;
    eligibility_criteria: string;
    slots_available: string;
    start_date: string;
    end_date: string;
    status: string;
    barangay_id: string;
    sector_ids: number[];
    [key: string]: string | number[] | string[];
};

export function ProgramForm({
    mode,
    action,
    sectors,
    barangays,
    program,
    submitLabel,
}: {
    mode: 'create' | 'edit';
    action: string;
    sectors: VulnerabilitySector[];
    barangays: Barangay[];
    program?: Program;
    submitLabel: string;
}) {
    const { data, setData, transform, post, put, processing, errors } = useForm<ProgramFormData>({
        title: program?.title ?? '',
        description: program?.description ?? '',
        eligibility_criteria: program?.eligibility_criteria ?? '',
        slots_available: program ? String(program.slots_available) : '',
        start_date: program?.start_date ? program.start_date.substring(0, 10) : '',
        end_date: program?.end_date ? program.end_date.substring(0, 10) : '',
        status: program?.status ?? 'active',
        barangay_id: program?.barangay_id ? String(program.barangay_id) : CITYWIDE,
        sector_ids: program?.sectors?.map((s) => s.id) ?? [],
    });

    // The CITYWIDE sentinel is a UI-only affordance for "no barangay selected"
    // - the backend expects a real id or an empty value, never that string.
    transform((formData) => ({
        ...formData,
        barangay_id: formData.barangay_id === CITYWIDE ? '' : formData.barangay_id,
    }));

    const toggleSector = (id: number, checked: boolean) => {
        setData('sector_ids', checked ? [...data.sector_ids, id] : data.sector_ids.filter((s) => s !== id));
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        mode === 'create' ? post(action) : put(action);
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Program Details</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div>
                        <Label className="mb-1.5 block">
                            Title <span className="text-red-500">*</span>
                        </Label>
                        <Input value={data.title} onChange={(e) => setData('title', e.target.value)} />
                        <InputError message={errors.title} className="mt-1" />
                    </div>
                    <div>
                        <Label className="mb-1.5 block">Description</Label>
                        <textarea
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            rows={3}
                            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        />
                        <InputError message={errors.description} className="mt-1" />
                    </div>
                    <div>
                        <Label className="mb-1.5 block">Eligibility Criteria</Label>
                        <textarea
                            value={data.eligibility_criteria}
                            onChange={(e) => setData('eligibility_criteria', e.target.value)}
                            rows={2}
                            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        />
                        <InputError message={errors.eligibility_criteria} className="mt-1" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Targeting &amp; Slots</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="max-w-xs">
                        <Label className="mb-1.5 block">Target Barangay</Label>
                        <p className="mb-2 text-xs text-muted-foreground">
                            Restrict this program to one barangay's residents, or leave it city-wide.
                        </p>
                        <Select value={data.barangay_id} onValueChange={(v) => setData('barangay_id', v)}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={CITYWIDE}>All Barangays (city-wide)</SelectItem>
                                {barangays.map((barangay) => (
                                    <SelectItem key={barangay.id} value={String(barangay.id)}>
                                        {barangay.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <InputError message={errors.barangay_id} className="mt-1" />
                    </div>
                    <div>
                        <Label className="mb-1.5 block">Target Vulnerability Sectors</Label>
                        <p className="mb-2 text-xs text-muted-foreground">
                            Residents in the selected sectors will be matched as eligible. Leave all unchecked to
                            open the program to every resident.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            {sectors.map((sector) => (
                                <label key={sector.id} className="flex items-center gap-2 text-sm">
                                    <Checkbox
                                        checked={data.sector_ids.includes(sector.id)}
                                        onCheckedChange={(v) => toggleSector(sector.id, v === true)}
                                    />
                                    {sector.sector_name}
                                </label>
                            ))}
                        </div>
                        <InputError message={errors.sector_ids} className="mt-1" />
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <Label className="mb-1.5 block">
                                Slots Available <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="number"
                                min="0"
                                value={data.slots_available}
                                onChange={(e) => setData('slots_available', e.target.value)}
                            />
                            <InputError message={errors.slots_available} className="mt-1" />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Start Date</Label>
                            <Input type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)} />
                            <InputError message={errors.start_date} className="mt-1" />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">End Date</Label>
                            <Input type="date" value={data.end_date} onChange={(e) => setData('end_date', e.target.value)} />
                            <InputError message={errors.end_date} className="mt-1" />
                        </div>
                    </div>

                    <div className="max-w-xs">
                        <Label className="mb-1.5 block">Status</Label>
                        <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                            </SelectContent>
                        </Select>
                        <InputError message={errors.status} className="mt-1" />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button type="submit" disabled={processing}>
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
