import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterPlants, getCategories } from '../src/features/library/libraryFilters.js';

const PLANTS = [
    { id: 'tomato',  name: 'Tomato',  category: 'vegetables', notes: 'Needs support and airflow.' },
    { id: 'basil',   name: 'Basil',   category: 'herbs',      notes: 'Great companion.' },
    { id: 'marigold',name: 'Marigold',category: 'flowers',    notes: 'Repels pests.' },
    { id: 'carrot',  name: 'Carrot',  category: 'vegetables', notes: 'Direct sow.' },
    { id: 'custom1', name: 'Yardlong Bean', category: 'vegetables', notes: '', isUserAdded: true },
];

test('filterPlants — no options returns all plants', () => {
    assert.equal(filterPlants(PLANTS).length, PLANTS.length);
});

test('filterPlants — empty query returns all plants', () => {
    assert.equal(filterPlants(PLANTS, { query: '' }).length, PLANTS.length);
});

test('filterPlants — query matches by name (case-insensitive)', () => {
    const results = filterPlants(PLANTS, { query: 'TOMATO' });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'tomato');
});

test('filterPlants — query matches by id substring', () => {
    const results = filterPlants(PLANTS, { query: 'mari' });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'marigold');
});

test('filterPlants — query matches by notes substring', () => {
    const results = filterPlants(PLANTS, { query: 'companion' });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'basil');
});

test('filterPlants — category filter narrows results', () => {
    const results = filterPlants(PLANTS, { category: 'vegetables' });
    assert.equal(results.length, 3);
    assert.ok(results.every((p) => p.category === 'vegetables'));
});

test('filterPlants — combined query + category', () => {
    const results = filterPlants(PLANTS, { query: 'carrot', category: 'vegetables' });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'carrot');
});

test('filterPlants — combined query + wrong category returns empty', () => {
    const results = filterPlants(PLANTS, { query: 'tomato', category: 'herbs' });
    assert.equal(results.length, 0);
});

test('filterPlants — no match returns empty array', () => {
    assert.equal(filterPlants(PLANTS, { query: 'zzz' }).length, 0);
});

test('filterPlants — whitespace-only query treated as empty', () => {
    assert.equal(filterPlants(PLANTS, { query: '   ' }).length, PLANTS.length);
});

test('getCategories — returns sorted unique categories', () => {
    const cats = getCategories(PLANTS);
    assert.deepEqual(cats, ['flowers', 'herbs', 'vegetables']);
});

test('getCategories — skips plants with no category', () => {
    const mixed = [...PLANTS, { id: 'x', name: 'Unknown' }];
    const cats = getCategories(mixed);
    assert.ok(!cats.includes(undefined));
    assert.ok(!cats.includes(null));
});
