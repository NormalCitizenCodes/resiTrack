import type { ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export default function AppLogoIcon({
    className,
    ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            src="/images/resitrack-logo.png"
            alt="resiTrack"
            className={cn('aspect-square object-contain', className)}
            {...props}
        />
    );
}
