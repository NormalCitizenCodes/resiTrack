export type AgeBracket = { label: string; count: number; male: number; female: number };
export type SectorCount = { code: string; name: string; count: number };
export type Compound = { with_sector: number; multi: number; combos: { label: string; count: number }[] };

/**
 * Population pyramid: age groups stacked oldest first, males growing left from
 * the center and females right, both on one shared scale so the two sides
 * compare honestly. Numbers sit at the outer edges, so nothing depends on
 * reading a bar length.
 */
export function AgePyramid({ brackets }: { brackets: AgeBracket[] }) {
    const rows = [...brackets].reverse();
    const max = Math.max(1, ...rows.flatMap((row) => [row.male, row.female]));
    const male = rows.reduce((sum, row) => sum + row.male, 0);
    const female = rows.reduce((sum, row) => sum + row.female, 0);

    const total = male + female;
    const inGroups = (labels: string[]) => brackets.filter((b) => labels.includes(b.label)).reduce((sum, b) => sum + b.count, 0);
    const groups = [
        { label: 'Children (0-17)', count: inGroups(['0–12', '13–17']) },
        { label: 'Working age (18-59)', count: inGroups(['18–35', '36–59']) },
        { label: 'Seniors (60+)', count: inGroups(['60+']) },
    ];

    return (
        <div className="flex h-full flex-col">
            <div className="mb-3 flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-sm bg-chart-1" aria-hidden="true" />
                    Male <span className="font-medium text-foreground tabular-nums">{male.toLocaleString()}</span>
                </span>
                <span className="flex items-center gap-1.5">
                    Female <span className="font-medium text-foreground tabular-nums">{female.toLocaleString()}</span>
                    <span className="size-2.5 rounded-sm bg-chart-5" aria-hidden="true" />
                </span>
            </div>

            <ul className="flex flex-1 flex-col justify-between gap-4">
                {rows.map((row) => (
                    <li
                        key={row.label}
                        aria-label={`Age ${row.label}: ${row.male} male, ${row.female} female`}
                        className="grid grid-cols-[1fr_3.25rem_1fr] items-center gap-2 text-sm"
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-8 text-right tabular-nums text-muted-foreground">{row.male}</span>
                            <div className="flex flex-1 justify-end">
                                <div className="h-8 rounded-l-sm bg-chart-1" style={{ width: `${(row.male / max) * 100}%`, minWidth: row.male ? 3 : 0 }} />
                            </div>
                        </div>
                        <span className="text-center font-medium">{row.label}</span>
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <div className="h-8 rounded-r-sm bg-chart-5" style={{ width: `${(row.female / max) * 100}%`, minWidth: row.female ? 3 : 0 }} />
                            </div>
                            <span className="w-8 tabular-nums text-muted-foreground">{row.female}</span>
                        </div>
                    </li>
                ))}
            </ul>

            <dl className="mt-5 grid grid-cols-3 gap-3 border-t pt-4">
                {groups.map((group) => (
                    <div key={group.label}>
                        <dd className="text-xl font-bold tracking-tight tabular-nums">
                            {group.count.toLocaleString()}
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                                {total > 0 ? Math.round((group.count / total) * 100) : 0}%
                            </span>
                        </dd>
                        <dt className="text-xs text-muted-foreground">{group.label}</dt>
                    </div>
                ))}
            </dl>
        </div>
    );
}

/**
 * Sectors ranked largest first, in one color (the sectors are categories of
 * the same kind, so a rainbow would suggest meaning that is not there), plus
 * how many residents belong to more than one sector, since the sector counts
 * overlap and add up to more than the number of residents.
 */
export function SectorBars({ sectors, totalResidents, compound }: { sectors: SectorCount[]; totalResidents: number; compound: Compound }) {
    const ranked = [...sectors].sort((a, b) => b.count - a.count);
    const max = Math.max(1, ...ranked.map((sector) => sector.count));
    const share = (count: number) => (totalResidents > 0 ? Math.round((count / totalResidents) * 100) : 0);

    return (
        <div className="space-y-5">
            <ul className="space-y-3">
                {ranked.map((sector) => (
                    <li key={sector.code}>
                        <div className="mb-1 flex justify-between gap-2 text-sm">
                            <span className="font-medium">{sector.name}</span>
                            <span className="text-muted-foreground tabular-nums">
                                {sector.count.toLocaleString()} <span className="text-xs">({share(sector.count)}%)</span>
                            </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${(sector.count / max) * 100}%` }} />
                        </div>
                    </li>
                ))}
            </ul>

            {compound.with_sector > 0 && (
                <div className="border-t pt-4">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl leading-none font-bold tracking-tight tabular-nums">{compound.multi.toLocaleString()}</span>
                        <span className="min-w-0 flex-1 text-sm text-pretty text-muted-foreground">
                            residents in 2 or more sectors ({Math.round((compound.multi / compound.with_sector) * 100)}% of the{' '}
                            {compound.with_sector.toLocaleString()} with any sector)
                        </span>
                    </div>
                    {compound.combos.length > 0 && (
                        <ul className="mt-4 space-y-1 text-sm">
                            {compound.combos.map((combo) => (
                                <li key={combo.label} className="flex justify-between gap-2">
                                    <span className="text-muted-foreground">{combo.label}</span>
                                    <span className="font-medium tabular-nums">{combo.count.toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
