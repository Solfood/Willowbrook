import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterPlants, deriveCategoryChips } from '../src/features/library/libraryFilters.js';

const SAMPLE = [
    { id: 'tomato',   name: 'Tomato',  category: 'vegetables', notes: 'support and airflow' },
    { id: 'basil',    name: 'Basil',   category: 'herbs',      notes: 'pinch for branching' },
    { id: 'marigold', name: 'Marigold',category: 'flowers',    notes: 'deters pests' },
    { id: 'u-1', isUserAdded: true, name: 'Yardlong Bean', category: 'vegetables', notes: '' },
];

test('filterPlants returns all when search empty and category null', () => {
    assert.equal(filterPlants(SAMPLE, { search: '', category: null }).length, 4);
});

test('filterPlants matches against name case-insensitively', () => {
    const out = filterPlants(SAMPLE, { search: 'tom', category: null });
    assert.deepEqual(out.map((p) => p.id), ['tomato']);
});

test('filterPlants matches against notes substring', () => {
    const out = filterPlants(SAMPLE, { search: 'airflow', category: null });
    assert.deepEqual(out.map((p) => p.id), ['tomato']);
});

test('filterPlants filters by category', () => {
    const out = filterPlants(SAMPLE, { search: '', category: 'herbs' });
    assert.deepEqual(out.map((p) => p.id), ['basil']);
});

test('filterPlants synthetic "yours" category filters by isUserAdded', () => {
    const out = filterPlants(SAMPLE, { search: '', category: 'yours' });
    assert.deepEqual(out.map((p) => p.id), ['u-1']);
});

test('filterPlants combines search + category (AND)', () => {
    const out = filterPlants(SAMPLE, { search: 'bean', category: 'vegetables' });
    assert.deepEqual(out.map((p) => p.id), ['u-1']);
});

test('filterPlants treats whitespace-only search as empty', () => {
    assert.equal(filterPlants(SAMPLE, { search: '   ', category: null }).length, 4);
});

test('deriveCategoryChips returns sorted unique categories plus "yours" when user plants exist', () => {
    assert.deepEqual(deriveCategoryChips(SAMPLE), ['flowers', 'herbs', 'vegetables', 'yours']);
});

test('deriveCategoryChips omits "yours" when no user plants', () => {
    assert.deepEqual(deriveCategoryChips(SAMPLE.slice(0, 3)), ['flowers', 'herbs', 'vegetables']);
});

test('deriveCategoryChips skips plants with no category', () => {
    const noCat = [...SAMPLE, { id: 'x', name: 'Nameless' }];
    assert.deepEqual(deriveCategoryChips(noCat), ['flowers', 'herbs', 'vegetables', 'yours']);
});
