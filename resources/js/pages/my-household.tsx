import { Head, Link, useForm } from '@inertiajs/react';
import { Home, PencilLine, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';

type HouseholdData = {
    household_id: string | null;
    address: string | null;
    zone: string | null;
    is_4ps_beneficiary: boolean;
    leader: { full_name: string; is_you: boolean } | null;
    needs_leader: boolean;
    can_choose_leader: boolean;
};

type Member = { id: number; full_name: string; age: number | null; sex: string | null; is_you: boolean; is_leader: boolean };

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
    const [choosing, setChoosing] = useState(false);
    const { data, setData, put, processing, errors, reset, clearErrors } = useForm<{ resident_id: string }>({ resident_id: '' });

    // Anyone in the household who is not under 18 may be chosen, and may choose.
    const adults = members.filter((member) => member.age !== null && member.age >= 18);

    const closeChooser = () => {
        setChoosing(false);
        reset();
        clearErrors();
    };

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
                        {household.needs_leader && (
                            <div role="note" className="rounded-lg border border-warning/50 bg-warning/10 p-4">
                                <p className="flex items-center gap-2 font-semibold text-warning-text">
                                    <UserRound className="size-4" aria-hidden="true" />
                                    {t('household.noLeaderTitle')}
                                </p>
                                <p className="mt-1 text-sm text-pretty text-muted-foreground">
                                    {t('household.noLeaderText')}
                                    {!household.can_choose_leader && ` ${t('household.noLeaderKid')}`}
                                </p>
                                {household.can_choose_leader && (
                                    <Button type="button" size="sm" className="mt-3" onClick={() => setChoosing(true)}>
                                        {t('household.chooseLeader')}
                                    </Button>
                                )}
                            </div>
                        )}

                        <Card>
                            <CardContent>
                                <dl className="grid gap-4 sm:grid-cols-2">
                                    {household.leader && (
                                        <div className="sm:col-span-2">
                                            <dt className="text-xs text-muted-foreground">{t('household.leader')}</dt>
                                            <dd className="font-medium">
                                                {household.leader.full_name}
                                                {household.leader.is_you && <span className="text-muted-foreground"> · {t('household.leaderIsYou')}</span>}
                                                {household.can_choose_leader && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setChoosing(true)}
                                                        className="ml-3 rounded text-sm font-normal text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                                                    >
                                                        {t('household.changeLeader')}
                                                    </button>
                                                )}
                                            </dd>
                                        </div>
                                    )}
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
                                                    {member.is_leader && <Badge variant="secondary">{t('household.leaderTag')}</Badge>}
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

            <Dialog open={choosing} onOpenChange={(open) => !open && closeChooser()}>
                <DialogContent bottomSheetOnPhone>
                    <DialogHeader>
                        <DialogTitle>{t('household.leaderDialogTitle')}</DialogTitle>
                        <DialogDescription>{t('household.leaderDialogText')}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-1.5">
                        <Select value={data.resident_id} onValueChange={(value) => setData('resident_id', value)}>
                            <SelectTrigger className="w-full" aria-label={t('household.leader')}>
                                <SelectValue placeholder={t('household.leader')} />
                            </SelectTrigger>
                            <SelectContent>
                                {adults.map((member) => (
                                    <SelectItem key={member.id} value={String(member.id)}>
                                        {member.full_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.resident_id && <p className="text-sm text-red-600">{errors.resident_id}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={closeChooser}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            type="button"
                            disabled={processing || data.resident_id === ''}
                            onClick={() => put('/my-household/leader', { preserveScroll: true, onSuccess: closeChooser })}
                        >
                            {t('household.leaderSave')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

MyHousehold.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'My Household', href: '/my-household' },
    ],
};
