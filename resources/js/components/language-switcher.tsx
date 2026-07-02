import { usePage } from '@inertiajs/react';
import { Languages } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';
import { LANGUAGES, type Language } from '@/lib/translations';
import type { Role } from '@/types';

/**
 * Resident-only — staff already work in English/Filipino as trained users
 * and don't need this, so it's hidden rather than shown app-wide.
 */
export function LanguageSwitcher() {
    const role = usePage().props.auth?.user?.role as Role | undefined;
    const { language, setLanguage } = useTranslation();

    if (role !== 'resident') {
        return null;
    }

    return (
        <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
            <SelectTrigger className="h-9 w-auto gap-1.5 border-none shadow-none" aria-label="Language">
                <Languages className="size-4" />
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {LANGUAGES.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
