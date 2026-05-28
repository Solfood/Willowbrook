import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyPlan, validatePlanFile, SCHEMA_VERSION } from '../src/features/plan/planSchema.js';

test('SCHEMA_VERSION is 2', () => {
    assert.equal(SCHEMA_VERSION, 2);
});

test('createEmptyPlan returns a valid v2 plan', () => {
    const plan = createEmptyPlan({
        name: 'Backyard',
        zone: '7a',
        zip: '30301',
        lastFrostDate: '2026-04-15',
        firstFrostDate: '2026-10-30',
    });
    assert.equal(plan.schemaVersion, 2);
    assert.equal(plan.garden.name, 'Backyard');
    assert.equal(plan.garden.zone, '7a');
    assert.equal(plan.garden.lastFrostDate, '2026-04-15');
    assert.deepEqual(plan.beds, []);
    assert.deepEqual(plan.plantings, []);
    assert.deepEqual(plan.journal, []);
    assert.deepEqual(plan.customPlants, []);
});

test('createEmptyPlan defaults name to "My Garden" when omitted', () => {
    const plan = createEmptyPlan({ zone: '7a', zip: null, lastFrostDate: '2026-04-15', firstFrostDate: '2026-10-30' });
    assert.equal(plan.garden.name, 'My Garden');
});

test('validatePlanFile accepts an empty v2 plan', () => {
    const plan = createEmptyPlan({ zone: '7a', zip: null, lastFrostDate: '2026-04-15', firstFrostDate: '2026-10-30' });
    const result = validatePlanFile(plan);
    assert.equal(result.ok, true);
});

test('validatePlanFile rejects v1 plan (no schemaVersion)', () => {
    const v1 = { width: 10, length: 10, zone: '7a', items: [] };
    const result = validatePlanFile(v1);
    assert.equal(result.ok, false);
    assert.match(result.error, /older version/i);
});

test('validatePlanFile rejects malformed plan', () => {
    const result = validatePlanFile({ schemaVersion: 2, garden: null });
    assert.equal(result.ok, false);
});

test('validatePlanFile rejects non-object', () => {
    assert.equal(validatePlanFile(null).ok, false);
    assert.equal(validatePlanFile('hi').ok, false);
});
