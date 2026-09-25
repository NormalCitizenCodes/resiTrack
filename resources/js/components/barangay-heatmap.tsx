import 'leaflet/dist/leaflet.css';
import type L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppearance } from '@/hooks/use-appearance';

type SectorCount = { code: string; name: string; count: number };
type BarangaySummary = {
    id: number;
    name: string;
    residents: number;
    households: number;
    pending_duplicates: number;
    sector_counts: SectorCount[];
};

// Sequential blue ramp, light -> dark, from the project's dataviz skill's
// validated reference palette (steps 150/300/450/600/700). A magnitude scale
// like this is allowed to recede toward the surface at the light end - that's
// "low," not "missing." "No data at all" is a separate, distinct gray below,
// never a step of this ramp, so it never gets misread as "confirmed zero."
const DENSITY_STEPS = ['#b7d3f6', '#6da7ec', '#2a78d6', '#184f95', '#0d366b'];

// Muted basemaps so the data, not the roads and parks, carries the map.
// Esri's gray canvas needs no API key (CARTO's free tiles now stamp "API KEY REQUIRED").
const TILES = {
    light: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    dark: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
};

// Matches --muted in resources/css/app.css (light and dark blocks).
const NO_DATA_FILL_LIGHT = '#eef2f7';
const NO_DATA_FILL_DARK = '#1a2a49';

function normalizeBarangayName(name: string): string {
    return name
        .replace(/\s*\((Pob\.|Capital)\)\s*$/i, '')
        .trim()
        .toLowerCase();
}

/** Round to two significant digits so legend edges read as 1,200, not 1,234. */
function nice(n: number): number {
    if (n < 20) {
        return Math.round(n);
    }

    const unit = Math.pow(10, Math.floor(Math.log10(n)) - 1);

    return Math.round(n / unit) * unit;
}

// Square-root scale: with one barangay far ahead of the rest (110 vs 1), a
// linear scale paints everything but the leader the same lightest blue. The
// edges are relative to the largest barangay, so they grow with the data, and
// the same rounded edges drive both the colors and the legend.
function stepBounds(max: number): number[] {
    const steps = DENSITY_STEPS.length;

    return [0, ...Array.from({ length: steps - 1 }, (_, i) => nice(max * Math.pow((i + 1) / steps, 2))), max];
}

function stepFor(value: number, bounds: number[]): number {
    if (value <= 0) {
        return 0;
    }

    const index = bounds.findIndex((upper, i) => i > 0 && value <= upper);

    return index === -1 ? DENSITY_STEPS.length - 1 : index - 1;
}

type Props = {
    barangays: BarangaySummary[];
    /** Barangay currently hovered in the table below, to highlight it on the map. */
    highlightId?: number | null;
    /** Tell the parent which barangay the pointer is over on the map. */
    onHighlight?: (id: number | null) => void;
    /** Open a barangay when its shape is clicked. Omit for roles that cannot browse residents. */
    onSelect?: (id: number) => void;
    /** Rendered under the controls, beside the map (the barangay table). */
    aside?: ReactNode;
};

