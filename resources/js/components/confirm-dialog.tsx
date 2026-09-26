import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

type ConfirmOptions = {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Red button, for things that delete or cannot be undone. */
    destructive?: boolean;
    /** Only an OK button, for a message rather than a question. */
    notice?: boolean;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

let show: ((pending: Pending) => void) | null = null;

/**
 * Asks in a styled dialog instead of the browser's own confirm() box, and
 * answers true when the person confirms. `<ConfirmHost />` (mounted once in
 * app.tsx) draws it.
 */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
        if (!show) {
            resolve(false);

            return;
        }

        show({ ...options, resolve });
    });
}

export function ConfirmHost() {
    // `pending` keeps the last question after it is answered, so the words stay in the box while it fades out.
    const [pending, setPending] = useState<Pending | null>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        show = (next) => {
            setPending(next);
            setOpen(true);
        };

        return () => {
            show = null;
        };
    }, []);

    const answer = (ok: boolean) => {
        pending?.resolve(ok);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !open && answer(false)}>
            <DialogContent bottomSheetOnPhone className="sm:max-w-md">
                <DialogHeader className="pr-6">
                    <DialogTitle>{pending?.title}</DialogTitle>
                    {pending?.description && (
                        <DialogDescription>
                            {pending.description}
                        </DialogDescription>
                    )}
                </DialogHeader>
                <DialogFooter>
                    {!pending?.notice && (
                        <Button variant="outline" onClick={() => answer(false)}>
                            {pending?.cancelLabel ?? 'Cancel'}
                        </Button>
                    )}
                    <Button
                        variant={
                            pending?.destructive ? 'destructive' : 'default'
                        }
                        onClick={() => answer(true)}
                        autoFocus
                    >
                        {pending?.confirmLabel ??
                            (pending?.notice ? 'OK' : 'Confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
