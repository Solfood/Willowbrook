import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchPlantsByName, parseWbSearchResponse, WB_SEARCH_URL } from '../src/features/library/wikidataLookup.js';

const HAPPY_FIXTURE = {
    search: [
        { id: 'Q23501', label: 'tomato', description: 'species of plant, vegetable' },
        { id: 'Q165044', label: 'Solanum lycopersicum', description: 'species in the genus Solanum' },
        { id: 'Q11789', label: 'Tomato', description: 'fictional character' },
    ],
    'search-continue': 3,
    success: 1,
};

test('parseWbSearchResponse normalizes the search array to {qid, name, description}', () => {
    const out = parseWbSearchResponse(HAPPY_FIXTURE);
    assert.equal(out.length, 3);
    assert.deepEqual(out[0], { qid: 'Q23501', name: 'tomato', description: 'species of plant, vegetable' });
});

test('parseWbSearchResponse handles a missing description gracefully', () => {
    const out = parseWbSearchResponse({ search: [{ id: 'Qx', label: 'thing' }] });
    assert.equal(out[0].description, '');
});

test('parseWbSearchResponse throws on malformed input', () => {
    assert.throws(() => parseWbSearchResponse(null), /Wikidata/);
    assert.throws(() => parseWbSearchResponse({}), /Wikidata/);
    assert.throws(() => parseWbSearchResponse({ search: 'not an array' }), /Wikidata/);
});

test('WB_SEARCH_URL builds the wbsearchentities URL with origin=* for CORS', () => {
    const url = WB_SEARCH_URL('tomato');
    assert.match(url, /action=wbsearchentities/);
    assert.match(url, /search=tomato/);
    assert.match(url, /origin=%2A|origin=\*/);
    assert.match(url, /language=en/);
    assert.match(url, /format=json/);
});

test('WB_SEARCH_URL URL-encodes the query', () => {
    assert.match(WB_SEARCH_URL('bell pepper'), /search=bell%20pepper|search=bell\+pepper/);
});

test('searchPlantsByName happy path returns normalized results', async () => {
    const fakeFetch = async () => ({ ok: true, status: 200, json: async () => HAPPY_FIXTURE });
    const r = await searchPlantsByName('tomato', { fetch: fakeFetch });
    assert.equal(r.ok, true);
    assert.equal(r.results[0].qid, 'Q23501');
});

test('searchPlantsByName surfaces non-2xx as an error result', async () => {
    const fakeFetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
    const r = await searchPlantsByName('tomato', { fetch: fakeFetch });
    assert.equal(r.ok, false);
    assert.match(r.error, /Wikidata/);
});

test('searchPlantsByName surfaces AbortError as a timeout result', async () => {
    const fakeFetch = async () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; };
    const r = await searchPlantsByName('tomato', { fetch: fakeFetch });
    assert.equal(r.ok, false);
    assert.match(r.error, /timed out|Wikidata/i);
});

test('searchPlantsByName surfaces malformed JSON as an error result', async () => {
    const fakeFetch = async () => ({ ok: true, status: 200, json: async () => ({}) });
    const r = await searchPlantsByName('tomato', { fetch: fakeFetch });
    assert.equal(r.ok, false);
    assert.match(r.error, /Wikidata/);
});

test('searchPlantsByName rejects empty query without hitting the network', async () => {
    let called = false;
    const fakeFetch = async () => { called = true; return { ok: true, json: async () => HAPPY_FIXTURE }; };
    const r = await searchPlantsByName('   ', { fetch: fakeFetch });
    assert.equal(r.ok, false);
    assert.equal(called, false);
});
