import { Head, useForm } from '@inertiajs/react';
import { MessageSquareWarning, PhoneCall } from 'lucide-react';
import type { FormEventHandler } from 'react';
import InputError from '@/components/input-error';
import { CONCERN_TONE, StatusPill } from '@/components/status-pill';
import { buildSteps, RequestProgress } from '@/components/status-timeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLongDate } from '@/hooks/use-relative-date';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';

type Concern = {
    id: number;
    reference_no: string | null;
    category: string;
    description: string;
    location: string | null;
    status: string;
    response: string | null;
    resolved_at: string | null;
    created_at: string;
};

const CATEGORIES = ['streetlight', 'garbage', 'drainage', 'road', 'safety', 'noise', 'record_correction', 'other'];

const FINISHED = ['resolved', 'closed'];

export default function Concerns({
    hasResidentRecord,
    concerns,
    initialCategory,
}: {
    hasResidentRecord: boolean;
    concerns: Concern[];
    initialCategory: string | null;
}) {
    const { t } = useTranslation();
    const formatDate = useLongDate();
    const { data, setData, post, processing, errors, reset } = useForm({
        category: initialCategory ?? '',
        description: '',
        location: '',
    });

    const stepsFor = (concern: Concern) =>
        buildSteps(
            [t('concerns.status.open'), t('concerns.status.in_progress'), t(concern.status === 'closed' ? 'concerns.status.closed' : 'concerns.status.resolved')],
            concern.status === 'in_progress' ? 1 : 0,
            FINISHED.includes(concern.status),
            [concern.created_at, null, concern.resolved_at].map((value) => (value ? formatDate(value) : null)),
        );

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post('/concerns', { preserveScroll: true, onSuccess: () => reset() });
    };

    return (
        <>
            <Head title={t('concerns.title')} />
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">{t('concerns.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('concerns.subtitle')}</p>
                </div>

                <a
                    href="tel:911"
                    className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive"
                >
                    <PhoneCall className="size-4 shrink-0" aria-hidden="true" />
                    {t('concerns.emergency')}
                </a>

                {!hasResidentRecord ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">{t('common.notLinked')}</CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>{t('concerns.category')}</Label>
                                    <Select value={data.category} onValueChange={(value) => setData('category', value)}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map((category) => (
                                                <SelectItem key={category} value={category}>
                                                    {t(`concerns.category.${category}`)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.category} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="description">{t('concerns.description')}</Label>
                                    <textarea
                                        id="description"
                                        rows={4}
                                        maxLength={1000}
                                        value={data.description}
                                        placeholder={t('concerns.descriptionPlaceholder')}
                                        onChange={(event) => setData('description', event.target.value)}
                                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
                                    />
                                    <InputError message={errors.description} />
                                </div>

                                {data.category !== 'record_correction' && (
                                    <div className="grid gap-2">
                                        <Label htmlFor="location">{t('concerns.location')}</Label>
                                        <Input
                                            id="location"
                                            value={data.location}
                                            maxLength={180}
                                            placeholder={t('concerns.locationPlaceholder')}
                                            onChange={(event) => setData('location', event.target.value)}
                                        />
                                        <InputError message={errors.location} />
                                    </div>
                                )}

                                <Button type="submit" size="lg" disabled={processing || !data.category} className="w-full sm:w-auto">
                                    {t('concerns.submit')}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {hasResidentRecord && (
                    <section aria-labelledby="concern-history" className="space-y-2">
                        <h2 id="concern-history" className="text-sm font-semibold tracking-tight">
                            {t('concerns.history')}
                        </h2>
                        {concerns.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                                    <MessageSquareWarning className="size-8" aria-hidden="true" />
                                    {t('concerns.empty')}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-2">
                                {concerns.map((concern) => (
                                    <Card key={concern.id} className="gap-2 py-4">
                                        <CardHeader>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <CardTitle className="text-base">{t(`concerns.category.${concern.category}`)}</CardTitle>
                                                <StatusPill tone={CONCERN_TONE[concern.status] ?? 'waiting'}>{t(`concerns.status.${concern.status}`)}</StatusPill>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <p className="text-sm whitespace-pre-line">{concern.description}</p>
                                            {concern.location && <p className="text-sm text-muted-foreground">{concern.location}</p>}
                                            <RequestProgress steps={stepsFor(concern)} defaultOpen={!FINISHED.includes(concern.status)} />
                                            {concern.response && (
                                                <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                                                    <p className="mb-0.5 text-xs font-semibold text-primary">{t('concerns.response')}</p>
                                                    <p className="whitespace-pre-line">{concern.response}</p>
                                                </div>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                <span className="font-mono">{concern.reference_no}</span> · {t('concerns.sentOn', { date: formatDate(concern.created_at) })}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </>
    );
}

Concerns.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Report a Concern', href: '/concerns' },
    ],
};
