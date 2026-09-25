import { useSyncExternalStore } from 'react';
import { useTranslation } from '@/hooks/use-translation';

const subscribeNever = () => () => {};

/**
 * False while the server renders and during the browser's hydration pass, true
 * afterwards. Dates depend on the viewer's language, time zone and clock, none
 * of which the server can know, so they are printed in one fixed form until
 * hydration is done and only then in the viewer's own.
 */
function useHydrated(): boolean {
    return useSyncExternalStore(subscribeNever, () => true, () => false);
}

/** The same text on the server and in the browser: English, UTC, no clock. */
const stableDate = (date: Date): string => date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export const LOCALE: Record<string, string> = {
    en: 'en-US',
    fil: 'fil-PH',
    ceb: 'ceb-PH', // not in most CLDR builds; browsers fall back to default formatting
};

/**
 * Facebook-style timestamps: terse relative time for anything under a week
 * old ("5m", "3h", "2d"), a full date beyond that. The relative-unit letters
 * stay untranslated on purpose - "3h" reads fine across languages and is a
 * near-universal social-app convention; the absolute fallback's month names
 * do follow the resident's selected language via Intl.
 */
export function useRelativeDate(): (value: string | null | undefined) => string {
    const { t, language } = useTranslation();
    const hydrated = useHydrated();

    return (value: string | null | undefined): string => {
        if (!value) {
return '';
}

        const date = new Date(value);

        if (!hydrated) {
return stableDate(date);
}

        const diffMs = Date.now() - date.getTime();
        const diffMin = Math.floor(diffMs / 60_000);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffMin < 1) {
return t('time.justNow');
}

        if (diffMin < 60) {
return `${diffMin}m`;
}

        if (diffHour < 24) {
return `${diffHour}h`;
}

        if (diffDay < 7) {
return `${diffDay}d`;
}

        const locale = LOCALE[language] ?? 'en-US';
        const datePart = date.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
        const timePart = date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });

        return `${datePart}, ${timePart}`;
    };
}

/** "2026-10-01" or "2026-10-01T08:00" (no zone) as a UTC Date, so it prints exactly as written. */
const wallClock = (value: string): Date => new Date(value.length <= 10 ? `${value}T00:00:00Z` : `${value}:00Z`);

/**
 * A calendar date with no time zone attached, like a birthday ("2001-05-04"):
 * printed as written, never shifted a day by the viewer's zone.
 */
export function useCalendarDate(): (value: string | null | undefined) => string {
    const { language } = useTranslation();
    const hydrated = useHydrated();

    return (value: string | null | undefined): string => {
        if (!value) {
            return '';
        }

        const locale = hydrated ? (LOCALE[language] ?? 'en-US') : 'en-US';

        return wallClock(value.substring(0, 10)).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    };
}

/**
 * A venue's local time as the agency typed it ("2026-10-01T08:00"): the day,
 * the time, and how many days away it is for the viewer. The day count needs
 * the clock, so it stays null until hydration is done.
 */
export function useScheduleTime(): (value: string) => { day: string; time: string; daysAway: number | null } {
    const { language } = useTranslation();
    const hydrated = useHydrated();

    return (value: string) => {
        const date = wallClock(value);
        const locale = hydrated ? (LOCALE[language] ?? 'en-US') : 'en-US';
        let daysAway: number | null = null;

        if (hydrated) {
            const now = new Date();
            const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
            const target = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
            daysAway = Math.round((target - today) / 86_400_000);
        }

        return {
            day: date.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
            time: date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }),
            daysAway,
        };
    };
}

/**
 * Plain "June 10, 2026" - no relative bucketing, no time. For forward-looking
 * dates (e.g. an announcement's expiry) where "in 3 days" isn't what's wanted.
 */
export function useLongDate(): (value: string | null | undefined) => string {
    const { language } = useTranslation();
    const hydrated = useHydrated();

    return (value: string | null | undefined): string => {
        if (!value) {
return '';
}

        if (!hydrated) {
return stableDate(new Date(value));
}

        const locale = LOCALE[language] ?? 'en-US';

        return new Date(value).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
    };
}
