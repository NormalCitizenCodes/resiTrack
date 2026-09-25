import { Head, Link } from '@inertiajs/react';
import { Home, PencilLine } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';

type HouseholdData = {
    household_id: string | null;
    address: string | null;
    zone: string | null;
    is_4ps_beneficiary: boolean;
};

type Member = { id: number; full_name: string; age: number | null; sex: string | null; is_you: boolean };

export default function MyHousehold({
    hasResidentRecord,
    household,
    members,
}: {
    hasResidentRecord: boolean;
    household: HouseholdData | null;
    members: Member[];
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('household.title')} />
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">{t('household.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('household.subtitle')}</p>
                </div>

                {!household && (
                    <Card>
                        <CardContent className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
                            <Home className="size-10" aria-hidden="true" />
                            <p className="max-w-sm">{hasResidentRecord ? t('household.none') : t('common.notLinked')}</p>
                        </CardContent>
                    </Card>
                )}

                {household && (
                    <>
                        <Card>
                            <CardContent>
                                <dl className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <dt className="text-xs text-muted-foreground">{t('household.number')}</dt>
                                        <dd className="font-mono font-semibold">{household.household_id ?? '-'}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">{t('household.zone')}</dt>
                                        <dd className="font-medium">{household.zone ?? '-'}</dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <dt className="text-xs text-muted-foreground">{t('household.address')}</dt>
                                        <dd className="font-medium">{household.address ?? '-'}</dd>
                                    </div>
                                </dl>
                                {household.is_4ps_beneficiary && (
                                    <Badge variant="secondary" className="mt-4">
                                        {t('household.fourPs')}
                                    </Badge>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>{t('household.members', { count: members.length })}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="divide-y">
                                    {members.map((member) => (
                                        <li key={member.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                                            <span
                                                aria-hidden="true"
                                                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                                            >
                                                {member.full_name
                                                    .split(' ')
                                                    .filter(Boolean)
                                                    .map((part) => part.charAt(0))
                                                    .filter((_, i, all) => i === 0 || i === all.length - 1)
                                                    .join('')
                                                    .toUpperCase()}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="flex flex-wrap items-center gap-2 font-medium">
                                                    {member.full_name}
                                                    {member.is_you && <Badge>{t('household.you')}</Badge>}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {[
                                                        member.age !== null ? t('household.age', { age: member.age }) : null,
                                                        member.sex ? t(`sex.${member.sex}`) : null,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">{t('household.wrong')}</p>
                            <Button asChild variant="outline" className="shrink-0">
                                <Link href="/concerns?category=record_correction">
                                    <PencilLine className="size-4" aria-hidden="true" /> {t('household.requestFix')}
                                </Link>
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}

MyHousehold.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'My Household', href: '/my-household' },
    ],
};
