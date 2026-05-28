import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFootprint, CELL_INCHES, EMPTY_CELL } from '../src/features/beds/footprint.js';

const TOMATO = { id: 'tomato', name: 'Tomato', icon: '🍅', spacingInches: 24 };
const CARROT = { id: 'carrot', name: 'Carrot', icon: '🥕', spacingInches: 3  };
const BASIL  = { id: 'basil',  name: 'Basil',  icon: '🌿', spacingInches: 12 };

const PLANTS = { tomato: TOMATO, carrot: CARROT, basil: BASIL };

test('empty bed: all cells empty, empty legend, no overflow', () => {
    const r = computeFootprint({
        bed: { widthFt: 4, lengthFt: 8 },
        plantings: [],
        plantsById: PLANTS,
    });
    assert.equal(r.gridCols, 8);
    assert.equal(r.gridRows, 16);
    assert.equal(r.cells.length, 16);
    assert.equal(r.cells[0].length, 8);
    assert.ok(r.cells.every((row) => row.every((c) => c === EMPTY_CELL)));
    assert.deepEqual(r.legend, []);
    assert.deepEqual(r.overflow, []);
});

test('single carrot fits in a 4x8 bed with no overflow', () => {
    const r = computeFootprint({
        bed: { widthFt: 4, lengthFt: 8 },
        plantings: [{ plantId: 'carrot', quantity: 5 }],
        plantsById: PLANTS,
    });
    const filled = r.cells.flat().filter((c) => c === '🥕').length;
    assert.equal(filled, 5);
    assert.deepEqual(r.legend, [{ plantId: 'carrot', name: 'Carrot', icon: '🥕', requested: 5, placed: 5 }]);
    assert.deepEqual(r.overflow, []);
});

test('carrots overflow when quantity exceeds grid cells', () => {
    const r = computeFootprint({
        bed: { widthFt: 2, lengthFt: 2 },
        plantings: [{ plantId: 'carrot', quantity: 20 }],
        plantsById: PLANTS,
    });
    const placed = r.cells.flat().filter((c) => c === '🥕').length;
    assert.equal(placed, 16);
    assert.deepEqual(r.legend, [{ plantId: 'carrot', name: 'Carrot', icon: '🥕', requested: 20, placed: 16 }]);
    assert.deepEqual(r.overflow, [{ plantId: 'carrot', name: 'Carrot', missing: 4 }]);
});

test('multiple plants are placed big-spacing-first (deterministic)', () => {
    const r = computeFootprint({
        bed: { widthFt: 4, lengthFt: 4 },
        plantings: [
            { plantId: 'carrot', quantity: 10 },
            { plantId: 'tomato', quantity: 1 },
        ],
        plantsById: PLANTS,
    });
    const flat = r.cells.flat();
    const firstFilled = flat.find((c) => c !== EMPTY_CELL);
    assert.equal(firstFilled, '🍅');
    assert.deepEqual(r.legend.map((e) => e.plantId), ['tomato', 'carrot']);
});

test('mixed sizes: tomato + basil + carrot all appear with correct counts', () => {
    const r = computeFootprint({
        bed: { widthFt: 4, lengthFt: 8 },
        plantings: [
            { plantId: 'tomato', quantity: 2 },
            { plantId: 'basil',  quantity: 4 },
            { plantId: 'carrot', quantity: 20 },
        ],
        plantsById: PLANTS,
    });
    const counts = r.cells.flat().reduce((acc, c) => {
        if (c !== EMPTY_CELL) acc[c] = (acc[c] || 0) + 1;
        return acc;
    }, {});
    assert.equal(counts['🍅'], 32);  // 2 × 16
    assert.equal(counts['🌿'], 16);  // 4 × 4
    assert.equal(counts['🥕'], 20);  // 20 × 1
    assert.equal(r.overflow.length, 0);
});

test('bed dimensions floor to whole cells (3x7 -> 6x14)', () => {
    const r = computeFootprint({
        bed: { widthFt: 3, lengthFt: 7 },
        plantings: [],
        plantsById: PLANTS,
    });
    assert.equal(r.gridCols, 6);
    assert.equal(r.gridRows, 14);
});

test('exported constants match spec values', () => {
    assert.equal(CELL_INCHES, 6);
    assert.equal(EMPTY_CELL, '·');
});
