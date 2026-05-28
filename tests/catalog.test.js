import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlantNeighborIds, validatePlantTimingFields } from '../src/features/catalog/catalog.js';

test('all bundled plant neighbor IDs resolve to known plants', () => {
    assert.deepEqual(validatePlantNeighborIds(), []);
});

test('every bundled plant has valid daysToMaturity and startIndoorsWeeksBeforeLastFrost', () => {
    assert.deepEqual(validatePlantTimingFields(), []);
});
