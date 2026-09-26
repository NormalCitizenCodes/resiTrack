import { Search, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type HouseholdOption = {
    id: number;
    household_number: string | null;
    address: string | null;
    family_name?: string | null;
};

const title = (option: HouseholdOption) => (option.family_name ? `${option.family_name} household` : `Household #${option.id}`);
const detail = (option: HouseholdOption) => [option.household_number, option.address].filter(Boolean).join(' · ');

/**
 * Type-ahead for choosing a household. A barangay can have thousands, so the list is never
 * loaded whole: typing a family name, a household number or part of the address asks the
 * server for the first few matches in the staff member's own barangay.
 */
export function HouseholdPicker({
    value,
    initial,
    onChange,
}: {
    /** The chosen household's id, or '' for none. */
    value: string;
    /** Households the page already knows, so a saved choice can be named before anyone types. */
    initial: HouseholdOption[];
    onChange: (id: string) => void;
}) {
    const listId = useId();
    const [known, setKnown] = useState<HouseholdOption[]>(initial);
    const [options, setOptions] = useState<HouseholdOption[]>([]);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [active, setActive] = useState(0);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const latest = useRef(0);

    const selected = known.find((option) => String(option.id) === value) ?? null;

    const load = async (term: string) => {
        const ticket = ++latest.current;
        setLoading(true);
        setFailed(false);

        try {
            const response = await fetch(`/households/search?q=${encodeURIComponent(term)}`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(String(response.status));
            }

            const found: HouseholdOption[] = await response.json();

            // A slower, older answer must not overwrite a newer one.
            if (ticket === latest.current) {
                setOptions(found);
                setActive(0);
            }
        } catch {
            if (ticket === latest.current) {
                setOptions([]);
                setFailed(true);
            }
        } finally {
            if (ticket === latest.current) {
                setLoading(false);
            }
        }
    };

    const openList = () => {
        setOpen(true);
        setQuery('');
        void load('');
    };

    const type = (term: string) => {
        setQuery(term);
        setOpen(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => void load(term.trim()), 250);
    };

    const choose = (option: HouseholdOption) => {
        setKnown((current) => (current.some((item) => item.id === option.id) ? current : [...current, option]));
        onChange(String(option.id));
        setOpen(false);
    };

    const clear = () => {
        onChange('');
        setQuery('');
    };

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setActive((index) => Math.min(index + 1, options.length - 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((index) => Math.max(index - 1, 0));
        } else if (event.key === 'Enter' && open && options[active]) {
            event.preventDefault();
            choose(options[active]);
        } else if (event.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
                role="combobox"
                aria-expanded={open}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={open && options[active] ? `${listId}-${options[active].id}` : undefined}
                autoComplete="off"
                value={open ? query : selected ? title(selected) : ''}
                placeholder="Unassigned. Search by family name, number or address"
                onFocus={openList}
                onBlur={() => setOpen(false)}
                onChange={(event) => type(event.target.value)}
                onKeyDown={onKeyDown}
                className={cn('pl-9', value !== '' && 'pr-9')}
            />
            {value !== '' && !open && (
                <button
                    type="button"
                    onClick={clear}
                    aria-label="Remove household"
                    className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                    <X className="size-4" />
                </button>
            )}

            {open && (
                <ul
                    id={listId}
                    role="listbox"
                    // Picking must land before the input's blur closes the list.
                    onMouseDown={(event) => event.preventDefault()}
                    className="absolute right-0 z-30 mt-1 max-h-72 w-full overflow-y-auto sm:w-[28rem] sm:max-w-[80vw] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                >
                    {loading && options.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Searching...</li>}
                    {failed && <li className="px-3 py-2 text-sm text-destructive">Could not load households. Try again.</li>}
                    {!loading && !failed && options.length === 0 && (
                        <li className="px-3 py-2 text-sm text-muted-foreground">{query.trim() ? 'No household matches that.' : 'No households in this barangay yet.'}</li>
                    )}
                    {options.map((option, index) => (
                        <li
                            key={option.id}
                            id={`${listId}-${option.id}`}
                            role="option"
                            aria-selected={String(option.id) === value}
                            onClick={() => choose(option)}
                            onMouseMove={() => setActive(index)}
                            className={cn('cursor-pointer rounded-sm px-3 py-2', index === active && 'bg-accent text-accent-foreground')}
                        >
                            <p className="truncate text-sm font-medium">{title(option)}</p>
                            {detail(option) && <p className="truncate text-xs text-muted-foreground">{detail(option)}</p>}
                        </li>
                    ))}
                    {options.length >= 15 && <li className="px-3 py-1.5 text-xs text-muted-foreground">Showing the first 15. Type more to narrow it down.</li>}
                </ul>
            )}
        </div>
    );
}
