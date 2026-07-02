import { Head, Link } from '@inertiajs/react';
import { Building2, MapPin, Plus, Users } from 'lucide-react';
import { DataPagination } from '@/components/data-pagination';
import { SectorBadges } from '@/components/sector-badges';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import type { Paginated, Program, Role } from '@/types';

const STATUS_VARIANT: Record<string, 'secondary' | 'outline' | 'destructive'> = {
    active: 'secondary',
    inactive: 'outline',
    expired: 'destructive',
};

export default function ProgramsIndex({
    programs,
    canManage,
    viewerRole,
}: {
    programs: Paginated<Program>;
    canManage: boolean;
    viewerRole: Role;
}) {
    const { t } = useTranslation();
    const isResident = viewerRole === 'resident';

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
                                        <Link
                                            href={`/programs/${program.id}`}
                                            className="font-semibold hover:underline"
                                        >
                                            {program.title}
                                        </Link>
                                        <Badge variant={STATUS_VARIANT[program.status] ?? 'outline'}>
                                            {program.status}
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
                                        {program.description ?? '—'}
                                    </p>
                                    <SectorBadges sectors={program.sectors} />
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
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/programs/${program.id}`}>
                                            {isResident ? t('programs.viewDetails') : 'View details'}
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <DataPagination meta={programs} />
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
