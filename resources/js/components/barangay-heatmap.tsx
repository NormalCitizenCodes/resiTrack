import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
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

function normalizeBarangayName(name: string): string {
    return name
        .replace(/\s*\((Pob\.|Capital)\)\s*$/i, '')
        .trim()
        .toLowerCase();
}

function colorForValue(value: number, max: number): string {
    if (max <= 0 || value <= 0) {
        return DENSITY_STEPS[0];
    }

    const ratio = Math.min(1, value / max);
    const index = Math.min(DENSITY_STEPS.length - 1, Math.floor(ratio * DENSITY_STEPS.length));

    return DENSITY_STEPS[index];
}

// Matches --muted in resources/css/app.css (light and dark blocks).
const NO_DATA_FILL_LIGHT = '#eef2f7';
const NO_DATA_FILL_DARK = '#1a2a49';

export function BarangayHeatmap({ barangays }: { barangays: BarangaySummary[] }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const layerRef = useRef<L.GeoJSON | null>(null);
    const geojsonRef = useRef<GeoJSON.FeatureCollection | null>(null);
    const [metric, setMetric] = useState('residents');
    const { resolvedAppearance } = useAppearance();
    const noDataFill = resolvedAppearance === 'dark' ? NO_DATA_FILL_DARK : NO_DATA_FILL_LIGHT;

    const sectorOptions = barangays[0]?.sector_counts ?? [];

    const valueFor = (barangay: BarangaySummary): number => {
        if (metric === 'residents') {
            return barangay.residents;
        }

        return barangay.sector_counts.find((s) => s.code === metric)?.count ?? 0;
    };

    // Create the map once; never re-run on data/metric changes.
    useEffect(() => {
        if (!containerRef.current || mapRef.current) {
            return;
        }

        const map = L.map(containerRef.current, { scrollWheelZoom: false });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 18,
        }).addTo(map);

        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

    // Fetch the boundary shapes once, then just restyle the existing layer
    // whenever the data or the selected metric changes.
    useEffect(() => {
        const map = mapRef.current;

        if (!map) {
            return;
        }

        const render = (geojson: GeoJSON.FeatureCollection) => {
            const byName = new Map(barangays.map((b) => [normalizeBarangayName(b.name), b]));
            const maxValue = Math.max(1, ...barangays.map((b) => valueFor(b)));

            layerRef.current?.remove();

            const layer = L.geoJSON(geojson, {
                style: (feature) => {
                    const match = byName.get(normalizeBarangayName(feature?.properties?.brgy_name ?? ''));

                    return {
                        fillColor: match ? colorForValue(valueFor(match), maxValue) : noDataFill,
                        fillOpacity: match ? 0.75 : 0.35,
                        color: '#ffffff',
                        weight: 1,
                    };
                },
                onEachFeature: (feature, featureLayer) => {
                    const label = feature?.properties?.brgy_name ?? 'Unknown barangay';
                    const match = byName.get(normalizeBarangayName(label));
                    const metricLabel = metric === 'residents' ? 'residents' : (sectorOptions.find((s) => s.code === metric)?.name ?? metric);

                    featureLayer.bindTooltip(
                        match ? `<strong>${label}</strong><br>${valueFor(match).toLocaleString()} ${metricLabel}` : `<strong>${label}</strong><br>Not yet using resiTrack`,
                    );
                },
            }).addTo(map);

            layerRef.current = layer;

            if (!geojsonRef.current) {
                map.fitBounds(layer.getBounds());
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
    }, [barangays, metric, noDataFill]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Concentration by barangay</p>
                <Select value={metric} onValueChange={setMetric}>
                    <SelectTrigger className="w-[200px]">
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

            <div ref={containerRef} className="h-[420px] w-full overflow-hidden rounded-lg border" />

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                    <span className="inline-block size-3 rounded-sm" style={{ backgroundColor: DENSITY_STEPS[0] }} />
                    Low
                </span>
                <span className="flex items-center gap-1">
                    <span className="inline-block size-3 rounded-sm" style={{ backgroundColor: DENSITY_STEPS[DENSITY_STEPS.length - 1] }} />
                    High
                </span>
                <span className="flex items-center gap-1">
                    <span className="inline-block size-3 rounded-sm opacity-50" style={{ backgroundColor: noDataFill }} />
                    Not yet using resiTrack
                </span>
            </div>

            <p className="text-xs text-muted-foreground">
                Barangay boundaries: Philippine Statistics Authority (PSA), via{' '}
                <a href="https://georisk.gov.ph" target="_blank" rel="noreferrer" className="underline">
                    GeoRisk Philippines
                </a>
                .
            </p>
        </div>
    );
}
