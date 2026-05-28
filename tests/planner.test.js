import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createPlannerInitialState,
    plannerActionTypes,
    plannerReducer,
} from '../src/features/planner/planReducer.js';
import { clampPlanItemsToBounds, parseGardenPlanText } from '../src/features/planner/planSchema.js';
import { validatePlantNeighborIds, getPlantingWindow, validatePlantTimingFields } from '../src/features/catalog/catalog.js';

function commit(state, items) {
    return plannerReducer(state, {
        type: plannerActionTypes.COMMIT_ITEMS,
        payload: items,
    });
}

test('createPlannerInitialState seeds history with provided items', () => {
    const seedItems = [{ id: 1, type: 'plant', name: 'Tomato', x: 0, y: 0 }];
    const state = createPlannerInitialState(seedItems);

    assert.deepEqual(state.items, seedItems);
    assert.equal(state.currentHistoryIndex, 0);
    assert.equal(state.history.length, 1);
    assert.deepEqual(state.history[0], seedItems);
});

test('COMMIT/UNDO/REDO transitions keep history consistent', () => {
    const state0 = createPlannerInitialState();
    const items1 = [{ id: 1, type: 'plant', name: 'Tomato', x: 0, y: 0 }];
    const items2 = [...items1, { id: 2, type: 'plant', name: 'Carrot', x: 15, y: 0 }];

    const state1 = commit(state0, items1);
    const state2 = commit(state1, items2);

    assert.equal(state2.currentHistoryIndex, 2);
    assert.deepEqual(state2.items, items2);

    const undone = plannerReducer(state2, { type: plannerActionTypes.UNDO });
    assert.equal(undone.currentHistoryIndex, 1);
    assert.deepEqual(undone.items, items1);

    const redone = plannerReducer(undone, { type: plannerActionTypes.REDO });
    assert.equal(redone.currentHistoryIndex, 2);
    assert.deepEqual(redone.items, items2);
});

test('new commit after undo truncates future history', () => {
    const items1 = [{ id: 1, type: 'plant', name: 'Tomato', x: 0, y: 0 }];
    const items2 = [...items1, { id: 2, type: 'plant', name: 'Carrot', x: 15, y: 0 }];
    const items3 = [{ id: 3, type: 'plant', name: 'Lettuce', x: 30, y: 0 }];

    const state0 = createPlannerInitialState();
    const state1 = commit(state0, items1);
    const state2 = commit(state1, items2);
    const undone = plannerReducer(state2, { type: plannerActionTypes.UNDO });
    const recomputed = commit(undone, items3);

    assert.equal(recomputed.history.length, 3);
    assert.deepEqual(recomputed.history[2], items3);
    assert.equal(recomputed.currentHistoryIndex, 2);
});

test('PICKUP_ITEM only removes selected item from transient items', () => {
    const items = [
        { id: 1, type: 'plant', name: 'Tomato', x: 0, y: 0 },
        { id: 2, type: 'plant', name: 'Carrot', x: 15, y: 0 },
    ];
    const state = commit(createPlannerInitialState(), items);

    const picked = plannerReducer(state, {
        type: plannerActionTypes.PICKUP_ITEM,
        payload: 1,
    });

    assert.equal(picked.items.length, 1);
    assert.equal(picked.items[0].id, 2);
    assert.equal(picked.history.length, state.history.length);
    assert.deepEqual(picked.history[picked.currentHistoryIndex], items);
});

test('RESET_TO_COMMITTED restores transient pickup state', () => {
    const items = [{ id: 1, type: 'plant', name: 'Tomato', x: 0, y: 0 }];
    const state = commit(createPlannerInitialState(), items);
    const picked = plannerReducer(state, {
        type: plannerActionTypes.PICKUP_ITEM,
        payload: 1,
    });

    const reset = plannerReducer(picked, { type: plannerActionTypes.RESET_TO_COMMITTED });
    assert.deepEqual(reset.items, items);
});

