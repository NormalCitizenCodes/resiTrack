import { Form, Head } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/register/google-complete';

type Props = {
    name: string;
    email: string;
    barangays: { id: number; name: string }[];
};

export default function RegisterGoogleComplete({ name, email, barangays }: Props) {
    return (
        <>
            <Head title="One more step" />
            <Form {...store.form()} className="flex flex-col gap-5">
                {({ processing, errors }) => (
                    <>
                        <p className="text-sm text-muted-foreground">
                            Signed in as <span className="font-medium text-foreground">{name}</span> ({email}). Just
                            need your barangay to finish setting up your account.
                        </p>

                        <div className="grid gap-2">
                            <Label htmlFor="barangay_id">Barangay</Label>
                            <Select name="barangay_id" required>
                                <SelectTrigger id="barangay_id" className="w-full">
                                    <SelectValue placeholder="Select your barangay" />
                                </SelectTrigger>
                                <SelectContent>
                                    {barangays.map((barangay) => (
                                        <SelectItem key={barangay.id} value={String(barangay.id)}>
                                            {barangay.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <InputError message={errors.barangay_id} />
                        </div>

                        <Button type="submit" className="w-full">
                            {processing ? <Spinner /> : null}
                            Finish sign up
                            {!processing && <ArrowRight className="size-4" />}
                        </Button>
                    </>
                )}
            </Form>
        </>
    );
}

RegisterGoogleComplete.layout = {
    title: 'One more step',
    description: 'Tell us your barangay to finish setting up your account.',
};
