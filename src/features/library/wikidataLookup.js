const DEFAULT_TIMEOUT_MS = 8000;

export function WB_SEARCH_URL(query, { limit = 5, language = 'en' } = {}) {
    const params = new URLSearchParams({
        action: 'wbsearchentities',
        search: query,
        language,
        format: 'json',
        type: 'item',
        limit: String(limit),
        origin: '*',
    });
    return `https://www.wikidata.org/w/api.php?${params.toString()}`;
}

export function parseWbSearchResponse(payload) {
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.search)) {
        throw new Error('Wikidata response missing "search" array');
    }
    return payload.search.map((item) => ({
        qid: item.id,
        name: item.label ?? '',
        description: item.description ?? '',
    }));
}

export async function searchPlantsByName(query, { fetch: fetchFn = globalThis.fetch, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    const q = String(query ?? '').trim();
    if (!q) return { ok: false, error: 'Enter a plant name to search.' };

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const resp = await fetchFn(WB_SEARCH_URL(q), { signal: controller.signal });
        if (!resp.ok) {
            return { ok: false, error: `Wikidata returned ${resp.status}.` };
        }
        const payload = await resp.json();
        const results = parseWbSearchResponse(payload);
        return { ok: true, results };
    } catch (err) {
        if (err?.name === 'AbortError') {
            return { ok: false, error: 'Wikidata lookup timed out — fill in the plant by hand.' };
        }
        return { ok: false, error: `Wikidata lookup failed: ${err?.message ?? 'unknown error'}` };
    } finally {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', onAbort);
    }
}