test('parseGardenPlanText accepts valid plan', () => {
    const plan = {
        schemaVersion: 1,
        width: 10,
        length: 12,
        zone: '8b',
        items: [{ id: 1, type: 'plant', name: 'Tomato', x: 0, y: 0, itemId: 'tomato' }],
    };

    const result = parseGardenPlanText(JSON.stringify(plan));
    assert.equal(result.ok, true);
    assert.equal(result.plan.width, 10);
    assert.equal(result.plan.length, 12);
    assert.equal(result.plan.zone, '8b');
    assert.equal(result.plan.items.length, 1);
});

test('parseGardenPlanText defaults zone when missing', () => {
    const plan = {
        schemaVersion: 1,
        width: 10,
        length: 12,
        items: [{ id: 1, type: 'plant', name: 'Tomato', x: 0, y: 0, itemId: 'tomato' }],
    };

    const result = parseGardenPlanText(JSON.stringify(plan));
    assert.equal(result.ok, true);
    assert.equal(result.plan.zone, '7a');
});

test('parseGardenPlanText rejects missing dimensions', () => {
    const result = parseGardenPlanText(JSON.stringify({ items: [] }));
    assert.equal(result.ok, false);
    assert.match(result.error, /width and length/);
});

test('parseGardenPlanText rejects malformed structure item', () => {
    const badPlan = {
        width: 10,
        length: 10,
        items: [{ id: 2, type: 'structure', name: 'Raised Bed', x: 0, y: 0, width: 0, length: 4 }],
    };

    const result = parseGardenPlanText(JSON.stringify(badPlan));
    assert.equal(result.ok, false);
    assert.match(result.error, /positive numeric width/);
});

test('parseGardenPlanText rejects invalid zone', () => {
    const badPlan = {
        width: 10,
        length: 10,
        zone: 'north',
        items: [],
    };

    const result = parseGardenPlanText(JSON.stringify(badPlan));
    assert.equal(result.ok, false);
    assert.match(result.error, /USDA-style/);
});

test('parseGardenPlanText clamps out-of-bounds plant coordinates', () => {
    const plan = {
        width: 10,
        length: 10,
        items: [{ id: 'p1', type: 'plant', name: 'Tomato', x: 99999, y: -100, itemId: 'tomato' }],
    };

    const result = parseGardenPlanText(JSON.stringify(plan));
    assert.equal(result.ok, true);
    assert.equal(result.plan.items.length, 1);
    // 10ft world is 300px wide/high, plant occupies 15px.
    assert.equal(result.plan.items[0].x, 285);
    assert.equal(result.plan.items[0].y, 0);
});

test('COMMIT_ITEMS caps history at 50 entries', () => {
    let state = createPlannerInitialState();
    for (let i = 0; i < 51; i++) {
        state = commit(state, [{ id: i, type: 'plant', name: 'Tomato', x: i, y: 0 }]);
    }
    assert.ok(state.history.length <= 50, `history.length should be ≤ 50, got ${state.history.length}`);
    assert.equal(state.currentHistoryIndex, state.history.length - 1);
});

// ── Zone planting window ───────────────────────────────────────────────────

test('getPlantingWindow zone 7a returns unshifted base window', () => {
    // tomato plantingWindow is { start: 3, end: 5 } (April–June)
    const w = getPlantingWindow('tomato', '7a');
    assert.ok(w !== null);
    assert.equal(w.start, 3);
    assert.equal(w.end, 5);
});

test('getPlantingWindow zone 4b shifts +1 month vs zone 7a', () => {
    const base = getPlantingWindow('tomato', '7a');
    const cold = getPlantingWindow('tomato', '4b');
    assert.equal(cold.start, base.start + 1);
    assert.equal(cold.end, base.end + 1);
});

test('getPlantingWindow zone 6b and 7a return same shift (boundary check)', () => {
    const w6b = getPlantingWindow('tomato', '6b');
    const w7a = getPlantingWindow('tomato', '7a');
    assert.equal(w6b.start, w7a.start);
    assert.equal(w6b.end, w7a.end);
});

