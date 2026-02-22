import test from 'node:test';
import assert from 'node:assert/strict';
import {
    createPlannerInitialState,
    plannerActionTypes,
    plannerReducer,
} from '../src/features/planner/planReducer.js';
import { parseGardenPlanText } from '../src/features/planner/planSchema.js';

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
        items: [{ id: 1, type: 'plant', name: 'Tomato', x: 0, y: 0, itemId: 'tomato' }],
    };

    const result = parseGardenPlanText(JSON.stringify(plan));
    assert.equal(result.ok, true);
    assert.equal(result.plan.width, 10);
    assert.equal(result.plan.length, 12);
    assert.equal(result.plan.items.length, 1);
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
