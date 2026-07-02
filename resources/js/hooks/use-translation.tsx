import { usePage } from '@inertiajs/react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { translate, type Language } from '@/lib/translations';

const COOKIE_NAME = 'resident_lang';

function persistCookie(value: Language): void {
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

type TranslationContextValue = {
    language: Language;
    setLanguage: (language: Language) => void;
    t: (key: string, vars?: Record<string, string | number>) => string;
};

const TranslationContext = createContext<TranslationContextValue | null>(null);

/**
 * Mounted once around every authenticated page (see AppSidebarLayout). Cheap
 * to mount globally — only residents ever see the switcher that changes it,
 * so every other role just gets English via the default.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
    const initialLanguage = (usePage().props.language as Language | undefined) ?? 'en';
    const [language, setLanguageState] = useState<Language>(initialLanguage);

    const setLanguage = useCallback((next: Language) => {
        setLanguageState(next);
        persistCookie(next);
    }, []);

    const t = useCallback(
        (key: string, vars?: Record<string, string | number>) => translate(language, key, vars),
        [language],
    );

    const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

    return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation(): TranslationContextValue {
    const ctx = useContext(TranslationContext);

    if (!ctx) {
        throw new Error('useTranslation must be used within a LanguageProvider');
    }

    return ctx;
}