test('getPlantingWindow zone 8b shifts −1 month vs zone 7a', () => {
    const base = getPlantingWindow('tomato', '7a');
    const warm = getPlantingWindow('tomato', '8b');
    assert.equal(warm.start, base.start - 1);
    assert.equal(warm.end, base.end - 1);
});

test('getPlantingWindow unknown zone falls back to no shift', () => {
    const base = getPlantingWindow('tomato', '7a');
    const unknown = getPlantingWindow('tomato', 'invalid');
    assert.equal(unknown.start, base.start);
    assert.equal(unknown.end, base.end);
});

test('getPlantingWindow returns null for unknown plant id', () => {
    assert.equal(getPlantingWindow('not-a-plant', '7a'), null);
});

test('all plant neighbor IDs reference existing plants', () => {
    const unknowns = validatePlantNeighborIds();
    assert.equal(unknowns.length, 0, `Unknown neighbor IDs found: ${JSON.stringify(unknowns)}`);
});

// ── Move-mode lifecycle ────────────────────────────────────────────────────

test('RESET_TO_COMMITTED after PICKUP restores item to items list', () => {
    const items = [
        { id: 'a', type: 'plant', name: 'Tomato', x: 0, y: 0 },
        { id: 'b', type: 'plant', name: 'Carrot', x: 15, y: 0 },
    ];
    const state = commit(createPlannerInitialState(), items);
    const picked = plannerReducer(state, { type: plannerActionTypes.PICKUP_ITEM, payload: 'a' });
    assert.equal(picked.items.length, 1);

    const reset = plannerReducer(picked, { type: plannerActionTypes.RESET_TO_COMMITTED });
    assert.equal(reset.items.length, 2);
    assert.ok(reset.items.some((i) => i.id === 'a'));
});

test('PICKUP_ITEM when item is already absent is a no-op on history', () => {
    const items = [{ id: 'x', type: 'plant', name: 'Tomato', x: 0, y: 0 }];
    const state = commit(createPlannerInitialState(), items);
    const picked = plannerReducer(state, { type: plannerActionTypes.PICKUP_ITEM, payload: 'x' });

    const pickedAgain = plannerReducer(picked, { type: plannerActionTypes.PICKUP_ITEM, payload: 'x' });
    assert.equal(pickedAgain.history.length, picked.history.length);
    assert.equal(pickedAgain.currentHistoryIndex, picked.currentHistoryIndex);
});

test('LOAD_ITEMS after undo does not corrupt history', () => {
    const items1 = [{ id: 1, type: 'plant', name: 'Tomato', x: 0, y: 0 }];
    const items2 = [{ id: 2, type: 'plant', name: 'Carrot', x: 15, y: 0 }];
    const loaded = [{ id: 3, type: 'plant', name: 'Lettuce', x: 30, y: 0 }];

    let state = createPlannerInitialState();
    state = commit(state, items1);
    state = commit(state, items2);
    state = plannerReducer(state, { type: plannerActionTypes.UNDO });
    state = plannerReducer(state, { type: plannerActionTypes.LOAD_ITEMS, payload: loaded });

    assert.deepEqual(state.items, loaded);
    assert.equal(state.currentHistoryIndex, state.history.length - 1);
    assert.deepEqual(state.history[state.currentHistoryIndex], loaded);
});

test('clampPlanItemsToBounds clamps out-of-bounds structures based on size', () => {
    const items = [
        {
            id: 's1',
            type: 'structure',
            name: 'Raised Bed',
            x: 500,
            y: 500,
            width: 4,
            length: 2,
            subType: 'raised-bed',
        },
    ];

    const result = clampPlanItemsToBounds(items, 10, 10);
    assert.equal(result.ok, true);
    // 10ft world is 300px; structure 4ft x 2ft => 120px x 60px.
    assert.equal(result.items[0].x, 180);
    assert.equal(result.items[0].y, 240);
});

test('every bundled plant has valid daysToMaturity and startIndoorsWeeksBeforeLastFrost', () => {
    const issues = validatePlantTimingFields();
    assert.deepEqual(issues, []);
});
