import { useTranslation } from '@/hooks/use-translation';

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

    return (value: string | null | undefined): string => {
        if (!value) return '';

        const date = new Date(value);
        const diffMs = Date.now() - date.getTime();
        const diffMin = Math.floor(diffMs / 60_000);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffMin < 1) return t('time.justNow');
        if (diffMin < 60) return `${diffMin}m`;
        if (diffHour < 24) return `${diffHour}h`;
        if (diffDay < 7) return `${diffDay}d`;

        const locale = LOCALE[language] ?? 'en-US';
        const datePart = date.toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
        const timePart = date.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });

        return `${datePart}, ${timePart}`;
    };
}

/**
 * Plain "June 10, 2026" - no relative bucketing, no time. For forward-looking
 * dates (e.g. an announcement's expiry) where "in 3 days" isn't what's wanted.
 */
export function useLongDate(): (value: string | null | undefined) => string {
    const { language } = useTranslation();

    return (value: string | null | undefined): string => {
        if (!value) return '';

        const locale = LOCALE[language] ?? 'en-US';
        return new Date(value).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
    };
}
