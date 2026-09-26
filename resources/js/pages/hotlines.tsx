import { Head, router, useForm } from '@inertiajs/react';
import { Ambulance, Building2, Flame, Phone, PhoneCall, Plus, Shield, Siren, Trash2, Waves } from 'lucide-react';
import type { ComponentType, FormEventHandler, SVGProps } from 'react';
import { confirmDialog } from '@/components/confirm-dialog';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';

type Hotline = { id?: number; name: string; number: string; category: string };

const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
    emergency: Siren,
    police: Shield,
    fire: Flame,
    medical: Ambulance,
    disaster: Waves,
    barangay: Building2,
    other: Phone,
};

/** Digits and a leading plus only, which every dialer accepts. */
const telHref = (number: string) => `tel:${number.replace(/[^0-9+]/g, '')}`;

function HotlineList({ hotlines, onRemove }: { hotlines: Hotline[]; onRemove?: (hotline: Hotline) => void }) {
    const { t } = useTranslation();

    return (
        <ul className="divide-y">
            {hotlines.map((hotline) => {
                const Icon = ICONS[hotline.category] ?? Phone;

                return (
                    <li key={hotline.id ?? hotline.number} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden="true">
                            <Icon className="size-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="font-medium">{hotline.name}</p>
                            <p className="text-sm text-muted-foreground">
                                <span className="font-mono">{hotline.number}</span> · {t(`hotlines.category.${hotline.category}`)}
                            </p>
                        </div>
                        {onRemove && hotline.id && (
                            <Button variant="ghost" size="icon" aria-label={`Remove ${hotline.name}`} onClick={() => onRemove(hotline)}>
                                <Trash2 className="size-4" />
                            </Button>
                        )}
                        <Button asChild size="sm" className="shrink-0">
                            <a href={telHref(hotline.number)} aria-label={`${t('hotlines.call')} ${hotline.name}, ${hotline.number}`}>
                                <PhoneCall className="size-4" aria-hidden="true" />
                                {/* Icon only on phones, where the name needs the width. */}
                                <span className="hidden sm:inline">{t('hotlines.call')}</span>
                            </a>
                        </Button>
                    </li>
                );
            })}
        </ul>
    );
}

export default function Hotlines({
    national,
    barangayHotlines,
    cityHotlines,
    barangayName,
    canManage,
    manages,
    categories,
}: {
    national: Hotline[];
    barangayHotlines: Hotline[];
    cityHotlines: Hotline[];
    barangayName: string | null;
    canManage: boolean;
    manages: 'city' | 'barangay';
    categories: string[];
}) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors, reset } = useForm({ name: '', number: '', category: 'barangay' });

    const add: FormEventHandler = (event) => {
        event.preventDefault();
        post('/hotlines', { preserveScroll: true, onSuccess: () => reset() });
    };

    const remove = (hotline: Hotline) => {
        void confirmDialog({
            title: `Remove ${hotline.name}?`,
            description: `${hotline.number} will no longer be shown to residents.`,
            confirmLabel: 'Remove',
            destructive: true,
        }).then((ok) => ok && router.delete(`/hotlines/${hotline.id}`, { preserveScroll: true }));
    };

    return (
        <>
            <Head title={t('hotlines.title')} />
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">{t('hotlines.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('hotlines.subtitle')}</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('hotlines.national')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <HotlineList hotlines={national} />
                    </CardContent>
                </Card>

                {(barangayName || barangayHotlines.length > 0) && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{barangayName ?? t('hotlines.barangay')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {barangayHotlines.length === 0 ? (
                                <p className="text-sm text-muted-foreground">{t('hotlines.emptyBarangay')}</p>
                            ) : (
                                <HotlineList hotlines={barangayHotlines} onRemove={canManage && manages === 'barangay' ? remove : undefined} />
                            )}
                        </CardContent>
                    </Card>
                )}

                {cityHotlines.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('hotlines.city')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <HotlineList hotlines={cityHotlines} onRemove={canManage && manages === 'city' ? remove : undefined} />
                        </CardContent>
                    </Card>
                )}

                {canManage && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{manages === 'city' ? 'Add a city-wide number' : `Add a number for ${barangayName ?? 'your barangay'}`}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Double-check each number by calling it first. Residents will dial it in an emergency.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={add} className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2 sm:col-span-2">
                                    <Label htmlFor="hotline-name">Name</Label>
                                    <Input id="hotline-name" value={data.name} placeholder="e.g. Barangay Hall, City DRRMO" onChange={(e) => setData('name', e.target.value)} />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="hotline-number">Number</Label>
                                    <Input id="hotline-number" inputMode="tel" value={data.number} onChange={(e) => setData('number', e.target.value)} />
                                    <InputError message={errors.number} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Type</Label>
                                    <Select value={data.category} onValueChange={(value) => setData('category', value)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map((category) => (
                                                <SelectItem key={category} value={category}>
                                                    {t(`hotlines.category.${category}`)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.category} />
                                </div>
                                <div className="sm:col-span-2">
                                    <Button type="submit" disabled={processing}>
                                        <Plus className="size-4" /> Add number
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

Hotlines.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Hotlines', href: '/hotlines' },
    ],
};
