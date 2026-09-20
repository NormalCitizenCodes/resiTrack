import { Link, usePage } from '@inertiajs/react';
import { Fragment } from 'react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useTranslation } from '@/hooks/use-translation';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

const RESIDENT_BREADCRUMB_KEYS: Record<string, string> = {
    Dashboard: 'nav.dashboard',
    Programs: 'nav.programs',
    Announcements: 'nav.announcements',
    'My Applications': 'nav.myApplications',
    'My Profile': 'nav.myProfile',
    Notifications: 'notifications.title',
};

export function Breadcrumbs({
    breadcrumbs,
}: {
    breadcrumbs: BreadcrumbItemType[];
}) {
    const role = usePage().props.auth?.user?.role;
    const { t } = useTranslation();

    return (
        <>
            {breadcrumbs.length > 0 && (
                <Breadcrumb>
                    <BreadcrumbList className="flex-nowrap sm:flex-wrap">
                        {breadcrumbs.map((item, index) => {
                            const isLast = index === breadcrumbs.length - 1;

                            return (
                                <Fragment key={index}>
                                    <BreadcrumbItem className={isLast ? 'min-w-0' : 'hidden sm:inline-flex'}>
                                        {isLast ? (
                                            <BreadcrumbPage className="truncate">
                                                {role === 'resident' ? t(RESIDENT_BREADCRUMB_KEYS[item.title] ?? item.title) : item.title}
                                            </BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink asChild>
                                                <Link href={item.href}>
                                                    {role === 'resident' ? t(RESIDENT_BREADCRUMB_KEYS[item.title] ?? item.title) : item.title}
                                                </Link>
                                            </BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>
                                    {!isLast && <BreadcrumbSeparator className="hidden sm:block" />}
                                </Fragment>
                            );
                        })}
                    </BreadcrumbList>
                </Breadcrumb>
            )}
        </>
    );
}
