import { Head, Link, router } from '@inertiajs/react';
import { Building2, MapPin, Plus, Search, Users } from 'lucide-react';
import { useState } from 'react';
import { DataPagination } from '@/components/data-pagination';
import { ProgramDialog } from '@/components/program-dialog';
import { SectorBadges } from '@/components/sector-badges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import type { Paginated, Program, Role, VulnerabilitySector } from '@/types';

const STATUS_VARIANT: Record<string, 'secondary' | 'outline' | 'destructive'> = {
    active: 'secondary',
    inactive: 'outline',
    expired: 'destructive',
};

export default function ProgramsIndex({
    programs,
    canManage,
    viewerRole,
    sectors,
    filters,
}: {
    programs: Paginated<Program>;
    canManage: boolean;
    viewerRole?: Role | null;
    sectors: VulnerabilitySector[];
    filters: { search?: string; sector?: string };
}) {
    const { t } = useTranslation();
    const isResident = viewerRole === 'resident';
    const [search, setSearch] = useState(filters.search ?? '');
    const [openId, setOpenId] = useState<number | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    // Residents read a program in a pop-up; staff and agencies keep the full page.
    const show = (programId: number) => {
        setOpenId(programId);
        setDialogOpen(true);
    };
    const applyFilter = (key: 'search' | 'sector', value: string) => {
        router.get('/programs', { ...filters, [key]: value || undefined }, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <>
            <Head title="Programs" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            {canManage ? 'My Programs' : isResident ? t('programs.available') : 'Available Programs'}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {isResident ? t('programs.subtitle') : 'Government social services delivered through partner agencies.'}
                        </p>
                    </div>
                    {canManage && (
                        <Button asChild>
                            <Link href="/programs/create">
                                <Plus className="size-4" /> New Program
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className="relative min-w-[220px] flex-1">
                        <Search className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && applyFilter('search', search)} placeholder={t('programs.search')} className="pl-8" />
                    </div>
                    <Select value={filters.sector || 'all'} onValueChange={(value) => applyFilter('sector', value === 'all' ? '' : value)}>
                        <SelectTrigger className="w-[220px]"><SelectValue placeholder={t('programs.allSectors')} /></SelectTrigger>
                        <SelectContent><SelectItem value="all">{t('programs.allSectors')}</SelectItem>{sectors.map((sector) => <SelectItem key={sector.id} value={sector.code}>{sector.sector_name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>

                {programs.data.length === 0 && (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            {canManage
                                ? 'You have not posted any programs yet.'
                                : isResident
                                  ? t('programs.emptyResident')
                                  : 'No active programs available right now.'}
                        </CardContent>
                    </Card>
                )}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {programs.data.map((program) => {
                        const remaining = Math.max(0, program.slots_available - program.slots_filled);

                        return (
                            <Card key={program.id} className="flex flex-col">
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-2">
                                        {isResident ? (
                                            <button type="button" onClick={() => show(program.id)} className="text-left font-semibold hover:underline">
                                                {program.title}
                                            </button>
                                        ) : (
                                            <Link href={`/programs/${program.id}`} className="font-semibold hover:underline">
                                                {program.title}
                                            </Link>
                                        )}
                                        <Badge variant={STATUS_VARIANT[program.status] ?? 'outline'}>
                                            {program.status === 'active' ? t('programs.open') : t('programs.closed')}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Building2 className="size-3.5" />
                                            {program.agency?.agency_type ?? program.agency?.agency_name ?? 'Agency'}
                                        </span>
                                        {program.barangay && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="size-3.5" />
                                                {program.barangay.name} only
                                            </span>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="flex flex-1 flex-col gap-3">
                                    <p className="line-clamp-2 text-sm text-muted-foreground">
                                        {program.description ?? '-'}
                                    </p>
                                    <SectorBadges sectors={program.sectors} />
                                    <p className="text-xs text-muted-foreground">{t('programs.deadline', { date: program.end_date?.substring(0, 10) ?? t('programs.notSpecified') })}</p>
                                    <div className="mt-auto flex items-center justify-between text-sm">
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <Users className="size-4" />
                                            {program.slots_filled}/{program.slots_available}{' '}
                                            {isResident ? t('programs.slots') : 'slots'}
                                            <span className="text-xs">
                                                ({remaining} {isResident ? t('programs.slotsOpen') : 'open'})
                                            </span>
                                        </span>
                                        {canManage && (program.pending_applications_count ?? 0) > 0 && (
                                            <Badge variant="destructive">
                                                {program.pending_applications_count} pending
                                            </Badge>
                                        )}
                                    </div>
                                    {isResident ? (
                                        <Button variant="outline" size="sm" onClick={() => show(program.id)}>
                                            {t('programs.viewDetails')}
                                        </Button>
                                    ) : (
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/programs/${program.id}`}>View details</Link>
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <DataPagination meta={programs} />
                {isResident && <ProgramDialog programId={openId} open={dialogOpen} onOpenChange={setDialogOpen} />}
            </div>
        </>
    );
}

ProgramsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Programs', href: '/programs' },
    ],
};
