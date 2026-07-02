import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';

const SPEECH_LANG: Record<string, string> = {
    en: 'en-US',
    fil: 'fil-PH',
    // Cebuano voice packs are rare on desktop browsers; most Android phones
    // (the common device here) resolve this to a reasonable Filipino voice.
    ceb: 'ceb-PH',
};

/**
 * Text-to-speech via the browser's built-in Web Speech API — free, no
 * backend, degrades to hidden if unsupported. Aimed at residents who can't
 * read at all, which a language toggle alone doesn't solve.
 */
export function ReadAloudButton({ text }: { text: string }) {
    const { language, t } = useTranslation();
    const [speaking, setSpeaking] = useState(false);
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

    useEffect(() => {
        if (!supported) return;

        return () => {
            window.speechSynthesis.cancel();
        };
    }, [supported]);

    if (!supported || !text) {
        return null;
    }

    const toggle = () => {
        if (speaking) {
            window.speechSynthesis.cancel();
            setSpeaking(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = SPEECH_LANG[language] ?? 'en-US';
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        setSpeaking(true);
    };

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={toggle}
            aria-label={speaking ? t('common.stopReading') : t('common.readAloud')}
        >
            {speaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </Button>
    );
}
