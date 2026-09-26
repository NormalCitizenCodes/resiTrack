import { Head, Link, useForm } from '@inertiajs/react';
import type { FormEventHandler } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { dashboard } from '@/routes';
import type { VulnerabilitySector } from '@/types';

export default function AnnouncementCreate({ sectors }: { sectors: VulnerabilitySector[] }) {
    const { data, setData, post, processing, errors } = useForm<{
        title: string;
        content: string;
        sector_ids: number[];
        expires_at: string;
        [key: string]: string | number[];
    }>({
        title: '',
        content: '',
        sector_ids: [],
        expires_at: '',
    });

    const toggleSector = (id: number, checked: boolean) => {
        setData('sector_ids', checked ? [...data.sector_ids, id] : data.sector_ids.filter((s) => s !== id));
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/announcements');
    };

    return (
        <>
            <Head title="New Announcement" />
            <form onSubmit={submit} className="mx-auto w-full max-w-2xl flex-1 space-y-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">New Announcement</h1>
                    <p className="text-sm text-muted-foreground">
                        Residents you target will also receive an in-app notification.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="mb-1.5 block">
                                Title <span className="text-red-500">*</span>
                            </Label>
                            <Input value={data.title} onChange={(e) => setData('title', e.target.value)} />
                            <InputError message={errors.title} className="mt-1" />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">
                                Content <span className="text-red-500">*</span>
                            </Label>
                            <textarea
                                value={data.content}
                                onChange={(e) => setData('content', e.target.value)}
                                rows={5}
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            />
                            <InputError message={errors.content} className="mt-1" />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Target Sectors</Label>
                            <p className="mb-2 text-xs text-muted-foreground">
                                Residents in any selected sector will see and be notified of this announcement. Leave
                                all unchecked to broadcast to every resident in the barangay.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                {sectors.map((sector) => (
                                    <label key={sector.id} className="flex items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={data.sector_ids.includes(sector.id)}
                                            onCheckedChange={(v) => toggleSector(sector.id, v === true)}
                                        />
                                        {sector.sector_name}
                                    </label>
                                ))}
                            </div>
                            <InputError message={errors.sector_ids} className="mt-1" />
                        </div>
                        <div className="max-w-xs">
                            <Label className="mb-1.5 block">Expires (optional)</Label>
                            <Input
                                type="date"
                                value={data.expires_at}
                                onChange={(e) => setData('expires_at', e.target.value)}
                            />
                            <InputError message={errors.expires_at} className="mt-1" />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button asChild variant="outline" type="button">
                        <Link href="/announcements">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={processing}>
                        Post Announcement
                    </Button>
                </div>
            </form>
        </>
    );
}

AnnouncementCreate.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Announcements', href: '/announcements' },
        { title: 'New', href: '/announcements/create' },
    ],
};
