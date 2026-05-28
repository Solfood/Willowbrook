import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlantNeighborIds, validatePlantTimingFields, getAllPlants, getPlantsById } from '../src/features/catalog/catalog.js';

test('all bundled plant neighbor IDs resolve to known plants', () => {
    assert.deepEqual(validatePlantNeighborIds(), []);
});

test('every bundled plant has valid daysToMaturity and startIndoorsWeeksBeforeLastFrost', () => {
    assert.deepEqual(validatePlantTimingFields(), []);
});

test('getAllPlants returns the bundled DB when plan has no customPlants', () => {
    const all = getAllPlants({ customPlants: [] });
    assert.ok(all.length >= 28, 'expected at least the 28 bundled plants');
    assert.ok(all.find((p) => p.id === 'tomato'));
});

test('getAllPlants appends customPlants after bundled plants', () => {
    const custom = { id: 'my-uuid', name: 'Yardlong Bean', isUserAdded: true };
    const all = getAllPlants({ customPlants: [custom] });
    assert.equal(all[all.length - 1], custom);
});

test('getAllPlants tolerates missing plan / missing customPlants', () => {
    assert.ok(getAllPlants().length >= 28);
    assert.ok(getAllPlants({}).length >= 28);
    assert.ok(getAllPlants(null).length >= 28);
});

test('getPlantsById returns an id->plant map merged with customPlants', () => {
    const custom = { id: 'my-uuid', name: 'Yardlong Bean', isUserAdded: true };
    const map = getPlantsById({ customPlants: [custom] });
    assert.equal(map.tomato.id, 'tomato');
    assert.equal(map['my-uuid'], custom);
});

test('getPlantsById gives custom plants precedence over a same-id bundled plant', () => {
    const shadow = { id: 'tomato', name: 'My Tomato', isUserAdded: true };
    const map = getPlantsById({ customPlants: [shadow] });
    assert.equal(map.tomato, shadow);
});
