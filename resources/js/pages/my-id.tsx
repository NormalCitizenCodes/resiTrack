import { Head } from '@inertiajs/react';
import { IdCard, SunMedium, TriangleAlert } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { SectorBadge } from '@/components/sector-badges';
import { Card, CardContent } from '@/components/ui/card';
import { useCalendarDate } from '@/hooks/use-relative-date';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';

type IdCardData = {
    full_name: string;
    first_name: string;
    last_name: string;
    resident_id: string;
    barangay: string | null;
    city: string | null;
    date_of_birth: string | null;
    sex: string | null;
    is_active: boolean;
    registered_on: string | null;
    sectors: { code: string; name: string }[];
    qr_svg: string;
};

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="min-w-0">
            <dt className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
            <dd className={mono ? 'truncate font-mono text-sm font-semibold' : 'truncate text-sm font-medium'}>{value || '-'}</dd>
        </div>
    );
}

export default function MyId({ card }: { card: IdCardData | null }) {
    const { t } = useTranslation();
    const formatDate = useCalendarDate();

    return (
        <>
            <Head title={t('id.title')} />
            <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">{t('id.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('id.subtitle')}</p>
                </div>

                {!card && (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
                            <IdCard className="size-10" aria-hidden="true" />
                            <p className="max-w-sm">{t('id.none')}</p>
                        </CardContent>
                    </Card>
                )}

                {card && (
                    <>
                        {!card.is_active && (
                            <div role="alert" className="flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm text-warning-text">
                                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                {t('id.inactive')}
                            </div>
                        )}

                        {/* The card itself: shaped and laid out like a physical ID so staff
                            recognise it at a glance, but branded resiTrack, never a government seal. */}
                        <article
                            aria-label={t('id.cardLabel')}
                            className="overflow-hidden rounded-2xl border bg-card shadow-lg shadow-brand-navy/10"
                        >
                            <header className="relative flex items-center gap-3 bg-brand-navy bg-brand-gradient px-5 py-4 text-white">
                                <AppLogoIcon className="size-10 shrink-0 rounded-md bg-white/95 p-1" />
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-cyan">{t('id.cardLabel')}</p>
                                    <p className="text-sm leading-snug font-semibold">
                                        {[card.barangay, card.city].filter(Boolean).join(', ')}
                                    </p>
                                </div>
                            </header>

                            <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto]">
                                <div className="min-w-0 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span
                                            aria-hidden="true"
                                            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary"
                                        >
                                            {`${card.first_name.charAt(0)}${card.last_name.charAt(0)}`.toUpperCase()}
                                        </span>
                                        <p className="min-w-0 text-lg leading-tight font-bold tracking-tight">{card.full_name}</p>
                                    </div>

                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        <div className="col-span-2">
                                            <Field label={t('id.residentId')} value={card.resident_id} mono />
                                        </div>
                                        <Field label={t('id.birthdate')} value={formatDate(card.date_of_birth)} />
                                        <Field label={t('id.sex')} value={card.sex ? t(`sex.${card.sex}`) : ''} />
                                        <Field label={t('id.since')} value={formatDate(card.registered_on)} />
                                    </dl>

                                    {card.sectors.length > 0 && (
                                        <div>
                                            <p className="mb-1.5 text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">{t('id.qualifiesAs')}</p>
                                            <div className="flex flex-wrap gap-1">
                                                {card.sectors.map((sector) => (
                                                    <SectorBadge key={sector.code} code={sector.code} label={sector.name} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* White tile in both themes: scanners read dark-on-light best. */}
                                <figure className="flex flex-col items-center gap-1.5 justify-self-center">
                                    <div
                                        className="size-44 rounded-lg bg-white p-2 [&>svg]:size-full"
                                        role="img"
                                        aria-label={`QR code for ${card.resident_id}`}
                                        dangerouslySetInnerHTML={{ __html: card.qr_svg }}
                                    />
                                    <figcaption className="text-xs text-muted-foreground">{t('id.scanHint')}</figcaption>
                                </figure>
                            </div>

                            <footer className="border-t bg-muted/40 px-5 py-2.5 text-center text-xs text-muted-foreground">
                                {t('id.notOfficial')}
                            </footer>
                        </article>

                        <p className="flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                            <SunMedium className="size-4 shrink-0" aria-hidden="true" />
                            {t('id.brightness')}
                        </p>
                    </>
                )}
            </div>
        </>
    );
}

MyId.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'My ID', href: '/my-id' },
    ],
};
