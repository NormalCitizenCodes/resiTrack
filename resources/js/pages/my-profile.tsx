import { Head, useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import type { Resident } from '@/types';

const CIVIL_STATUS = ['single', 'married', 'widowed', 'separated'];
const EMPLOYMENT_STATUS = ['employed', 'unemployed', 'self_employed'];
const EDUCATION_LEVEL = ['elementary', 'highschool', 'college', 'vocational', 'none'];
const EDUCATION_STATUS = ['enrolled', 'not_enrolled', 'graduated'];

function SelectField({
    label,
    value,
    options,
    onChange,
    error,
}: {
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
    error?: string;
}) {
    const { t } = useTranslation();

    return (
        <div>
            <Label className="mb-1.5 block">{label}</Label>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option} value={option}>
                            {t(`option.${option}`)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
}

export default function MyProfile({ resident }: { resident: Resident | null }) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm({
        contact_number: resident?.contact_number ?? '',
        email: resident?.email ?? '',
        address: resident?.address ?? '',
        civil_status: resident?.civil_status ?? '',
        occupation: resident?.occupation ?? '',
        employment_status: resident?.employment_status ?? '',
        education_level: resident?.education_level ?? '',
        education_status: resident?.education_status ?? '',
        monthly_income: resident?.monthly_income ?? '',
        is_pregnant: resident?.is_pregnant ?? false,
        pregnancy_expected_month: resident?.pregnancy_expected_month?.substring(0, 7) ?? '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put('/my-profile', { preserveScroll: true });
    };

    return (
        <>
            <Head title="My Profile" />
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">{t('profile.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('profile.subtitle')}</p>
                </div>

                {!resident && (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            {t('common.notLinked')}
                        </CardContent>
                    </Card>
                )}

                {resident && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{resident.full_name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <Label className="mb-1.5 block">{t('field.contact_number')}</Label>
                                    <Input
                                        value={data.contact_number}
                                        onChange={(e) => setData('contact_number', e.target.value)}
                                    />
                                    {errors.contact_number && (
                                        <p className="mt-1 text-sm text-red-600">{errors.contact_number}</p>
                                    )}
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">{t('field.email')}</Label>
                                    <Input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                    />
                                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                                </div>
                                <div className="md:col-span-2">
                                    <Label className="mb-1.5 block">{t('field.address')}</Label>
                                    <Input value={data.address} onChange={(e) => setData('address', e.target.value)} />
                                    {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
                                </div>

                                <SelectField
                                    label={t('field.civil_status')}
                                    value={data.civil_status}
                                    options={CIVIL_STATUS}
                                    onChange={(v) => setData('civil_status', v)}
                                    error={errors.civil_status}
                                />
                                <div>
                                    <Label className="mb-1.5 block">{t('field.occupation')}</Label>
                                    <Input
                                        value={data.occupation}
                                        onChange={(e) => setData('occupation', e.target.value)}
                                    />
                                    {errors.occupation && (
                                        <p className="mt-1 text-sm text-red-600">{errors.occupation}</p>
                                    )}
                                </div>

                                <SelectField
                                    label={t('field.employment_status')}
                                    value={data.employment_status}
                                    options={EMPLOYMENT_STATUS}
                                    onChange={(v) => setData('employment_status', v)}
                                    error={errors.employment_status}
                                />
                                <div>
                                    <Label className="mb-1.5 block">{t('field.monthly_income')}</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        value={data.monthly_income}
                                        onChange={(e) => setData('monthly_income', e.target.value)}
                                    />
                                    {errors.monthly_income && (
                                        <p className="mt-1 text-sm text-red-600">{errors.monthly_income}</p>
                                    )}
                                </div>

                                <SelectField
                                    label={t('field.education_level')}
                                    value={data.education_level}
                                    options={EDUCATION_LEVEL}
                                    onChange={(v) => setData('education_level', v)}
                                    error={errors.education_level}
                                />
                                <SelectField
                                    label={t('field.education_status')}
                                    value={data.education_status}
                                    options={EDUCATION_STATUS}
                                    onChange={(v) => setData('education_status', v)}
                                    error={errors.education_status}
                                />

                                {resident.sex === 'female' && (
                                    <div className="space-y-3 rounded-lg border p-4 md:col-span-2">
                                        <p className="text-sm font-semibold">{t('profile.pregnancyTitle')}</p>
                                        <label className="flex items-center gap-2 text-sm">
                                            <Checkbox checked={data.is_pregnant} onCheckedChange={(checked) => setData('is_pregnant', checked === true)} />
                                            {t('profile.pregnantLabel')}
                                        </label>
                                        {data.is_pregnant && (
                                            <div className="max-w-xs">
                                                <Label htmlFor="pregnancy_expected_month" className="mb-1.5 block">
                                                    {t('profile.expectedMonth')}
                                                </Label>
                                                <Input
                                                    id="pregnancy_expected_month"
                                                    type="month"
                                                    value={data.pregnancy_expected_month}
                                                    onChange={(e) => setData('pregnancy_expected_month', e.target.value)}
                                                />
                                                <p className="mt-1 text-xs text-pretty text-muted-foreground">{t('profile.pregnancyHint')}</p>
                                            </div>
                                        )}
                                        {(errors.is_pregnant || errors.pregnancy_expected_month) && (
                                            <p className="text-sm text-red-600">{errors.pregnancy_expected_month ?? errors.is_pregnant}</p>
                                        )}
                                    </div>
                                )}

                                <div className="md:col-span-2">
                                    <Button type="submit" disabled={processing} size="lg">
                                        {t('profile.save')}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

MyProfile.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'My Profile', href: '/my-profile' },
    ],
};
