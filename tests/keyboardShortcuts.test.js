import test from 'node:test';
import assert from 'node:assert/strict';
import { createKeyDownHandler } from '../src/features/planner/useKeyboardShortcuts.js';
import { plannerActionTypes } from '../src/features/planner/planReducer.js';

// Minimal HTMLElement stub so instanceof checks work in Node
class HTMLElement {
    constructor(tagName = 'div') {
        this.tagName = tagName;
        this.isContentEditable = false;
    }
}
globalThis.HTMLElement = HTMLElement;

// Fake event factory
function evt(overrides = {}) {
    return {
        metaKey: false, ctrlKey: false, shiftKey: false,
        key: '', code: '',
        target: null,
        preventDefault: () => {},
        ...overrides,
    };
}

// Minimal planner item shapes
const plant = { id: 'p1', type: 'plant', name: 'Tomato', x: 30, y: 30 };
const structure = { id: 's1', type: 'structure', name: 'Raised Bed', x: 0, y: 0, width: 4, length: 4 };

// Default handler opts — all callbacks are no-ops unless overridden
function makeOpts(overrides = {}) {
    return {
        selectedTool: null,
        selectedItemId: null,
        selectedPlacedItem: null,
        mode: 'place',
        snapPx: null,
        worldWidth: 300,
        worldHeight: 300,
        applyItemPatch: () => {},
        clearSelection: () => {},
        handleUndo: () => {},
        handleRedo: () => {},
        handleTrash: () => {},
        dispatch: () => {},
        setSelectedItemId: () => {},
        ...overrides,
    };
}

// ── Undo / Redo ────────────────────────────────────────────────────────────

test('Ctrl+Z calls handleUndo', () => {
    let called = false;
    const handler = createKeyDownHandler(makeOpts({ handleUndo: () => { called = true; } }));
    handler(evt({ ctrlKey: true, key: 'z' }));
    assert.ok(called);
});

test('Ctrl+Shift+Z calls handleRedo', () => {
    let called = false;
    const handler = createKeyDownHandler(makeOpts({ handleRedo: () => { called = true; } }));
    handler(evt({ ctrlKey: true, shiftKey: true, key: 'z' }));
    assert.ok(called);
});

test('Ctrl+Y calls handleRedo', () => {
    let called = false;
    const handler = createKeyDownHandler(makeOpts({ handleRedo: () => { called = true; } }));
    handler(evt({ ctrlKey: true, key: 'y' }));
    assert.ok(called);
});

test('Meta+Z (Mac) calls handleUndo', () => {
    let called = false;
    const handler = createKeyDownHandler(makeOpts({ handleUndo: () => { called = true; } }));
    handler(evt({ metaKey: true, key: 'z' }));
    assert.ok(called);
});

// ── Escape ─────────────────────────────────────────────────────────────────

test('Escape with no tool calls clearSelection and setSelectedItemId(null)', () => {
    const calls = [];
    const handler = createKeyDownHandler(makeOpts({
        clearSelection: () => calls.push('clearSelection'),
        setSelectedItemId: (v) => calls.push(['setSelectedItemId', v]),
    }));
    handler(evt({ key: 'Escape' }));
    assert.ok(calls.includes('clearSelection'));
    assert.deepEqual(calls.find((c) => Array.isArray(c)), ['setSelectedItemId', null]);
});

test('Escape with moved (non-new) tool dispatches RESET_TO_COMMITTED', () => {
    const dispatched = [];
    const handler = createKeyDownHandler(makeOpts({
        selectedTool: { ...plant, isNew: false },
        dispatch: (action) => dispatched.push(action),
        clearSelection: () => {},
        setSelectedItemId: () => {},
    }));
    handler(evt({ key: 'Escape' }));
    assert.equal(dispatched.length, 1);
    assert.equal(dispatched[0].type, plannerActionTypes.RESET_TO_COMMITTED);
});

