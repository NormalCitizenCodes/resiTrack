import { Languages } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';
import { LANGUAGES, type Language } from '@/lib/translations';
export function LanguageSwitcher() {
    const { language, setLanguage } = useTranslation();

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
