import { useEffect, useRef, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';

const FILL_AT = 450;
const FILL_MS = 1100;
const GLIDE_AT = 1700;
const GLIDE_MS = 1000;
const SWAP_MS = 150;
const FAILSAFE_MS = 5000;

type Glide = { x: number; y: number };

/**
 * First-visit splash for the landing page: the wordmark draws in as an
 * outline and fills, then the logo glides to the real header logo while the
 * page content animates in behind it. Whether it plays at all is decided by
 * the inline script in app.blade.php (html.intro-pending), so this renders
 * identically on the server and never blocks the page when JS is unavailable.
 * The header logo must carry id="site-logo".
 */
export function IntroSplash() {
    const groupRef = useRef<HTMLDivElement>(null);
    const [filled, setFilled] = useState(false);
    const [glide, setGlide] = useState<Glide | null>(null);
    const [landed, setLanded] = useState(false);

    useEffect(() => {
        const root = document.documentElement;

        if (!root.classList.contains('intro-pending')) {
            return;
        }

        // A reload can restore a scrolled position, which would hide the header logo the splash flies to.
        window.scrollTo(0, 0);

        try {
            sessionStorage.setItem('intro_seen', '1');
        } catch {
            // Private mode: the splash simply plays again next visit.
        }

        const finish = () => root.classList.remove('intro-pending', 'intro-glide', 'intro-hide-logo');

        const fillTimer = window.setTimeout(() => setFilled(true), FILL_AT);

        const glideTimer = window.setTimeout(() => {
            const target = document.getElementById('site-logo');
            const group = groupRef.current;

            if (target && group) {
                const to = target.getBoundingClientRect();
                const from = group.getBoundingClientRect();
                setGlide({
                    x: to.left + to.width / 2 - (from.left + from.width / 2),
                    y: to.top + to.height / 2 - (from.top + from.height / 2),
                });
            }

            root.classList.remove('intro-pending');
            root.classList.add('intro-glide', 'intro-hide-logo');
        }, GLIDE_AT);

        // Crossfade at the end: reveal the real logo while the splash copy fades, then drop the overlay.
        const landTimer = window.setTimeout(() => {
            root.classList.remove('intro-hide-logo');
            setLanded(true);
        }, GLIDE_AT + GLIDE_MS);

        const doneTimer = window.setTimeout(finish, GLIDE_AT + GLIDE_MS + SWAP_MS + 60);
        const failsafe = window.setTimeout(finish, FAILSAFE_MS);

        return () => {
            window.clearTimeout(fillTimer);
            window.clearTimeout(glideTimer);
            window.clearTimeout(landTimer);
            window.clearTimeout(doneTimer);
            window.clearTimeout(failsafe);
            finish();
        };
    }, []);

    return (
        <div data-intro-overlay aria-hidden="true" className="fixed inset-0 z-[100] items-center justify-center">
            <div
                className="absolute inset-0 bg-background transition-opacity ease-out"
                style={{ opacity: glide ? 0 : 1, transitionDuration: `${GLIDE_MS * 0.7}ms` }}
            />
            <div
                ref={groupRef}
                className="relative flex items-center gap-2 ease-[cubic-bezier(0.76,0,0.24,1)]"
                style={{
                    transform: glide ? `translate(${glide.x}px, ${glide.y}px) scale(1)` : 'translate(0px, 0px) scale(1.9)',
                    opacity: landed ? 0 : 1,
                    transition: `transform ${GLIDE_MS}ms cubic-bezier(0.76, 0, 0.24, 1), opacity ${SWAP_MS}ms ease-out`,
                }}
            >
                <AppLogoIcon className="animate-in fade-in-0 zoom-in-75 size-9 duration-700 fill-mode-both" />
                <span className="relative text-lg font-semibold tracking-tight">
                    {/* Fades out once the solid copy has fully covered it: its stroke would otherwise leave the wordmark looking bolder than the header's. */}
                    <span
                        className="text-transparent"
                        style={{
                            WebkitTextStroke: '0.6px var(--foreground)',
                            opacity: filled ? 0 : 1,
                            transition: filled ? `opacity 200ms ease-out ${FILL_MS}ms` : undefined,
                        }}
                    >
                        resiTrack
                    </span>
                    {/* Solid copy revealed left to right over the outline. */}
                    <span
                        className="absolute inset-0 text-foreground"
                        style={{
                            clipPath: filled ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
                            transition: `clip-path ${FILL_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`,
                        }}
                    >
                        resiTrack
                    </span>
                </span>
            </div>
        </div>
    );
}
