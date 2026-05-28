const ZIP_LOOKUP_URL = (zip) => `https://api.zippopotam.us/us/${encodeURIComponent(zip)}`;
const STATION_URL = (lat, lon) => `https://api.farmsense.net/v1/frostdates/stations/?lat=${lat}&lon=${lon}`;
const PROBABILITY_URL = (stationId, season) => `https://api.farmsense.net/v1/frostdates/probabilities/?station=${stationId}&season=${season}`;

const DEFAULT_TIMEOUT_MS = 8000;

function timedFetch(url, { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal })
        .finally(() => {
            clearTimeout(timeoutId);
            if (signal) signal.removeEventListener('abort', onAbort);
        });
}

export function pickFrostDate(probabilities, season, year) {
    if (!Array.isArray(probabilities) || probabilities.length === 0) return null;
    const first = probabilities[0];
    const mmdd = first?.prob_50;
    if (typeof mmdd !== 'string' || !/^\d{4}$/.test(mmdd)) return null;
    const month = mmdd.slice(0, 2);
    const day = mmdd.slice(2, 4);
    return `${year}-${month}-${day}`;
}

export function parseFrostDateResponse({ spring, fall }, year) {
    const lastFrostDate = pickFrostDate(spring, 'spring', year);
    if (!lastFrostDate) {
        return { ok: false, error: 'Could not parse spring (last) frost date from API response.' };
    }
    const firstFrostDate = pickFrostDate(fall, 'fall', year);
    if (!firstFrostDate) {
        return { ok: false, error: 'Could not parse fall (first) frost date from API response.' };
    }
    return { ok: true, lastFrostDate, firstFrostDate };
}

export async function fetchFrostDates({ zip, year = new Date().getFullYear() }) {
    if (!/^\d{5}$/.test(String(zip))) {
        return { ok: false, error: 'A 5-digit ZIP code is required to look up frost dates.' };
    }
    try {
        const zipResp = await timedFetch(ZIP_LOOKUP_URL(zip));
        if (!zipResp.ok) return { ok: false, error: 'Could not resolve ZIP to coordinates.' };
        const zipJson = await zipResp.json();
        const place = zipJson?.places?.[0];
        const lat = place?.latitude;
        const lon = place?.longitude;
        if (!lat || !lon) return { ok: false, error: 'ZIP lookup returned no coordinates.' };

        const stationResp = await timedFetch(STATION_URL(lat, lon));
        if (!stationResp.ok) return { ok: false, error: 'Could not find a nearby frost-date station.' };
        const stations = await stationResp.json();
        const stationId = stations?.[0]?.id;
        if (!stationId) return { ok: false, error: 'No frost-date stations near that ZIP.' };

        const [springResp, fallResp] = await Promise.all([
            timedFetch(PROBABILITY_URL(stationId, 1)),
            timedFetch(PROBABILITY_URL(stationId, 2)),
        ]);
        if (!springResp.ok || !fallResp.ok) {
            return { ok: false, error: 'Frost-date probability lookup failed.' };
        }
        const [spring, fall] = await Promise.all([springResp.json(), fallResp.json()]);
        return parseFrostDateResponse({ spring, fall }, year);
    } catch (err) {
        if (err?.name === 'AbortError') {
            return { ok: false, error: 'Frost-date lookup timed out — please enter dates manually.' };
        }
        return { ok: false, error: 'Frost-date lookup failed — please enter dates manually.' };
    }
}