export function BarangayHeatmap({ barangays, highlightId = null, onHighlight, onSelect, aside }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const leafletRef = useRef<typeof L | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const tileRef = useRef<L.TileLayer | null>(null);
    const layerRef = useRef<L.GeoJSON | null>(null);
    const activeGroupRef = useRef<L.FeatureGroup | null>(null);
    const shapesRef = useRef<Map<number, L.Path>>(new Map());
    const geojsonRef = useRef<GeoJSON.FeatureCollection | null>(null);
    const [metric, setMetric] = useState('residents');
    const [view, setView] = useState<'active' | 'city'>('active');
    const { resolvedAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';
    const noDataFill = isDark ? NO_DATA_FILL_DARK : NO_DATA_FILL_LIGHT;

    const sectorOptions = barangays[0]?.sector_counts ?? [];
    const metricLabel = metric === 'residents' ? 'Residents' : (sectorOptions.find((s) => s.code === metric)?.name ?? metric);

    const valueFor = (barangay: BarangaySummary): number => {
        if (metric === 'residents') {
            return barangay.residents;
        }

        return barangay.sector_counts.find((s) => s.code === metric)?.count ?? 0;
    };

    const maxValue = Math.max(1, ...barangays.map((b) => valueFor(b)));
    const bounds = stepBounds(maxValue);

    // Create the map once; never re-run on data/metric changes. Leaflet reads
    // `window` the moment it is imported, so it is loaded here, in the browser,
    // and never during server-side rendering.
    useEffect(() => {
        let cancelled = false;
        let created: L.Map | null = null;

        import('leaflet').then((module) => {
            const leaflet = (module.default ?? module) as typeof L;

            if (cancelled || !containerRef.current || mapRef.current) {
                return;
            }

            // One-finger drag would trap page scrolling on phones; pinch still zooms.
            created = leaflet.map(containerRef.current, { scrollWheelZoom: false, dragging: !leaflet.Browser.mobile });

            tileRef.current = leaflet
                .tileLayer(TILES.light, {
                    attribution: 'Tiles &copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community',
                    maxNativeZoom: 16,
                    maxZoom: 18,
                })
                .addTo(created);

            leafletRef.current = leaflet;
            mapRef.current = created;
            setMapReady(true);
        });

        return () => {
            cancelled = true;
            created?.remove();
            mapRef.current = null;
            tileRef.current = null;
        };
    }, []);

    useEffect(() => {
        tileRef.current?.setUrl(isDark ? TILES.dark : TILES.light);
    }, [isDark, mapReady]);

    const fit = (mode: 'active' | 'city') => {
        const map = mapRef.current;
        const all = layerRef.current;
        const active = activeGroupRef.current;

        if (!map || !all) {
            return;
        }

        const target = mode === 'active' && active && active.getLayers().length > 0 ? active.getBounds() : all.getBounds();
        map.fitBounds(target.pad(0.2));
    };

    // Fetch the boundary shapes once, then just restyle the existing layer
    // whenever the data or the selected metric changes.
    useEffect(() => {
        const map = mapRef.current;
        const leaflet = leafletRef.current;

        if (!map || !leaflet) {
            return;
        }

        const render = (geojson: GeoJSON.FeatureCollection) => {
            const byName = new Map(barangays.map((b) => [normalizeBarangayName(b.name), b]));
            const shapes = new Map<number, L.Path>();
            const activeShapes: L.Layer[] = [];

            layerRef.current?.remove();

            const layer = leaflet.geoJSON(geojson, {
                style: (feature) => {
                    const match = byName.get(normalizeBarangayName(feature?.properties?.brgy_name ?? ''));

                    if (!match) {
                        return {
                            fillColor: noDataFill,
                            fillOpacity: 0.3,
                            color: isDark ? '#5b6b8a' : '#94a3b8',
                            weight: 0.8,
                        };
                    }

                    return {
                        fillColor: DENSITY_STEPS[stepFor(valueFor(match), bounds)],
                        fillOpacity: 0.8,
                        color: '#ffffff',
                        weight: 1.5,
                    };
                },
                onEachFeature: (feature, featureLayer) => {
                    const label = feature?.properties?.brgy_name ?? 'Unknown barangay';
                    const match = byName.get(normalizeBarangayName(label));

                    if (!match) {
                        featureLayer.bindTooltip(`<strong>${label}</strong><br>Not yet using resiTrack`);
                        featureLayer.on('click', () => featureLayer.openTooltip());

                        return;
                    }

                    const value = valueFor(match);
                    const step = stepFor(value, bounds);
                    const onDark = step >= 2;
                    const short = match.name.replace(/^Barangay\s+/i, 'Brgy ');

                    // Printed on the shape itself so the numbers do not depend on hover (or on a
                    // finger tap): dark text on light steps, white on dark ones.
                    featureLayer.bindTooltip(
                        `<span style="color:${onDark ? '#fff' : '#0b1f4d'};text-shadow:${onDark ? '0 0 3px rgba(4,15,45,.9)' : '0 0 3px rgba(255,255,255,.95)'}">${short}<br><b>${value.toLocaleString()}</b></span>`,
                        { permanent: true, direction: 'center', className: 'heat-label', interactive: false },
                    );

                    shapes.set(match.id, featureLayer as L.Path);
                    activeShapes.push(featureLayer);

                    featureLayer.on('mouseover', () => onHighlight?.(match.id));
                    featureLayer.on('mouseout', () => onHighlight?.(null));
                    featureLayer.on('click', () => (onSelect ? onSelect(match.id) : undefined));
                },
            }).addTo(map);

            layerRef.current = layer;
            activeGroupRef.current = leaflet.featureGroup(activeShapes);
            shapesRef.current = shapes;

            if (!geojsonRef.current) {
                fit(view);
            }

            geojsonRef.current = geojson;
        };

        if (geojsonRef.current) {
            render(geojsonRef.current);

            return;
        }

        let cancelled = false;
        fetch('/data/cdo-barangays.geojson')
            .then((res) => res.json())
            .then((geojson: GeoJSON.FeatureCollection) => {
                if (!cancelled) {
                    render(geojson);
                }
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [barangays, metric, noDataFill, isDark, mapReady]);

    // Table row hover lights up its shape.
    useEffect(() => {
        shapesRef.current.forEach((shape, id) => {
            const on = id === highlightId;
            shape.setStyle({ weight: on ? 3.5 : 1.5, color: on ? '#0b1f4d' : '#ffffff' });

            if (on) {
                shape.bringToFront();
            }
        });
    }, [highlightId]);

    const changeView = (next: 'active' | 'city') => {
        setView(next);
        fit(next);
    };

    const hasActive = barangays.length > 0;

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <div className="space-y-2">
                {/* isolate: Leaflet's panes and controls use z-index up to 1000 internally.
                    Without their own stacking context they paint over the mobile
                    menu drawer, dialogs and dropdowns. */}
                <div
                    ref={containerRef}
                    role="region"
                    aria-label={`Map of barangays colored by ${metricLabel.toLowerCase()}. The table beside it lists the same numbers.`}
                    className="isolate h-[380px] w-full overflow-hidden rounded-lg border lg:h-[540px]"
                />
                <p className="text-xs text-muted-foreground">
                    Barangay boundaries: Philippine Statistics Authority (PSA), via{' '}
                    <a href="https://georisk.gov.ph" target="_blank" rel="noreferrer" className="underline">
                        GeoRisk Philippines
                    </a>
                    .
                </p>
            </div>

            <div className="flex min-w-0 flex-col gap-4">
                <div className="space-y-4 rounded-lg border p-4">
                    <p className="text-sm font-medium">Concentration by barangay</p>

                    <div className="space-y-1.5">
                        <label htmlFor="heatmap-metric" className="text-xs text-muted-foreground">
                            Color by
                        </label>
                        <Select value={metric} onValueChange={setMetric}>
                            <SelectTrigger id="heatmap-metric" className="w-full" aria-label="Color the map by">
                                <SelectValue />
                            </SelectTrigger>
                            {/* Leaflet's own panes reach z-index 700 internally, above this
                                dropdown's default z-50, without this it opens visually
                                behind the map instead of over it. */}
                            <SelectContent className="z-[1000]">
                                <SelectItem value="residents">All residents</SelectItem>
                                {sectorOptions.map((s) => (
                                    <SelectItem key={s.code} value={s.code}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {hasActive && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => changeView(view === 'active' ? 'city' : 'active')}
                        >
                            {view === 'active' ? 'Show whole city' : 'Focus on active barangays'}
                        </Button>
                    )}

                    <div className="text-xs text-muted-foreground">
                        <p className="mb-1.5 font-medium text-foreground">{metricLabel}</p>
                        <div className="flex">
                            {DENSITY_STEPS.map((color, i) => {
                                const lo = i === 0 ? 0 : bounds[i] + 1;
                                const hi = bounds[i + 1];

                                if (i > 0 && lo > hi) {
                                    return null;
                                }

                                return (
                                    <div key={color} className="flex min-w-0 flex-1 flex-col items-stretch">
                                        <span className="block h-3" style={{ backgroundColor: color }} />
                                        <span className="mt-1 text-center text-[11px] tabular-nums">
                                            {lo === hi ? lo.toLocaleString() : `${lo.toLocaleString()}-${hi.toLocaleString()}`}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <span className="mt-3 flex items-center gap-1.5">
                            <span className="inline-block size-3 rounded-sm border border-slate-400" style={{ backgroundColor: noDataFill }} />
                            Not yet using resiTrack
                        </span>
                    </div>
                </div>

                {aside}
            </div>
        </div>
    );
}
