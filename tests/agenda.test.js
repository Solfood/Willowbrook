import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoToday, addDays, daysBetween } from '../src/features/agenda/agenda.js';

test('isoToday returns YYYY-MM-DD in local time', () => {
    const fixed = new Date(2026, 4, 29, 10, 0, 0);
    assert.equal(isoToday(fixed), '2026-05-29');
});

test('isoToday handles late-evening local time without UTC drift', () => {
    const lateNight = new Date(2026, 4, 29, 23, 30, 0);
    assert.equal(isoToday(lateNight), '2026-05-29');
});

test('addDays advances by N days, crossing month boundaries', () => {
    assert.equal(addDays('2026-01-30', 5), '2026-02-04');
});

test('addDays handles negative N (subtraction)', () => {
    assert.equal(addDays('2026-03-02', -5), '2026-02-25');
});

test('addDays handles leap-year February correctly', () => {
    assert.equal(addDays('2028-02-28', 1), '2028-02-29');
    assert.equal(addDays('2028-02-29', 1), '2028-03-01');
});

test('daysBetween returns signed integer (B - A)', () => {
    assert.equal(daysBetween('2026-05-29', '2026-06-05'), 7);
    assert.equal(daysBetween('2026-06-05', '2026-05-29'), -7);
    assert.equal(daysBetween('2026-05-29', '2026-05-29'), 0);
});
