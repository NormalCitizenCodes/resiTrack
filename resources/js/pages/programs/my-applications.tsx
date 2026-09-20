import { Head, Link } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTranslation } from '@/hooks/use-translation';
import { dashboard } from '@/routes';
import type { ProgramApplication } from '@/types';

const STATUS_VARIANT: Record<string, 'secondary' | 'outline' | 'destructive' | 'default'> = {
    approved: 'secondary',
    pending: 'default',
    rejected: 'destructive',
};

export default function MyApplications({
    applications,
    hasResidentRecord,
}: {
    applications: ProgramApplication[];
    hasResidentRecord: boolean;
}) {
    const { t } = useTranslation();

    return (
        <>
            <Head title="My Applications" />
            <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">{t('programs.myApplications.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('programs.myApplications.subtitle')}</p>
                </div>

                {!hasResidentRecord && (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            {t('common.notLinked')}
                        </CardContent>
                    </Card>
                )}

                {hasResidentRecord && (
                    <div className="rounded-xl border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('programs.myApplications.program')}</TableHead>
                                    <TableHead>{t('programs.myApplications.agency')}</TableHead>
                                    <TableHead>{t('programs.myApplications.applied')}</TableHead>
                                    <TableHead>{t('programs.status')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {applications.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                                            {t('programs.myApplications.empty')}{' '}
                                            <Link href="/programs" className="text-primary hover:underline">
                                                {t('programs.myApplications.browse')}
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {applications.map((application) => (
                                    <TableRow key={application.id}>
                                        <TableCell className="font-medium">
                                            <Link
                                                href={`/programs/${application.program_id}`}
                                                className="hover:underline"
                                            >
                                                {application.program?.title ?? `Program #${application.program_id}`}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {application.program?.agency?.agency_type ?? '-'}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {application.applied_at?.substring(0, 10) ?? '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={STATUS_VARIANT[application.status] ?? 'outline'}>
                                                {application.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </>
    );
}

MyApplications.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'My Applications', href: '/my-applications' },
    ],
};
