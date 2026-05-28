import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, plannerReducer, actions, MAX_HISTORY } from '../src/features/plan/planReducer.js';
import { createEmptyPlan } from '../src/features/plan/planSchema.js';

function freshState() {
    const plan = createEmptyPlan({
        zone: '7a', zip: null,
        lastFrostDate: '2026-04-15',
        firstFrostDate: '2026-10-30',
    });
    return createInitialState(plan);
}

test('createInitialState seeds history with the plan', () => {
    const state = freshState();
    assert.equal(state.plan.schemaVersion, 2);
    assert.equal(state.history.length, 1);
    assert.equal(state.currentHistoryIndex, 0);
});

test('ADD_BED appends a bed and grows history', () => {
    const state = plannerReducer(freshState(), actions.addBed({
        id: 'bed-1', name: 'Backyard West', widthFt: 4, lengthFt: 8,
    }));
    assert.equal(state.plan.beds.length, 1);
    assert.equal(state.plan.beds[0].name, 'Backyard West');
    assert.equal(state.history.length, 2);
});

test('UPDATE_BED patches fields', () => {
    let s = plannerReducer(freshState(), actions.addBed({ id: 'b1', name: 'A', widthFt: 4, lengthFt: 4 }));
    s = plannerReducer(s, actions.updateBed('b1', { name: 'A2', widthFt: 4, lengthFt: 8 }));
    assert.equal(s.plan.beds[0].name, 'A2');
    assert.equal(s.plan.beds[0].lengthFt, 8);
});

test('REMOVE_BED removes bed and its plantings + journal', () => {
    let s = plannerReducer(freshState(), actions.addBed({ id: 'b1', name: 'A', widthFt: 4, lengthFt: 4 }));
    s = plannerReducer(s, actions.addPlanting({ id: 'p1', bedId: 'b1', plantId: 'tomato', quantity: 3, status: 'planned', datePlanted: null, notes: '' }));
    s = plannerReducer(s, actions.addJournalEntry({ id: 'j1', bedId: 'b1', date: '2026-05-01', text: 'note' }));
    s = plannerReducer(s, actions.removeBed('b1'));
    assert.equal(s.plan.beds.length, 0);
    assert.equal(s.plan.plantings.length, 0);
    assert.equal(s.plan.journal.length, 0);
});

test('ADD_PLANTING / UPDATE_PLANTING / REMOVE_PLANTING', () => {
    let s = plannerReducer(freshState(), actions.addBed({ id: 'b1', name: 'A', widthFt: 4, lengthFt: 4 }));
    s = plannerReducer(s, actions.addPlanting({ id: 'p1', bedId: 'b1', plantId: 'tomato', quantity: 3, status: 'planned', datePlanted: null, notes: '' }));
    assert.equal(s.plan.plantings.length, 1);
    s = plannerReducer(s, actions.updatePlanting('p1', { quantity: 5 }));
    assert.equal(s.plan.plantings[0].quantity, 5);
    s = plannerReducer(s, actions.removePlanting('p1'));
    assert.equal(s.plan.plantings.length, 0);
});

test('MARK_TASK_DONE advances planting status', () => {
    let s = plannerReducer(freshState(), actions.addBed({ id: 'b1', name: 'A', widthFt: 4, lengthFt: 4 }));
    s = plannerReducer(s, actions.addPlanting({ id: 'p1', bedId: 'b1', plantId: 'tomato', quantity: 3, status: 'planned', datePlanted: null, notes: '' }));
    s = plannerReducer(s, actions.markTaskDone({ plantingId: 'p1', nextStatus: 'sown_indoors', date: '2026-03-01' }));
    assert.equal(s.plan.plantings[0].status, 'sown_indoors');
    assert.equal(s.plan.plantings[0].datePlanted, '2026-03-01');
});

test('ADD_JOURNAL_ENTRY', () => {
    let s = plannerReducer(freshState(), actions.addBed({ id: 'b1', name: 'A', widthFt: 4, lengthFt: 4 }));
    s = plannerReducer(s, actions.addJournalEntry({ id: 'j1', bedId: 'b1', date: '2026-05-01', text: 'tomatoes sprouted' }));
    assert.equal(s.plan.journal.length, 1);
});

test('ADD_CUSTOM_PLANT / UPDATE_CUSTOM_PLANT', () => {
    let s = plannerReducer(freshState(), actions.addCustomPlant({
        id: 'custom-okra', name: 'Okra', category: 'vegetables', icon: '🌶️',
        spacingInches: 12, daysToMaturity: 60,
        plantingWindow: { start: 4, end: 6 },
        startIndoorsWeeksBeforeLastFrost: 4,
        goodNeighbors: [], avoidNeighbors: [], notes: '', isUserAdded: true,
    }));
    assert.equal(s.plan.customPlants.length, 1);
    s = plannerReducer(s, actions.updateCustomPlant('custom-okra', { spacingInches: 18 }));
    assert.equal(s.plan.customPlants[0].spacingInches, 18);
});

test('UNDO / REDO walk the history', () => {
    let s = plannerReducer(freshState(), actions.addBed({ id: 'b1', name: 'A', widthFt: 4, lengthFt: 4 }));
    s = plannerReducer(s, actions.addBed({ id: 'b2', name: 'B', widthFt: 4, lengthFt: 4 }));
    assert.equal(s.plan.beds.length, 2);
    s = plannerReducer(s, actions.undo());
    assert.equal(s.plan.beds.length, 1);
    s = plannerReducer(s, actions.redo());
    assert.equal(s.plan.beds.length, 2);
});

test('LOAD_PLAN replaces state and grows history', () => {
    let s = plannerReducer(freshState(), actions.addBed({ id: 'b1', name: 'A', widthFt: 4, lengthFt: 4 }));
    const fresh = createEmptyPlan({ zone: '5a', zip: null, lastFrostDate: '2026-05-15', firstFrostDate: '2026-09-30' });
    s = plannerReducer(s, actions.loadPlan(fresh));
    assert.equal(s.plan.garden.zone, '5a');
    assert.equal(s.plan.beds.length, 0);
});

test('history is capped at MAX_HISTORY', () => {
    let s = freshState();
    for (let i = 0; i < MAX_HISTORY + 10; i++) {
        s = plannerReducer(s, actions.addBed({ id: `b${i}`, name: `B${i}`, widthFt: 4, lengthFt: 4 }));
    }
    assert.equal(s.history.length, MAX_HISTORY);
});
