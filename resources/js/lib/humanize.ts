const WORDS: Record<string, string> = {
    self_employed: 'Self-employed',
    not_enrolled: 'Not enrolled',
    highschool: 'High school',
    pipe: 'Piped water',
    solo_parent: 'Solo parent',
    record_correction: 'Record correction',
};

/** "self_employed" becomes "Self-employed", "male" becomes "Male". Empty stays null so a "-" can be shown. */
export function humanize(value: string | null | undefined): string | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    return WORDS[value] ?? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
}

/** "2006-04-11" becomes "April 11, 2006". Built from the parts so the time zone cannot shift the day. */
export function formatDay(value: string | null | undefined): string | null {
    const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;

    if (!match) {
        return null;
    }

    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))).toLocaleDateString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}
