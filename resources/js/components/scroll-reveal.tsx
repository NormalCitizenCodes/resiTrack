import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
    children: ReactNode;
    className?: string;
    /** Stagger, in ms, for revealing siblings one after another. */
    delay?: number;
};

/**
 * Fades and slides a section up once it scrolls into view. Starts hidden so
 * the transition has something to animate from - browsers without
 * IntersectionObserver, and anyone with prefers-reduced-motion, get the
 * content immediately instead of being stuck invisible.
 */
export function ScrollReveal({ children, className, delay = 0 }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const node = ref.current;

        if (!node || typeof IntersectionObserver === 'undefined') {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
        );
        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={cn(
                'transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:transform-none',
                visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 motion-reduce:opacity-100',
                className,
            )}
            style={delay ? { transitionDelay: `${delay}ms` } : undefined}
        >
            {children}
        </div>
    );
}
