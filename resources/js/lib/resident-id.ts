/**
 * RES0182600045 becomes "RES 018 26 00045" for reading (the way a card number is
 * spaced). The stored, typed and QR form stays the compact one; anything that does
 * not fit the pattern (an ID kept in an older form) is shown as it is.
 */
export function formatResidentId<T extends string | null | undefined>(id: T): T | string {
    const match = typeof id === 'string' ? /^RES(\d{3})(\d{2})(\d{5})$/.exec(id) : null;

    return match ? `RES ${match[1]} ${match[2]} ${match[3]}` : id;
}
