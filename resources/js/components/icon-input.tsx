import type { ComponentProps, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** A text input with a small decorative icon inside its left edge. */
export function IconInput({
    icon,
    className,
    ...props
}: ComponentProps<typeof Input> & { icon: ReactNode }) {
    return (
        <div className="relative">
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground [&>svg]:size-4"
            >
                {icon}
            </span>
            <Input className={cn('pl-10', className)} {...props} />
        </div>
    );
}
