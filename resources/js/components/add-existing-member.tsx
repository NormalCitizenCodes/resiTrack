import { router } from '@inertiajs/react';
import { ArrowRightLeft, Search } from 'lucide-react';
import { useRef, useState } from 'react';
import type { HouseholdOption } from '@/components/household-picker';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatResidentId } from '@/lib/resident-id';

type Candidate = {
    id: number;
    full_name: string;
    resident_id: string | null;
    age: number | null;
    sex: string | null;
    address: string | null;
    household: HouseholdOption | null;
};

const householdName = (household: HouseholdOption) =>
    household.family_name ? `${household.family_name} household` : (household.household_number ?? `Household #${household.id}`);

/**
 * Puts a resident who is already registered into this household. It lists people with no
 * household yet; ticking the box also lists those in another household, and choosing one of
 * them asks first, because it moves them out of where they are now.
 */
export function AddExistingMember({ householdId, householdLabel, open, onOpenChange }: { householdId: number; householdLabel: string; open: boolean; onOpenChange: (open: boolean) => void }) {
    const [query, setQuery] = useState('');
    const [includeAssigned, setIncludeAssigned] = useState(false);
    const [results, setResults] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [moving, setMoving] = useState<Candidate | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const latest = useRef(0);

    const load = async (term: string, assigned: boolean) => {
        const ticket = ++latest.current;
        setLoading(true);
        setFailed(false);

        try {
            const params = new URLSearchParams({ q: term });

            if (assigned) {
                params.set('include_assigned', '1');
            }

            const response = await fetch(`/households/${householdId}/member-search?${params}`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(String(response.status));
            }

            const found: Candidate[] = await response.json();

            if (ticket === latest.current) {
                setResults(found);
            }
        } catch {
            if (ticket === latest.current) {
                setResults([]);
                setFailed(true);
            }
        } finally {
            if (ticket === latest.current) {
                setLoading(false);
            }
        }
    };

    const handleOpenChange = (next: boolean) => {
        onOpenChange(next);

        if (next) {
            setQuery('');
            setIncludeAssigned(false);
            setMoving(null);
            setError(null);
            void load('', false);
        }
    };

    const type = (term: string) => {
        setQuery(term);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => void load(term.trim(), includeAssigned), 250);
    };

    const toggleAssigned = (on: boolean) => {
        setIncludeAssigned(on);
        void load(query.trim(), on);
    };

    const add = (candidate: Candidate, move: boolean) => {
        setSaving(true);
        setError(null);

        router.post(
            `/households/${householdId}/members`,
            { resident_id: candidate.id, move },
            {
                preserveScroll: true,
                onSuccess: () => onOpenChange(false),
                onError: (errors) => setError(errors.resident_id ?? 'Could not add this person. Try again.'),
                onFinish: () => setSaving(false),
            },
        );
    };

    const choose = (candidate: Candidate) => {
        if (candidate.household) {
            setMoving(candidate);
        } else {
            add(candidate, false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg" bottomSheetOnPhone>
                <DialogHeader>
                    <DialogTitle>Add an existing resident</DialogTitle>
                    <DialogDescription>Choose someone already registered in this barangay to join the {householdLabel}.</DialogDescription>
                </DialogHeader>

                {moving?.household ? (
                    <div className="space-y-4">
                        <div className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
                            <ArrowRightLeft className="mt-0.5 size-4 shrink-0 text-warning-text" aria-hidden="true" />
                            <p>
                                <span className="font-semibold">{moving.full_name}</span> currently lives in the {householdName(moving.household)}
                                {moving.household.household_number ? ` (${moving.household.household_number})` : ''}. Moving them takes them out of that household
                                {' '}and, if they were its leader, leaves it with no leader.
                            </p>
                        </div>
                        {error && <p className="text-sm text-destructive">{error}</p>}
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setMoving(null)} disabled={saving}>
                                Back
                            </Button>
                            <Button type="button" onClick={() => add(moving, true)} disabled={saving}>
                                Move to this household
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="min-w-0 space-y-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                            <Input
                                autoFocus
                                value={query}
                                onChange={(event) => type(event.target.value)}
                                placeholder="Search by name or Resident ID"
                                aria-label="Search residents"
                                className="pl-9"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox id="include-assigned" checked={includeAssigned} onCheckedChange={(checked) => toggleAssigned(checked === true)} />
                            <Label htmlFor="include-assigned" className="text-sm font-normal">
                                Also show people who live in another household
                            </Label>
                        </div>

                        {error && <p className="text-sm text-destructive">{error}</p>}

                        <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border" aria-label="Residents">
                            {loading && results.length === 0 && <li className="px-3 py-4 text-sm text-muted-foreground">Searching...</li>}
                            {failed && <li className="px-3 py-4 text-sm text-destructive">Could not load residents. Try again.</li>}
                            {!loading && !failed && results.length === 0 && (
                                <li className="px-3 py-4 text-sm text-muted-foreground">
                                    {query.trim()
                                        ? 'No one matches that.'
                                        : includeAssigned
                                          ? 'No other residents to add.'
                                          : 'Everyone registered already has a household.'}
                                </li>
                            )}
                            {results.map((candidate) => (
                                <li key={candidate.id}>
                                    <button
                                        type="button"
                                        onClick={() => choose(candidate)}
                                        disabled={saving}
                                        className="flex w-full min-w-0 flex-col gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:opacity-60"
                                    >
                                        <span className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
                                            {candidate.full_name}
                                            <span className="text-xs font-normal text-muted-foreground">
                                                {[candidate.age !== null ? `${candidate.age}` : null, candidate.sex].filter(Boolean).join(' · ')}
                                            </span>
                                        </span>
                                        <span className="truncate font-mono text-xs text-muted-foreground">{formatResidentId(candidate.resident_id)}</span>
                                        {candidate.address && <span className="truncate text-xs text-muted-foreground">{candidate.address}</span>}
                                        {candidate.household && (
                                            <span className="text-xs font-medium text-warning-text">
                                                In the {householdName(candidate.household)}. Choosing moves them here.
                                            </span>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {results.length >= 15 && <p className="text-xs text-muted-foreground">Showing the first 15. Type more to narrow it down.</p>}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
