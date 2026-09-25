import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type AddressValue = {
    region: string;
    province: string;
    city: string;
    barangay: string;
    street: string;
    zip: string;
};

export const emptyAddress: AddressValue = { region: '', province: '', city: '', barangay: '', street: '', zip: '' };

type Place = { code: string; name: string; level: 'r' | 'p' | 'c' | 'b' };

// The lists never change, so each is fetched once per page load and reused.
const cache = new Map<string, Promise<Place[]>>();

function loadPlaces(url: string): Promise<Place[]> {
    const known = cache.get(url);

    if (known) {
        return known;
    }

    const request = fetch(url, { headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' })
        .then((response) => (response.ok ? (response.json() as Promise<Place[]>) : []))
        .catch(() => {
            cache.delete(url);

            return [] as Place[];
        });

    cache.set(url, request);

    return request;
}

function usePlaces(url: string | null): { places: Place[]; loading: boolean } {
    const [state, setState] = useState<{ url: string | null; places: Place[] }>({ url: null, places: [] });

    useEffect(() => {
        if (!url) {
            return;
        }

        let cancelled = false;

        loadPlaces(url).then((places) => {
            if (!cancelled) {
                setState({ url, places });
            }
        });

        return () => {
            cancelled = true;
        };
    }, [url]);

    const ready = url !== null && state.url === url;

    return { places: ready ? state.places : [], loading: url !== null && !ready };
}

const DIRECT = '__direct__';

function PlaceSelect({
    id,
    label,
    value,
    places,
    loading,
    disabled,
    placeholder,
    onChange,
    extra,
}: {
    id: string;
    label: string;
    value: string;
    places: Place[];
    loading: boolean;
    disabled?: boolean;
    placeholder: string;
    onChange: (code: string) => void;
    extra?: { value: string; label: string };
}) {
    return (
        <div className="grid min-w-0 gap-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Select value={value} onValueChange={onChange} disabled={disabled || loading}>
                <SelectTrigger id={id} className="w-full overflow-hidden">
                    <SelectValue placeholder={loading ? 'Loading...' : placeholder} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                    {extra && <SelectItem value={extra.value}>{extra.label}</SelectItem>}
                    {places.map((place) => (
                        <SelectItem key={place.code} value={place.code}>
                            {place.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

/**
 * Region > province > city or municipality > barangay, then street and zip,
 * picked from the PSA's PSGC lists instead of typed. Lists load level by level
 * as the choices above them are made. Regions with no provinces (Metro Manila)
 * skip the province step, and independent cities that sit under no province
 * are offered as their own choice.
 */
export function AddressPicker({
    idPrefix,
    value,
    onChange,
    error,
    showBarangay = true,
    showStreetAndZip = true,
    streetLabel = 'House no., street or purok',
}: {
    idPrefix: string;
    value: AddressValue;
    onChange: (next: AddressValue) => void;
    error?: string;
    showBarangay?: boolean;
    showStreetAndZip?: boolean;
    streetLabel?: string;
}) {
    const regions = usePlaces('/psgc/regions');
    const underRegion = usePlaces(value.region ? `/psgc/${value.region}/children` : null);
    const underProvince = usePlaces(value.province ? `/psgc/${value.province}/children` : null);
    const barangays = usePlaces(showBarangay && value.city ? `/psgc/${value.city}/children` : null);

    const provinces = underRegion.places.filter((place) => place.level === 'p');
    const directCities = underRegion.places.filter((place) => place.level === 'c');
    const hasProvinces = provinces.length > 0;
    const [direct, setDirect] = useState(value.province === '' && value.city !== '');

    const cities = value.province ? underProvince.places.filter((place) => place.level === 'c') : hasProvinces && !direct ? [] : directCities;
    const provinceValue = value.province || (direct ? DIRECT : '');

    const pickRegion = (region: string) => {
        setDirect(false);
        onChange({ ...value, region, province: '', city: '', barangay: '' });
    };

    const pickProvince = (province: string) => {
        if (province === DIRECT) {
            setDirect(true);
            onChange({ ...value, province: '', city: '', barangay: '' });

            return;
        }

        setDirect(false);
        onChange({ ...value, province, city: '', barangay: '' });
    };

    const pickCity = (city: string) => onChange({ ...value, city, barangay: '' });

    return (
        <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
                <PlaceSelect
                    id={`${idPrefix}-region`}
                    label="Region"
                    value={value.region}
                    places={regions.places}
                    loading={regions.loading}
                    placeholder="Select region"
                    onChange={pickRegion}
                />
                {hasProvinces || underRegion.loading ? (
                    <PlaceSelect
                        id={`${idPrefix}-province`}
                        label="Province"
                        value={provinceValue}
                        places={provinces}
                        loading={underRegion.loading}
                        disabled={!value.region}
                        placeholder="Select province"
                        onChange={pickProvince}
                        extra={directCities.length > 0 ? { value: DIRECT, label: 'No province (independent city)' } : undefined}
                    />
                ) : (
                    <div className="grid min-w-0 gap-1.5">
                        <Label htmlFor={`${idPrefix}-province`}>Province</Label>
                        <Input id={`${idPrefix}-province`} value={value.region ? 'Not applicable' : ''} placeholder="Select region first" disabled readOnly />
                    </div>
                )}
                <PlaceSelect
                    id={`${idPrefix}-city`}
                    label="City / Municipality"
                    value={value.city}
                    places={cities}
                    loading={value.province ? underProvince.loading : underRegion.loading && !!value.region}
                    disabled={!value.region || (hasProvinces && !direct && !value.province)}
                    placeholder="Select city or municipality"
                    onChange={pickCity}
                />
                {showBarangay && (
                    <PlaceSelect
                        id={`${idPrefix}-barangay`}
                        label="Barangay"
                        value={value.barangay}
                        places={barangays.places}
                        loading={barangays.loading}
                        disabled={!value.city}
                        placeholder="Select barangay"
                        onChange={(barangay) => onChange({ ...value, barangay })}
                    />
                )}
            </div>

            {showStreetAndZip && (
                <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                    <div className="grid min-w-0 gap-1.5">
                        <Label htmlFor={`${idPrefix}-street`}>{streetLabel}</Label>
                        <Input id={`${idPrefix}-street`} value={value.street} onChange={(e) => onChange({ ...value, street: e.target.value })} maxLength={150} />
                    </div>
                    <div className="grid min-w-0 gap-1.5">
                        <Label htmlFor={`${idPrefix}-zip`}>Zip code</Label>
                        <Input
                            id={`${idPrefix}-zip`}
                            value={value.zip}
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="9000"
                            onChange={(e) => onChange({ ...value, zip: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        />
                    </div>
                </div>
            )}

            <InputError message={error} />
        </div>
    );
}
