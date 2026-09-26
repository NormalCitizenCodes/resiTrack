import { Head, router, useForm } from '@inertiajs/react';
import { FileText } from 'lucide-react';
import type { FormEventHandler } from 'react';
import { confirmDialog } from '@/components/confirm-dialog';
import InputError from '@/components/input-error';
import { DOCUMENT_TONE, StatusPill } from '@/components/status-pill';
import { buildSteps, RequestProgress } from '@/components/status-timeline';
import type { TimelineStep } from '@/components/status-timeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLongDate } from '@/hooks/use-relative-date';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

type DocumentRequest = {
    id: number;
    reference_no: string | null;
    type: string;
    purpose: string;
    status: string;
    remarks: string | null;
    ready_at: string | null;
    released_at: string | null;
    created_at: string;
};

const TYPES = ['residency', 'indigency', 'clearance'] as const;

const FINISHED = ['released', 'rejected'];

export default function Documents({ hasResidentRecord, requests }: { hasResidentRecord: boolean; requests: DocumentRequest[] }) {
    const { t } = useTranslation();
    const formatDate = useLongDate();
    const { data, setData, post, processing, errors, reset } = useForm({ type: '', purpose: '' });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post('/documents', { preserveScroll: true, onSuccess: () => reset() });
    };

    const stepsFor = (request: DocumentRequest): TimelineStep[] => {
        const sent = { label: t('timeline.sent'), date: formatDate(request.created_at), state: 'done' as const };

        if (request.status === 'rejected') {
            return [sent, { label: t('documents.status.rejected'), state: 'stopped' }];
        }

        const reached = { pending: 1, ready: 2 }[request.status] ?? 3;
        const steps = buildSteps(
            [t('timeline.sent'), t('documents.status.pending'), t('documents.status.ready'), t('documents.status.released')],
            reached,
            request.status === 'released',
            [request.created_at, null, request.ready_at, request.released_at].map((value) => (value ? formatDate(value) : null)),
        );

        return steps;
    };

    const cancel = (request: DocumentRequest) => {
        void confirmDialog({ title: t('documents.cancelConfirm'), confirmLabel: 'OK', destructive: true }).then(
            (ok) => ok && router.delete(`/documents/${request.id}`, { preserveScroll: true }),
        );
    };

    return (
        <>
            <Head title={t('documents.title')} />
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">{t('documents.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('documents.subtitle')}</p>
                </div>

                {!hasResidentRecord ? (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">{t('common.notLinked')}</CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('documents.new')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={submit} className="space-y-5">
                                <fieldset>
                                    <legend className="mb-2 text-sm font-medium">{t('documents.type')}</legend>
                                    <div className="grid gap-2">
                                        {TYPES.map((type) => (
                                            <label
                                                key={type}
                                                className={cn(
                                                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                                                    data.type === type ? 'border-primary bg-primary/5' : 'hover:border-primary/40',
                                                )}
                                            >
                                                <input
                                                    type="radio"
                                                    name="type"
                                                    value={type}
                                                    checked={data.type === type}
                                                    onChange={() => setData('type', type)}
                                                    className="mt-1 size-4 accent-primary"
                                                />
                                                <span>
                                                    <span className="block font-medium">{t(`documents.type.${type}`)}</span>
                                                    <span className="block text-sm text-muted-foreground">{t(`documents.typeHint.${type}`)}</span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <InputError message={errors.type} className="mt-2" />
                                </fieldset>

                                <div className="grid gap-2">
                                    <Label htmlFor="purpose">{t('documents.purpose')}</Label>
                                    <Input
                                        id="purpose"
                                        value={data.purpose}
                                        maxLength={150}
                                        placeholder={t('documents.purposePlaceholder')}
                                        onChange={(event) => setData('purpose', event.target.value)}
                                    />
                                    <InputError message={errors.purpose} />
                                </div>

                                <p className="text-sm text-muted-foreground">{t('documents.pickupNote')}</p>

                                <Button type="submit" size="lg" disabled={processing || !data.type} className="w-full sm:w-auto">
                                    {t('documents.submit')}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {hasResidentRecord && (
                    <section aria-labelledby="doc-history" className="space-y-2">
                        <h2 id="doc-history" className="text-sm font-semibold tracking-tight">
                            {t('documents.history')}
                        </h2>
                        {requests.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                                    <FileText className="size-8" aria-hidden="true" />
                                    {t('documents.empty')}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-2">
                                {requests.map((request) => (
                                    <Card key={request.id} className={cn('py-0', request.status === 'ready' && 'border-success/50')}>
                                        <CardContent className="space-y-2 py-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="font-medium">{t(`documents.type.${request.type}`)}</p>
                                                <StatusPill tone={DOCUMENT_TONE[request.status] ?? 'waiting'}>
                                                    {t(`documents.status.${request.status}`)}
                                                </StatusPill>
                                            </div>
                                            <p className="text-sm text-muted-foreground">{request.purpose}</p>
                                            {request.status === 'ready' && (
                                                <p className="text-sm font-medium text-success-text">{t('documents.readyHint')}</p>
                                            )}
                                            {request.remarks && <p className="rounded-md bg-muted px-3 py-2 text-sm">{request.remarks}</p>}
                                            <RequestProgress steps={stepsFor(request)} defaultOpen={!FINISHED.includes(request.status)} />
                                            <div className="flex items-center gap-2">
                                                <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                                                    <span className="font-mono">{request.reference_no}</span> · {t('documents.requestedOn', { date: formatDate(request.created_at) })}
                                                </p>
                                                {request.status === 'pending' && (
                                                    <Button variant="ghost" size="sm" onClick={() => cancel(request)}>
                                                        {t('common.cancel')}
                                                    </Button>
                                                )}
                                            </div>
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

Documents.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Certificates', href: '/documents' },
    ],
};
