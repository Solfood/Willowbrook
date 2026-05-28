import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFootprint, buildLegend } from '../src/features/beds/footprint.js';

const PLANTS = {
    tomato: { icon: '🍅', spacingInches: 24, name: 'Tomato' },
    basil:  { icon: '🌿', spacingInches: 6,  name: 'Basil' },
    carrot: { icon: '🥕', spacingInches: 3,  name: 'Carrot' },
};

const BED_4x4 = { widthFt: 4, lengthFt: 4 }; // 16 sq ft
const BED_4x8 = { widthFt: 4, lengthFt: 8 }; // 32 sq ft

test('grid has correct dimensions (rows × cols)', () => {
    const { grid, rows, cols } = computeFootprint(BED_4x8, [], PLANTS);
    assert.equal(rows, 8);
    assert.equal(cols, 4);
    assert.equal(grid.length, rows);
    assert.ok(grid.every((row) => row.length === cols));
});

test('empty plantings produce an all-null grid, no overflow', () => {
    const { grid, overflow } = computeFootprint(BED_4x4, [], PLANTS);
    assert.equal(overflow, false);
    assert.ok(grid.flat().every((c) => c === null));
});

test('single tomato (24" = 4 cells) placed at [0][0], no overflow', () => {
    const { grid, overflow } = computeFootprint(
        BED_4x4,
        [{ plantId: 'tomato', quantity: 1 }],
        PLANTS,
    );
    assert.equal(overflow, false);
    assert.deepEqual(grid[0][0], { icon: '🍅', plantId: 'tomato' });
    // next slot should be null (4 cells apart, so cell 1,2,3 are skipped)
    assert.equal(grid[0][1], null);
});

test('4 tomatoes fill all 16 sq ft of 4×4 bed exactly (no overflow)', () => {
    // tomato takes 4 cells, 16/4 = 4 plants fit
    const { grid, overflow } = computeFootprint(
        BED_4x4,
        [{ plantId: 'tomato', quantity: 4 }],
        PLANTS,
    );
    assert.equal(overflow, false);
    const filled = grid.flat().filter(Boolean);
    assert.equal(filled.length, 4);
});

test('5th tomato triggers overflow in 4×4 bed', () => {
    const { overflow } = computeFootprint(
        BED_4x4,
        [{ plantId: 'tomato', quantity: 5 }],
        PLANTS,
    );
    assert.equal(overflow, true);
});

test('basil (6" spacing = 1 cell each) packs densely', () => {
    // 6" → cellsPerPlant = max(1, round((6/12)^2)) = max(1, round(0.25)) = 1
    const { grid, overflow } = computeFootprint(
        BED_4x4,
        [{ plantId: 'basil', quantity: 16 }],
        PLANTS,
    );
    assert.equal(overflow, false);
    assert.equal(grid.flat().filter(Boolean).length, 16);
});

test('overflow triggers for more plants than cells', () => {
    const { overflow } = computeFootprint(
        BED_4x4,
        [{ plantId: 'basil', quantity: 100 }],
        PLANTS,
    );
    assert.equal(overflow, true);
});

test('mixed plantings fill in order (tomato first, then carrot)', () => {
    // 4×4 = 16 cells. 2 tomatoes = 8 cells, remaining 8 for carrots.
    const { grid, overflow } = computeFootprint(
        BED_4x4,
        [
            { plantId: 'tomato', quantity: 2 },
            { plantId: 'carrot', quantity: 4 },
        ],
        PLANTS,
    );
    assert.equal(overflow, false);
    assert.deepEqual(grid[0][0], { icon: '🍅', plantId: 'tomato' });
    assert.deepEqual(grid[1][0], { icon: '🍅', plantId: 'tomato' });
    // cursor after 2 tomatoes = 8; next plants are carrots at cursor 8
    assert.deepEqual(grid[2][0], { icon: '🥕', plantId: 'carrot' });
});

test('unknown plant falls back to 🌿 icon and 12" spacing', () => {
    const { grid } = computeFootprint(
        BED_4x4,
        [{ plantId: 'mystery-herb', quantity: 1 }],
        PLANTS,
    );
    assert.deepEqual(grid[0][0], { icon: '🌿', plantId: 'mystery-herb' });
});

test('zero-quantity planting adds nothing', () => {
    const { grid } = computeFootprint(
        BED_4x4,
        [{ plantId: 'tomato', quantity: 0 }],
        PLANTS,
    );
    assert.ok(grid.flat().every((c) => c === null));
});

test('buildLegend returns unique plants present in grid', () => {
    const { grid } = computeFootprint(
        BED_4x4,
        [
            { plantId: 'tomato', quantity: 2 },
            { plantId: 'basil',  quantity: 2 },
        ],
        PLANTS,
    );
    const legend = buildLegend(grid, PLANTS);
    assert.equal(legend.length, 2);
    assert.ok(legend.some((e) => e.plantId === 'tomato' && e.name === 'Tomato'));
    assert.ok(legend.some((e) => e.plantId === 'basil'  && e.name === 'Basil'));
});

test('buildLegend returns empty array for empty grid', () => {
    const { grid } = computeFootprint(BED_4x4, [], PLANTS);
    assert.deepEqual(buildLegend(grid, PLANTS), []);
});