test('Escape with new tool does NOT dispatch RESET_TO_COMMITTED', () => {
    const dispatched = [];
    const handler = createKeyDownHandler(makeOpts({
        selectedTool: { ...plant, isNew: true },
        dispatch: (action) => dispatched.push(action),
        clearSelection: () => {},
        setSelectedItemId: () => {},
    }));
    handler(evt({ key: 'Escape' }));
    assert.equal(dispatched.length, 0);
});

// ── Delete / Backspace ─────────────────────────────────────────────────────

test('Delete with selected item calls handleTrash', () => {
    let called = false;
    const handler = createKeyDownHandler(makeOpts({
        selectedItemId: 'p1',
        handleTrash: () => { called = true; },
    }));
    handler(evt({ key: 'Delete' }));
    assert.ok(called);
});

test('Delete with no selected item or tool is a no-op', () => {
    let called = false;
    const handler = createKeyDownHandler(makeOpts({
        handleTrash: () => { called = true; },
    }));
    handler(evt({ key: 'Delete' }));
    assert.ok(!called);
});

test('Delete when target is an input element is a no-op', () => {
    let called = false;
    const inputEl = new HTMLElement('input');
    const handler = createKeyDownHandler(makeOpts({
        selectedItemId: 'p1',
        handleTrash: () => { called = true; },
    }));
    handler(evt({ key: 'Delete', target: inputEl }));
    assert.ok(!called);
});

// ── Arrow keys ─────────────────────────────────────────────────────────────

test('ArrowRight on selected plant calls applyItemPatch with increased x', () => {
    let patch = null;
    const handler = createKeyDownHandler(makeOpts({
        selectedPlacedItem: { ...plant, x: 30, y: 30 },
        applyItemPatch: (id, p) => { patch = { id, ...p }; },
    }));
    handler(evt({ key: 'ArrowRight' }));
    assert.ok(patch !== null);
    assert.equal(patch.id, plant.id);
    assert.ok(patch.x > 30);
});

test('ArrowLeft on selected plant decreases x', () => {
    let patch = null;
    const handler = createKeyDownHandler(makeOpts({
        selectedPlacedItem: { ...plant, x: 60, y: 60 },
        applyItemPatch: (id, p) => { patch = { id, ...p }; },
    }));
    handler(evt({ key: 'ArrowLeft' }));
    assert.ok(patch !== null);
    assert.ok(patch.x < 60);
});

test('Arrow keys clamp plant to canvas bounds (x cannot exceed worldWidth - size)', () => {
    let patch = null;
    const handler = createKeyDownHandler(makeOpts({
        selectedPlacedItem: { ...plant, x: 295, y: 30 },
        worldWidth: 300,
        applyItemPatch: (id, p) => { patch = { id, ...p }; },
    }));
    handler(evt({ key: 'ArrowRight' }));
    // plant cell is 15px wide; max x = 300 - 15 = 285
    assert.ok(patch.x <= 285);
});

test('Arrow keys are no-op in pan mode', () => {
    let called = false;
    const handler = createKeyDownHandler(makeOpts({
        selectedPlacedItem: plant,
        mode: 'pan',
        applyItemPatch: () => { called = true; },
    }));
    handler(evt({ key: 'ArrowRight' }));
    assert.ok(!called);
});

test('Arrow keys are no-op when a selectedTool is active', () => {
    let called = false;
    const handler = createKeyDownHandler(makeOpts({
        selectedTool: { ...plant, isNew: true },
        selectedPlacedItem: plant,
        applyItemPatch: () => { called = true; },
    }));
    handler(evt({ key: 'ArrowRight' }));
    assert.ok(!called);
});

test('Arrow keys are no-op on structures', () => {
    let called = false;
    const handler = createKeyDownHandler(makeOpts({
        selectedPlacedItem: structure,
        applyItemPatch: () => { called = true; },
    }));
    handler(evt({ key: 'ArrowRight' }));
    assert.ok(!called);
});
