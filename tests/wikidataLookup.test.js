import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseSparqlResults, lookupPlants } from '../src/features/catalog/wikidataLookup.js';

// ── normaliseSparqlResults (pure, no network) ────────────────────────────────

const SAMPLE_RESPONSE = {
    results: {
        bindings: [
            {
                item:      { value: 'http://www.wikidata.org/entity/Q235' },
                itemLabel: { value: 'Solanum lycopersicum' },
                commonName:{ value: 'tomato' },
                gbifId:    { value: '2930137' },
            },
            {
                // second row for the same item — extra common name
                item:      { value: 'http://www.wikidata.org/entity/Q235' },
                itemLabel: { value: 'Solanum lycopersicum' },
                commonName:{ value: 'garden tomato' },
                gbifId:    { value: '2930137' },
            },
            {
                item:      { value: 'http://www.wikidata.org/entity/Q12345' },
                itemLabel: { value: 'Solanum pimpinellifolium' },
                // no commonName or gbifId in this row
            },
        ],
    },
};

test('normaliseSparqlResults deduplicates rows by item ID', () => {
    const results = normaliseSparqlResults(SAMPLE_RESPONSE);
    assert.equal(results.length, 2);
});

test('normaliseSparqlResults merges commonNames for the same item', () => {
    const [tomato] = normaliseSparqlResults(SAMPLE_RESPONSE);
    assert.ok(tomato.commonNames.includes('tomato'));
    assert.ok(tomato.commonNames.includes('garden tomato'));
    assert.equal(tomato.commonNames.length, 2);
});

test('normaliseSparqlResults populates scientificName and gbifId', () => {
    const [tomato] = normaliseSparqlResults(SAMPLE_RESPONSE);
    assert.equal(tomato.scientificName, 'Solanum lycopersicum');
    assert.equal(tomato.gbifId, '2930137');
});

test('normaliseSparqlResults handles missing optional fields', () => {
    const [, cherry] = normaliseSparqlResults(SAMPLE_RESPONSE);
    assert.equal(cherry.commonNames.length, 0);
    assert.equal(cherry.gbifId, null);
});

test('normaliseSparqlResults returns [] for empty bindings', () => {
    assert.deepEqual(normaliseSparqlResults({ results: { bindings: [] } }), []);
});

test('normaliseSparqlResults returns [] for malformed input', () => {
    assert.deepEqual(normaliseSparqlResults(null), []);
    assert.deepEqual(normaliseSparqlResults({}), []);
    assert.deepEqual(normaliseSparqlResults({ results: null }), []);
});

// ── lookupPlants (stub fetch) ────────────────────────────────────────────────

function makeFetchStub(response, { ok = true, status = 200 } = {}) {
    return async () => ({
        ok,
        status,
        statusText: ok ? 'OK' : 'Bad Request',
        json: async () => response,
    });
}

test('lookupPlants returns empty array for blank query', async () => {
    const results = await lookupPlants('   ', { fetchFn: makeFetchStub(SAMPLE_RESPONSE) });
    assert.deepEqual(results, []);
});

test('lookupPlants returns normalised candidates on success', async () => {
    const results = await lookupPlants('tomato', { fetchFn: makeFetchStub(SAMPLE_RESPONSE) });
    assert.equal(results.length, 2);
    assert.equal(results[0].scientificName, 'Solanum lycopersicum');
});

test('lookupPlants throws on non-ok HTTP response', async () => {
    await assert.rejects(
        () => lookupPlants('tomato', { fetchFn: makeFetchStub({}, { ok: false, status: 500 }) }),
        /Wikidata SPARQL error/,
    );
});

test('lookupPlants throws timeout error when fetch aborts', async () => {
    const slowFetch = () => new Promise((_, reject) => {
        const err = new Error('aborted');
        err.name = 'AbortError';
        reject(err);
    });
    await assert.rejects(
        () => lookupPlants('tomato', { fetchFn: slowFetch, timeoutMs: 1 }),
        /timed out/,
    );
});
