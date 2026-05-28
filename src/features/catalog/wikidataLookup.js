/**
 * Wikidata SPARQL plant-lookup helper.
 *
 * Queries the public Wikidata SPARQL endpoint for plant taxa matching a
 * free-text name. Returns a normalised array of candidate records that can
 * populate an AddPlantForm.
 *
 * The `fetchFn` parameter defaults to the global `fetch` but can be replaced
 * in tests with a stub — keeping the module DI-friendly and network-free in
 * unit tests.
 */

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

const SPARQL_QUERY = (name) => `
SELECT DISTINCT ?item ?itemLabel ?commonName ?gbifId WHERE {
  ?item wdt:P31/wdt:P279* wd:Q756 .
  ?item rdfs:label ?itemLabel .
  FILTER(LANG(?itemLabel) = "en")
  FILTER(CONTAINS(LCASE(?itemLabel), LCASE("${name.replace(/"/g, '')}")))
  OPTIONAL { ?item wdt:P1843 ?commonName . FILTER(LANG(?commonName) = "en") }
  OPTIONAL { ?item wdt:P846 ?gbifId }
}
LIMIT 10
`.trim();

/**
 * @typedef {{ id: string, scientificName: string, commonNames: string[], gbifId: string|null }} PlantCandidate
 */

/**
 * Search Wikidata for plant taxa matching `query`.
 *
 * @param {string} query - free-text plant name (e.g. "tomato", "Solanum lycopersicum")
 * @param {{ fetchFn?: typeof fetch, timeoutMs?: number }} opts
 * @returns {Promise<PlantCandidate[]>}
 */
export async function lookupPlants(query, { fetchFn = fetch, timeoutMs = 8000 } = {}) {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const url = new URL(SPARQL_ENDPOINT);
    url.searchParams.set('query', SPARQL_QUERY(trimmed));
    url.searchParams.set('format', 'json');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
        response = await fetchFn(url.toString(), {
            signal: controller.signal,
            headers: { Accept: 'application/sparql-results+json' },
        });
    } catch (err) {
        if (err.name === 'AbortError') throw new Error('Wikidata lookup timed out.');
        throw err;
    } finally {
        clearTimeout(timer);
    }

    if (!response.ok) {
        throw new Error(`Wikidata SPARQL error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return normaliseSparqlResults(data);
}

/**
 * Parse the raw SPARQL JSON bindings into PlantCandidate objects.
 * Exported separately so it can be unit-tested without network access.
 *
 * @param {object} sparqlJson - raw Wikidata SPARQL JSON response
 * @returns {PlantCandidate[]}
 */
export function normaliseSparqlResults(sparqlJson) {
    const bindings = sparqlJson?.results?.bindings;
    if (!Array.isArray(bindings)) return [];

    const byId = new Map();

    for (const row of bindings) {
        const id = row.item?.value;
        if (!id) continue;

        if (!byId.has(id)) {
            byId.set(id, {
                id,
                scientificName: row.itemLabel?.value ?? id,
                commonNames: [],
                gbifId: row.gbifId?.value ?? null,
            });
        }

        const candidate = byId.get(id);
        const cn = row.commonName?.value;
        if (cn && !candidate.commonNames.includes(cn)) {
            candidate.commonNames.push(cn);
        }
        if (!candidate.gbifId && row.gbifId?.value) {
            candidate.gbifId = row.gbifId.value;
        }
    }

    return [...byId.values()];
}
