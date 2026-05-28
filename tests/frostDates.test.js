import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrostDateResponse, pickFrostDate } from '../src/features/catalog/frostDates.js';

test('pickFrostDate returns the 50% probability spring frost date', () => {
    const stationResponse = [{
        prob_50: '0415',  // farmsense uses MMDD strings
        prob_90: '0501',
        prob_10: '0401',
    }];
    const date = pickFrostDate(stationResponse, 'spring', 2026);
    assert.equal(date, '2026-04-15');
});

test('pickFrostDate returns null when response is empty', () => {
    assert.equal(pickFrostDate([], 'spring', 2026), null);
    assert.equal(pickFrostDate(null, 'spring', 2026), null);
});

test('parseFrostDateResponse validates a well-formed pair', () => {
    const result = parseFrostDateResponse({
        spring: [{ prob_50: '0415' }],
        fall:   [{ prob_50: '1030' }],
    }, 2026);
    assert.equal(result.ok, true);
    assert.equal(result.lastFrostDate, '2026-04-15');
    assert.equal(result.firstFrostDate, '2026-10-30');
});

test('parseFrostDateResponse fails clearly when spring is missing', () => {
    const result = parseFrostDateResponse({ fall: [{ prob_50: '1030' }] }, 2026);
    assert.equal(result.ok, false);
    assert.match(result.error, /spring/i);
});
