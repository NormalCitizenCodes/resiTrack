import { useEffect, useRef, useState } from 'react';

/**
 * Counts up from 0 to `value` once it scrolls into view. Renders `value`
 * itself until then - both on the server and before the observer fires -
 * so there is never a moment where a real stat reads as 0.
 */
export function CountUp({ value, duration = 1200 }: { value: number; duration?: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const [display, setDisplay] = useState(value);

    useEffect(() => {
        const node = ref.current;

        if (!node || typeof IntersectionObserver === 'undefined') {
            return;
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        let frame = 0;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) {
                    return;
                }

                observer.disconnect();
                const start = performance.now();
                setDisplay(0);

                const tick = (now: number) => {
                    const progress = Math.min(1, (now - start) / duration);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    setDisplay(Math.round(value * eased));

                    if (progress < 1) {
                        frame = requestAnimationFrame(tick);
                    }
                };
                frame = requestAnimationFrame(tick);
            },
            { threshold: 0.4 },
        );
        observer.observe(node);

        return () => {
            observer.disconnect();
            cancelAnimationFrame(frame);
        };
    }, [value, duration]);

    return <span ref={ref}>{display.toLocaleString()}</span>;
}
