# Willowbrook Almanac — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the data layer (v2 schema, reducer, persistence), the new GardenSetup with frost-date resolution, and an AlmanacShell with three empty navigable views. Delete the old freeform canvas. After this plan the app boots into the new shell, navigates between Agenda / Beds / Library placeholders, auto-saves to localStorage, and can export/import v2 JSON. Plans 2 and 3 fill in the views.

**Architecture:** Single `useReducer` at `AlmanacShell` holds the full `PlanFile` v2 shape. Pure modules (`planSchema.js`, `planReducer.js`, `frostDates.js`) live under `src/features/plan/` and `src/features/catalog/` and are unit-tested with `node:test`. React components consume reducer state and dispatch actions; no view-level state machine. Old `src/features/planner/` and `src/components/GardenPlanner.jsx` are deleted in a final task.

**Tech stack:** React 19, Vite, Tailwind, lucide-react, `node:test` for unit tests. No new runtime dependencies.

**Companion docs:**
- Spec: `docs/superpowers/specs/2026-05-27-willowbrook-almanac-design.md`
- Marker: `WB-ARCH-0003` (work-index)
- Project rules: `CLAUDE.md` — every commit references `WB-ARCH-0003`

---

## File map

**Create:**
- `src/features/plan/planSchema.js` — type-shape constants, `createEmptyPlan()`, `validatePlanFile()`
- `src/features/plan/planReducer.js` — full reducer for v2 actions (replaces old planner reducer)
- `src/features/plan/usePlanIO.js` — JSON save/load, localStorage auto-save, v1 rejection
- `src/features/catalog/frostDates.js` — pure `fetchFrostDates({ zip })` module
- `src/components/AlmanacShell.jsx` — top-level layout, left rail, three view slots
- `src/components/AgendaView.jsx` — placeholder
- `src/components/BedsView.jsx` — placeholder
- `src/components/LibraryView.jsx` — placeholder
- `tests/planSchema.test.js`
- `tests/planReducer.test.js`
- `tests/frostDates.test.js`

**Modify:**
- `src/features/catalog/plantDatabase.js` — add `daysToMaturity` and `startIndoorsWeeksBeforeLastFrost` to all 28 bundled plants
- `src/components/GardenSetup.jsx` — remove width/length inputs; add frost-date resolution step
- `src/App.jsx` — render `AlmanacShell` instead of `GardenPlanner`; pass v2 plan state
- `docs/work-index.md` — flip `WB-ARCH-0003` to `IN_PROGRESS`
- `docs/decisions/DEC-0002.md` (new) — DEC pointer to the spec

**Delete (final task):**
- `src/components/GardenPlanner.jsx`
- `src/components/Sidebar.jsx`
- `src/features/planner/` (entire folder)
- `tests/planner.test.js`
- `tests/keyboardShortcuts.test.js`

---

## Task 0: Setup — branch, marker flip, DEC record

**Files:**
- Modify: `docs/work-index.md`
- Create: `docs/decisions/DEC-0002.md`

- [ ] **Step 1: Confirm clean working tree**

```bash
git status
```

Expected: `nothing to commit, working tree clean`. If not, stop and ask the user.

- [ ] **Step 2: Flip marker status to IN_PROGRESS**

In `docs/work-index.md`, change the `WB-ARCH-0003` row's Status from `PLANNED` to `IN_PROGRESS` and bump Updated to today (2026-05-27).

- [ ] **Step 3: Create DEC-0002 pointing at the spec**

Create `docs/decisions/DEC-0002.md` with this content:

```markdown
# DEC-0002 — Willowbrook Almanac (product redirection)

**Date:** 2026-05-27
**Marker:** WB-ARCH-0003
**Risk:** medium (schema-breaking, deletes most of the canvas surface)
**Status:** Accepted

## Decision

Replace the freeform top-down garden planner with a bed-centric garden journal whose home screen is a weekly task agenda. Bump the plan file schema to v2 with no migration path from v1.

## Rationale

See full spec: `docs/superpowers/specs/2026-05-27-willowbrook-almanac-design.md`.

Summary: the freeform canvas surface is the root of the three user-reported pain points (plant-art friction, hardcoded library, buggy move flow). A list-based, journal-centric app dissolves all three: plant art becomes a single character, the library is extensible from a form, and "move" no longer exists as an interaction.

## Threat model (Gate 2)

Scoped to two new external surfaces:

- **Frost-date API fetch** (`src/features/catalog/frostDates.js`). Mitigations: 8 s `AbortController` timeout (same pattern as existing ZIP lookup), strict response validation, graceful fall-back to manual entry, no auth/credentials in flight.
- **JSON file load** (`src/features/plan/usePlanIO.js`). Mitigations: `validatePlanFile()` checks `schemaVersion === 2` and shape before populating state; v1 and malformed files rejected with a user-visible message; no `eval`, no template injection.

## Migration

No automatic migration from v1. v1 `.json` files are rejected at load time.
```

- [ ] **Step 4: Commit**

```bash
git add docs/work-index.md docs/decisions/DEC-0002.md
git commit -m "WB-ARCH-0003: open marker, add DEC-0002"
```

---

## Task 1: v2 schema module + tests

**Files:**
- Create: `src/features/plan/planSchema.js`
- Create: `tests/planSchema.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/planSchema.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: failure with `ERR_MODULE_NOT_FOUND` for `planSchema.js`.

- [ ] **Step 3: Write the schema module**

Create `src/features/plan/planSchema.js`:

```js
export const SCHEMA_VERSION = 2;

const PLANTING_STATUSES = new Set([
    'planned',
    'sown_indoors',
    'direct_sown',
    'transplanted',
    'harvested',
    'removed',
]);

export function createEmptyPlan({ name, zone, zip, lastFrostDate, firstFrostDate }) {
    return {
        schemaVersion: SCHEMA_VERSION,
        garden: {
            name: name || 'My Garden',
            zone,
            zip: zip || null,
            lastFrostDate,
            firstFrostDate,
        },
        beds: [],
        plantings: [],
        journal: [],
        customPlants: [],
    };
}

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validatePlanFile(value) {
    if (!isObject(value)) {
        return { ok: false, error: 'Plan file must be a JSON object.' };
    }
    if (value.schemaVersion !== SCHEMA_VERSION) {
        if (value.schemaVersion === undefined || value.schemaVersion < SCHEMA_VERSION) {
            return {
                ok: false,
                error: 'This file is from an older version of Willowbrook. The app has been rewritten around beds and a weekly agenda; v1 layouts are no longer supported. Start a new plan to continue.',
            };
        }
        return { ok: false, error: `Unknown plan schema version ${value.schemaVersion}.` };
    }
    if (!isObject(value.garden)) return { ok: false, error: 'Missing garden block.' };
    if (typeof value.garden.zone !== 'string') return { ok: false, error: 'garden.zone must be a string.' };
    if (!Array.isArray(value.beds)) return { ok: false, error: 'beds must be an array.' };
    if (!Array.isArray(value.plantings)) return { ok: false, error: 'plantings must be an array.' };
    if (!Array.isArray(value.journal)) return { ok: false, error: 'journal must be an array.' };
    if (!Array.isArray(value.customPlants)) return { ok: false, error: 'customPlants must be an array.' };

    for (const planting of value.plantings) {
        if (!PLANTING_STATUSES.has(planting.status)) {
            return { ok: false, error: `Unknown planting status: ${planting.status}` };
        }
    }
    return { ok: true };
}

export const PLANTING_STATUS_VALUES = Array.from(PLANTING_STATUSES);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: 6 new tests pass. Existing tests still pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/plan/planSchema.js tests/planSchema.test.js
git commit -m "WB-ARCH-0003: v2 plan schema + validator"
```

---

## Task 2: planReducer (full v2 action set) + tests

**Files:**
- Create: `src/features/plan/planReducer.js`
- Create: `tests/planReducer.test.js`

The new reducer holds **all** actions for the full Almanac (beds, plantings, journal, custom plants, mark-task-done). Plans 2 and 3 add UI; the data layer is settled here.

- [ ] **Step 1: Write the failing tests**

Create `tests/planReducer.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: failure for the new test file (module not found).

- [ ] **Step 3: Write the reducer module**

Create `src/features/plan/planReducer.js`:

```js
import { createEmptyPlan } from './planSchema.js';

export const MAX_HISTORY = 50;

export const actionTypes = {
    ADD_BED: 'ADD_BED',
    UPDATE_BED: 'UPDATE_BED',
    REMOVE_BED: 'REMOVE_BED',
    ADD_PLANTING: 'ADD_PLANTING',
    UPDATE_PLANTING: 'UPDATE_PLANTING',
    REMOVE_PLANTING: 'REMOVE_PLANTING',
    ADD_JOURNAL_ENTRY: 'ADD_JOURNAL_ENTRY',
    ADD_CUSTOM_PLANT: 'ADD_CUSTOM_PLANT',
    UPDATE_CUSTOM_PLANT: 'UPDATE_CUSTOM_PLANT',
    MARK_TASK_DONE: 'MARK_TASK_DONE',
    LOAD_PLAN: 'LOAD_PLAN',
    UNDO: 'UNDO',
    REDO: 'REDO',
};

export const actions = {
    addBed: (bed) => ({ type: actionTypes.ADD_BED, payload: bed }),
    updateBed: (id, patch) => ({ type: actionTypes.UPDATE_BED, payload: { id, patch } }),
    removeBed: (id) => ({ type: actionTypes.REMOVE_BED, payload: id }),
    addPlanting: (planting) => ({ type: actionTypes.ADD_PLANTING, payload: planting }),
    updatePlanting: (id, patch) => ({ type: actionTypes.UPDATE_PLANTING, payload: { id, patch } }),
    removePlanting: (id) => ({ type: actionTypes.REMOVE_PLANTING, payload: id }),
    addJournalEntry: (entry) => ({ type: actionTypes.ADD_JOURNAL_ENTRY, payload: entry }),
    addCustomPlant: (plant) => ({ type: actionTypes.ADD_CUSTOM_PLANT, payload: plant }),
    updateCustomPlant: (id, patch) => ({ type: actionTypes.UPDATE_CUSTOM_PLANT, payload: { id, patch } }),
    markTaskDone: ({ plantingId, nextStatus, date }) => ({
        type: actionTypes.MARK_TASK_DONE,
        payload: { plantingId, nextStatus, date },
    }),
    loadPlan: (plan) => ({ type: actionTypes.LOAD_PLAN, payload: plan }),
    undo: () => ({ type: actionTypes.UNDO }),
    redo: () => ({ type: actionTypes.REDO }),
};

export function createInitialState(planOrUndefined) {
    const plan = planOrUndefined || createEmptyPlan({
        zone: '7a', zip: null, lastFrostDate: '2026-04-15', firstFrostDate: '2026-10-30',
    });
    return {
        plan,
        history: [plan],
        currentHistoryIndex: 0,
    };
}

function commit(state, nextPlan) {
    const nextHistory = state.history.slice(0, state.currentHistoryIndex + 1);
    nextHistory.push(nextPlan);
    const capped = nextHistory.length > MAX_HISTORY
        ? nextHistory.slice(nextHistory.length - MAX_HISTORY)
        : nextHistory;
    return {
        plan: nextPlan,
        history: capped,
        currentHistoryIndex: capped.length - 1,
    };
}

export function plannerReducer(state, action) {
    const plan = state.plan;
    switch (action.type) {
        case actionTypes.ADD_BED:
            return commit(state, { ...plan, beds: [...plan.beds, action.payload] });
        case actionTypes.UPDATE_BED: {
            const { id, patch } = action.payload;
            return commit(state, {
                ...plan,
                beds: plan.beds.map((bed) => (bed.id === id ? { ...bed, ...patch } : bed)),
            });
        }
        case actionTypes.REMOVE_BED: {
            const id = action.payload;
            return commit(state, {
                ...plan,
                beds: plan.beds.filter((bed) => bed.id !== id),
                plantings: plan.plantings.filter((p) => p.bedId !== id),
                journal: plan.journal.filter((j) => j.bedId !== id),
            });
        }
        case actionTypes.ADD_PLANTING:
            return commit(state, { ...plan, plantings: [...plan.plantings, action.payload] });
        case actionTypes.UPDATE_PLANTING: {
            const { id, patch } = action.payload;
            return commit(state, {
                ...plan,
                plantings: plan.plantings.map((p) => (p.id === id ? { ...p, ...patch } : p)),
            });
        }
        case actionTypes.REMOVE_PLANTING:
            return commit(state, { ...plan, plantings: plan.plantings.filter((p) => p.id !== action.payload) });
        case actionTypes.ADD_JOURNAL_ENTRY:
            return commit(state, { ...plan, journal: [...plan.journal, action.payload] });
        case actionTypes.ADD_CUSTOM_PLANT:
            return commit(state, { ...plan, customPlants: [...plan.customPlants, action.payload] });
        case actionTypes.UPDATE_CUSTOM_PLANT: {
            const { id, patch } = action.payload;
            return commit(state, {
                ...plan,
                customPlants: plan.customPlants.map((c) => (c.id === id ? { ...c, ...patch } : c)),
            });
        }
        case actionTypes.MARK_TASK_DONE: {
            const { plantingId, nextStatus, date } = action.payload;
            return commit(state, {
                ...plan,
                plantings: plan.plantings.map((p) => (
                    p.id === plantingId
                        ? { ...p, status: nextStatus, datePlanted: date || p.datePlanted }
                        : p
                )),
            });
        }
        case actionTypes.LOAD_PLAN:
            return commit(state, action.payload);
        case actionTypes.UNDO:
            if (state.currentHistoryIndex <= 0) return state;
            return {
                ...state,
                currentHistoryIndex: state.currentHistoryIndex - 1,
                plan: state.history[state.currentHistoryIndex - 1],
            };
        case actionTypes.REDO:
            if (state.currentHistoryIndex >= state.history.length - 1) return state;
            return {
                ...state,
                currentHistoryIndex: state.currentHistoryIndex + 1,
                plan: state.history[state.currentHistoryIndex + 1],
            };
        default:
            return state;
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: all new reducer tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/plan/planReducer.js tests/planReducer.test.js
git commit -m "WB-ARCH-0003: v2 planReducer with full action set"
```

---

## Task 3: Extend plantDatabase with `daysToMaturity` + `startIndoorsWeeksBeforeLastFrost`

**Files:**
- Modify: `src/features/catalog/plantDatabase.js`
- Modify: `tests/planner.test.js` (or wherever validation runs — we'll add inline validation in the next step instead)

Use the following values. All are reasonable home-garden defaults sourced from extension publications; exact values can be refined in a later sprint without changing the schema.

| Plant id | daysToMaturity | startIndoorsWeeksBeforeLastFrost |
|---|---|---|
| tomato | 75 | 6 |
| carrot | 70 | 0 |
| lettuce | 50 | 4 |
| pepper | 75 | 8 |
| onion | 110 | 8 |
| broccoli | 60 | 6 |
| potato | 90 | 0 |
| bean | 55 | 0 |
| radish | 25 | 0 |
| spinach | 45 | 0 |
| zucchini | 50 | 3 |
| corn | 75 | 0 |
| eggplant | 80 | 8 |
| beet | 55 | 0 |
| garlic | 240 | 0 |
| basil | 70 | 6 |
| parsley | 75 | 6 |
| mint | 90 | 0 |
| rosemary | 90 | 8 |
| thyme | 75 | 8 |
| lavender | 90 | 8 |
| sunflower | 90 | 2 |
| marigold | 50 | 4 |
| daisy | 60 | 6 |
| tulip | 180 | 0 |
| strawberry | 60 | 0 |
| blueberry | 730 | 0 |
| raspberry | 730 | 0 |

- [ ] **Step 1: Add the two fields to every plant**

For each entry in `RAW_PLANT_DATABASE` in `src/features/catalog/plantDatabase.js`, add `daysToMaturity` and `startIndoorsWeeksBeforeLastFrost` properties next to `spacingInches`, using the values from the table above.

Example, for the tomato entry:

```js
{
    id: 'tomato',
    name: 'Tomato',
    category: 'vegetables',
    icon: '🍅',
    color: 'bg-red-500',
    spacingInches: 24,
    daysToMaturity: 75,
    startIndoorsWeeksBeforeLastFrost: 6,
    goodNeighbors: ['basil', 'carrot', 'onion', 'marigold', 'parsley'],
    // ... rest unchanged
},
```

Repeat for all 28 plants.

- [ ] **Step 2: Add a runtime guard in catalog.js**

Open `src/features/catalog/catalog.js`. Below the existing `validatePlantNeighborIds()` function, add:

```js
export function validatePlantTimingFields() {
    const issues = [];
    for (const plant of PLANT_DATABASE) {
        if (typeof plant.daysToMaturity !== 'number' || plant.daysToMaturity <= 0) {
            issues.push({ plantId: plant.id, field: 'daysToMaturity', value: plant.daysToMaturity });
        }
        if (typeof plant.startIndoorsWeeksBeforeLastFrost !== 'number' || plant.startIndoorsWeeksBeforeLastFrost < 0) {
            issues.push({ plantId: plant.id, field: 'startIndoorsWeeksBeforeLastFrost', value: plant.startIndoorsWeeksBeforeLastFrost });
        }
    }
    return issues;
}
```

And below the existing dev-mode logger block, add:

```js
if (import.meta.env?.DEV) {
    for (const { plantId, field, value } of validatePlantTimingFields()) {
        console.error(`[catalog] Plant "${plantId}" has invalid ${field}: ${value}`);
    }
}
```

- [ ] **Step 3: Add a test that confirms all plants have the new fields**

Append to `tests/planner.test.js` (we'll delete this file later, but for now it's the catalog test home):

```js
import { validatePlantTimingFields } from '../src/features/catalog/catalog.js';

test('every bundled plant has valid daysToMaturity and startIndoorsWeeksBeforeLastFrost', () => {
    const issues = validatePlantTimingFields();
    assert.deepEqual(issues, []);
});
```

(If `test` and `assert` are not already imported at the top of `tests/planner.test.js`, add them.)

- [ ] **Step 4: Run tests + lint**

```bash
npm test && npm run lint
```

Expected: all tests pass, lint clean.

- [ ] **Step 5: Commit**

```bash
git add src/features/catalog/plantDatabase.js src/features/catalog/catalog.js tests/planner.test.js
git commit -m "WB-ARCH-0003: add daysToMaturity + startIndoorsWeeksBeforeLastFrost to bundled plants"
```

---

## Task 4: Frost-date module + tests

**Files:**
- Create: `src/features/catalog/frostDates.js`
- Create: `tests/frostDates.test.js`

`fetchFrostDates({ zip })` is a pure async function. It resolves the ZIP to lat/lon via `api.zippopotam.us`, then asks `api.farmsense.net` for the nearest frost-date station and its probabilities. On any failure (network, validation, unknown ZIP, no stations) it returns `{ ok: false, error: <message> }`. The 8-second `AbortController` timeout matches the existing ZIP-lookup pattern.

- [ ] **Step 1: Write the failing tests**

Create `tests/frostDates.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrostDateResponse, pickFrostDate } from '../src/features/catalog/frostDates.js';

test('pickFrostDate returns the 50% probability spring frost date', () => {
    const stationResponse = [{
        prob_50: '0415',  // farmsense uses MMDD strings
        prob_90: '0501',
        prob_10: '0401',
    }];
    const date = pickFrostDate(stationResponse, 'spring', 2026);
    assert.equal(date, '2026-04-15');
});

test('pickFrostDate returns null when response is empty', () => {
    assert.equal(pickFrostDate([], 'spring', 2026), null);
    assert.equal(pickFrostDate(null, 'spring', 2026), null);
});

test('parseFrostDateResponse validates a well-formed pair', () => {
    const result = parseFrostDateResponse({
        spring: [{ prob_50: '0415' }],
        fall:   [{ prob_50: '1030' }],
    }, 2026);
    assert.equal(result.ok, true);
    assert.equal(result.lastFrostDate, '2026-04-15');
    assert.equal(result.firstFrostDate, '2026-10-30');
});

test('parseFrostDateResponse fails clearly when spring is missing', () => {
    const result = parseFrostDateResponse({ fall: [{ prob_50: '1030' }] }, 2026);
    assert.equal(result.ok, false);
    assert.match(result.error, /spring/i);
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test
```

Expected: module-not-found.

- [ ] **Step 3: Write the frost-date module**

Create `src/features/catalog/frostDates.js`:

```js
const ZIP_LOOKUP_URL = (zip) => `https://api.zippopotam.us/us/${encodeURIComponent(zip)}`;
const STATION_URL = (lat, lon) => `https://api.farmsense.net/v1/frostdates/stations/?lat=${lat}&lon=${lon}`;
const PROBABILITY_URL = (stationId, season) => `https://api.farmsense.net/v1/frostdates/probabilities/?station=${stationId}&season=${season}`;

const DEFAULT_TIMEOUT_MS = 8000;

function timedFetch(url, { signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal })
        .finally(() => {
            clearTimeout(timeoutId);
            if (signal) signal.removeEventListener('abort', onAbort);
        });
}

export function pickFrostDate(probabilities, season, year) {
    if (!Array.isArray(probabilities) || probabilities.length === 0) return null;
    const first = probabilities[0];
    const mmdd = first?.prob_50;
    if (typeof mmdd !== 'string' || !/^\d{4}$/.test(mmdd)) return null;
    const month = mmdd.slice(0, 2);
    const day = mmdd.slice(2, 4);
    return `${year}-${month}-${day}`;
}

export function parseFrostDateResponse({ spring, fall }, year) {
    const lastFrostDate = pickFrostDate(spring, 'spring', year);
    if (!lastFrostDate) {
        return { ok: false, error: 'Could not parse spring (last) frost date from API response.' };
    }
    const firstFrostDate = pickFrostDate(fall, 'fall', year);
    if (!firstFrostDate) {
        return { ok: false, error: 'Could not parse fall (first) frost date from API response.' };
    }
    return { ok: true, lastFrostDate, firstFrostDate };
}

export async function fetchFrostDates({ zip, year = new Date().getFullYear() }) {
    if (!/^\d{5}$/.test(String(zip))) {
        return { ok: false, error: 'A 5-digit ZIP code is required to look up frost dates.' };
    }
    try {
        const zipResp = await timedFetch(ZIP_LOOKUP_URL(zip));
        if (!zipResp.ok) return { ok: false, error: 'Could not resolve ZIP to coordinates.' };
        const zipJson = await zipResp.json();
        const place = zipJson?.places?.[0];
        const lat = place?.latitude;
        const lon = place?.longitude;
        if (!lat || !lon) return { ok: false, error: 'ZIP lookup returned no coordinates.' };

        const stationResp = await timedFetch(STATION_URL(lat, lon));
        if (!stationResp.ok) return { ok: false, error: 'Could not find a nearby frost-date station.' };
        const stations = await stationResp.json();
        const stationId = stations?.[0]?.id;
        if (!stationId) return { ok: false, error: 'No frost-date stations near that ZIP.' };

        const [springResp, fallResp] = await Promise.all([
            timedFetch(PROBABILITY_URL(stationId, 1)),
            timedFetch(PROBABILITY_URL(stationId, 2)),
        ]);
        if (!springResp.ok || !fallResp.ok) {
            return { ok: false, error: 'Frost-date probability lookup failed.' };
        }
        const [spring, fall] = await Promise.all([springResp.json(), fallResp.json()]);
        return parseFrostDateResponse({ spring, fall }, year);
    } catch (err) {
        if (err?.name === 'AbortError') {
            return { ok: false, error: 'Frost-date lookup timed out — please enter dates manually.' };
        }
        return { ok: false, error: 'Frost-date lookup failed — please enter dates manually.' };
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: 4 new frost-date tests pass. Network-using `fetchFrostDates` is **not** tested here — only the pure helpers. Real-network behavior is verified manually in Task 5.

- [ ] **Step 5: Commit**

```bash
git add src/features/catalog/frostDates.js tests/frostDates.test.js
git commit -m "WB-ARCH-0003: pure frostDates module (ZIP → lat/lon → farmsense)"
```

---

## Task 5: Rewrite GardenSetup (drop width/length, add frost dates)

**Files:**
- Modify: `src/components/GardenSetup.jsx`

The new `GardenSetup` collects: garden name (default "My Garden"), USDA zone (ZIP or manual), last frost date, first frost date. **No plot width/length** — beds are added inside the app.

Submit produces an initial `Garden` block that the parent uses to call `createEmptyPlan({...})`.

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `src/components/GardenSetup.jsx` with:

```jsx
import React, { useState } from 'react';
import { Sprout, RefreshCw } from 'lucide-react';
import { fetchFrostDates } from '../features/catalog/frostDates.js';

const ZONE_OPTIONS = [
    '1a','1b','2a','2b','3a','3b','4a','4b','5a','5b','6a','6b',
    '7a','7b','8a','8b','9a','9b','10a','10b','11a','11b','12a','12b','13a','13b',
];

const DEFAULT_LAST = '2026-04-15';
const DEFAULT_FIRST = '2026-10-30';

export default function GardenSetup({ onComplete }) {
    const [name, setName] = useState('My Garden');
    const [zone, setZone] = useState('7a');
    const [zip, setZip] = useState('');
    const [lastFrostDate, setLastFrostDate] = useState(DEFAULT_LAST);
    const [firstFrostDate, setFirstFrostDate] = useState(DEFAULT_FIRST);
    const [zoneStatus, setZoneStatus] = useState({ state: 'idle', message: '' });
    const [frostStatus, setFrostStatus] = useState({ state: 'idle', message: '' });

    const handleZipLookup = async () => {
        const cleanZip = zip.trim();
        if (!/^\d{5}$/.test(cleanZip)) {
            setZoneStatus({ state: 'error', message: 'Enter a valid 5-digit ZIP.' });
            return;
        }
        setZoneStatus({ state: 'loading', message: 'Looking up zone…' });
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(`https://phzmapi.org/${cleanZip}.json`, { signal: controller.signal });
            clearTimeout(timeout);
            if (!res.ok) throw new Error('zone lookup failed');
            const payload = await res.json();
            if (!payload?.zone) throw new Error('no zone');
            setZone(String(payload.zone).toLowerCase());
            setZoneStatus({ state: 'success', message: `ZIP ${cleanZip} → zone ${String(payload.zone).toUpperCase()}.` });
        } catch (err) {
            setZoneStatus({
                state: 'error',
                message: err.name === 'AbortError'
                    ? 'Zone lookup timed out — pick manually.'
                    : 'Zone lookup failed — pick manually.',
            });
        }
    };

    const handleFrostLookup = async () => {
        const cleanZip = zip.trim();
        if (!/^\d{5}$/.test(cleanZip)) {
            setFrostStatus({ state: 'error', message: 'Enter a 5-digit ZIP first.' });
            return;
        }
        setFrostStatus({ state: 'loading', message: 'Looking up frost dates…' });
        const result = await fetchFrostDates({ zip: cleanZip });
        if (result.ok) {
            setLastFrostDate(result.lastFrostDate);
            setFirstFrostDate(result.firstFrostDate);
            setFrostStatus({ state: 'success', message: `Last frost ${result.lastFrostDate}, first frost ${result.firstFrostDate}.` });
        } else {
            setFrostStatus({ state: 'error', message: result.error });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onComplete({
            name: name.trim() || 'My Garden',
            zone,
            zip: zip.trim() || null,
            lastFrostDate,
            firstFrostDate,
        });
    };

    return (
        <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
                <div className="flex items-center justify-center mb-6 text-green-600">
                    <Sprout size={48} />
                </div>
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Willowbrook Almanac</h1>
                <p className="text-center text-gray-600 mb-8">Bed-centric garden journal. Let's set up your garden.</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <Field label="Garden name">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </Field>

                    <Field label="ZIP code (US)">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={5}
                                value={zip}
                                onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))}
                                placeholder="e.g. 30301"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <button
                                type="button"
                                onClick={handleZipLookup}
                                disabled={zoneStatus.state === 'loading'}
                                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-60"
                            >
                                Zone
                            </button>
                            <button
                                type="button"
                                onClick={handleFrostLookup}
                                disabled={frostStatus.state === 'loading'}
                                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-60"
                            >
                                Frost
                            </button>
                        </div>
                        {zoneStatus.message && (
                            <p className={`text-xs mt-1 ${zoneStatus.state === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
                                {zoneStatus.message}
                            </p>
                        )}
                    </Field>

                    <Field label="USDA zone">
                        <select
                            value={zone}
                            onChange={(e) => setZone(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                        >
                            {ZONE_OPTIONS.map((z) => <option key={z} value={z}>{z.toUpperCase()}</option>)}
                        </select>
                    </Field>

                    <Field label="Last spring frost">
                        <input
                            type="date"
                            value={lastFrostDate}
                            onChange={(e) => setLastFrostDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </Field>

                    <Field label="First fall frost">
                        <input
                            type="date"
                            value={firstFrostDate}
                            onChange={(e) => setFirstFrostDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </Field>

                    {frostStatus.message && (
                        <p className={`text-xs ${frostStatus.state === 'error' ? 'text-red-600' : 'text-gray-600'} flex items-center gap-1`}>
                            <RefreshCw size={12} />
                            {frostStatus.message}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                    >
                        Open Almanac
                    </button>
                </form>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            {children}
        </div>
    );
}
```

- [ ] **Step 2: Run lint to catch typos**

```bash
npm run lint
```

Expected: clean. (Tests don't cover this React file; we'll smoke-test in the browser later.)

- [ ] **Step 3: Commit**

```bash
git add src/components/GardenSetup.jsx
git commit -m "WB-ARCH-0003: rewrite GardenSetup (zone + frost dates, no plot size)"
```

---

## Task 6: usePlanIO (auto-save + JSON I/O + v1 rejection)

**Files:**
- Create: `src/features/plan/usePlanIO.js`

The hook auto-saves the current plan to `localStorage` on every change, exposes `handleSave` / `handleLoad` for JSON file I/O, and rejects v1 files with the user-visible message.

- [ ] **Step 1: Write the module**

Create `src/features/plan/usePlanIO.js`:

```js
import { useCallback, useEffect } from 'react';
import { validatePlanFile } from './planSchema.js';
import { actions } from './planReducer.js';

const STORAGE_KEY = 'willowbrook_almanac_plan_v2';

export function loadPlanFromStorage() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const validation = validatePlanFile(parsed);
        if (!validation.ok) {
            console.warn('[planIO] Ignoring invalid plan in localStorage:', validation.error);
            return null;
        }
        return parsed;
    } catch (err) {
        console.warn('[planIO] Could not parse plan from localStorage:', err);
        return null;
    }
}

export function usePlanIO({ plan, dispatch, setLoadError }) {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
        } catch (err) {
            console.warn('[planIO] Auto-save failed:', err);
        }
    }, [plan]);

    const handleSave = useCallback(() => {
        const json = JSON.stringify(plan, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${plan.garden.name.replace(/\s+/g, '-').toLowerCase() || 'garden'}-almanac.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [plan]);

    const handleLoad = useCallback(async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const validation = validatePlanFile(parsed);
            if (!validation.ok) {
                setLoadError(validation.error);
                return;
            }
            dispatch(actions.loadPlan(parsed));
            setLoadError(null);
        } catch (err) {
            setLoadError('Could not read that file as JSON.');
        } finally {
            event.target.value = '';
        }
    }, [dispatch, setLoadError]);

    return { handleSave, handleLoad };
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/features/plan/usePlanIO.js
git commit -m "WB-ARCH-0003: usePlanIO hook (auto-save + JSON I/O + v1 reject)"
```

---

## Task 7: AlmanacShell with three empty views

**Files:**
- Create: `src/components/AlmanacShell.jsx`
- Create: `src/components/AgendaView.jsx`
- Create: `src/components/BedsView.jsx`
- Create: `src/components/LibraryView.jsx`

The shell holds the `useReducer`, mounts `usePlanIO`, switches between three views from a left rail, and shows Save/Load/Undo/Redo controls in a header.

- [ ] **Step 1: Create the three placeholder views**

`src/components/AgendaView.jsx`:

```jsx
import React from 'react';

export default function AgendaView() {
    return (
        <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Agenda</h2>
            <p className="text-sm text-gray-600">
                This week's tasks will appear here once Plan 3 (Agenda) is implemented.
            </p>
        </div>
    );
}
```

`src/components/BedsView.jsx`:

```jsx
import React from 'react';

export default function BedsView() {
    return (
        <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Beds</h2>
            <p className="text-sm text-gray-600">
                Bed list and detail will be implemented in Plan 2.
            </p>
        </div>
    );
}
```

`src/components/LibraryView.jsx`:

```jsx
import React from 'react';

export default function LibraryView() {
    return (
        <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Library</h2>
            <p className="text-sm text-gray-600">
                Plant catalog and "Add a plant" form will be implemented in Plan 2.
            </p>
        </div>
    );
}
```

- [ ] **Step 2: Create AlmanacShell**

`src/components/AlmanacShell.jsx`:

```jsx
import React, { useReducer, useState } from 'react';
import { CalendarDays, Sprout, Library, Save, Upload, Undo, Redo, Plus } from 'lucide-react';
import { plannerReducer, createInitialState, actions } from '../features/plan/planReducer.js';
import { usePlanIO } from '../features/plan/usePlanIO.js';
import AgendaView from './AgendaView';
import BedsView from './BedsView';
import LibraryView from './LibraryView';

const VIEWS = [
    { id: 'agenda', label: 'Agenda', icon: CalendarDays },
    { id: 'beds', label: 'Beds', icon: Sprout },
    { id: 'library', label: 'Library', icon: Library },
];

export default function AlmanacShell({ initialPlan, onNewGarden }) {
    const [state, dispatch] = useReducer(plannerReducer, createInitialState(initialPlan));
    const [view, setView] = useState('agenda');
    const [loadError, setLoadError] = useState(null);
    const { handleSave, handleLoad } = usePlanIO({ plan: state.plan, dispatch, setLoadError });

    const canUndo = state.currentHistoryIndex > 0;
    const canRedo = state.currentHistoryIndex < state.history.length - 1;

    return (
        <div className="h-screen flex flex-col bg-stone-100">
            <header className="bg-white border-b border-gray-200">
                <div className="h-12 px-3 flex items-center gap-3 text-sm">
                    <span className="font-semibold text-gray-800">{state.plan.garden.name}</span>
                    <span className="text-xs text-gray-500">
                        Zone {state.plan.garden.zone.toUpperCase()} · last frost {state.plan.garden.lastFrostDate}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                        <button onClick={() => dispatch(actions.undo())} disabled={!canUndo}
                            className="p-1.5 border rounded border-gray-300 disabled:opacity-30">
                            <Undo size={14} />
                        </button>
                        <button onClick={() => dispatch(actions.redo())} disabled={!canRedo}
                            className="p-1.5 border rounded border-gray-300 disabled:opacity-30">
                            <Redo size={14} />
                        </button>
                        <button onClick={handleSave}
                            className="px-2 py-1 border border-gray-300 rounded inline-flex items-center gap-1 text-gray-700 hover:bg-gray-50">
                            <Save size={14} /> Save
                        </button>
                        <label className="px-2 py-1 border border-gray-300 rounded inline-flex items-center gap-1 text-gray-700 hover:bg-gray-50 cursor-pointer">
                            <Upload size={14} /> Load
                            <input type="file" accept=".json" onChange={handleLoad} className="hidden" />
                        </label>
                        <button onClick={onNewGarden}
                            className="px-2 py-1 border border-red-300 rounded text-red-600 hover:bg-red-50 inline-flex items-center gap-1">
                            <Plus size={14} /> New Garden
                        </button>
                    </div>
                </div>
                {loadError && (
                    <div className="px-3 py-2 text-xs text-red-700 bg-red-50 border-t border-red-200">
                        {loadError}
                    </div>
                )}
            </header>

            <div className="flex flex-1 min-h-0">
                <nav className="w-14 bg-green-700 text-white flex flex-col items-center py-3 gap-2">
                    {VIEWS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            title={label}
                            onClick={() => setView(id)}
                            className={`p-2 rounded ${view === id ? 'bg-green-800' : 'hover:bg-green-800/60'}`}
                        >
                            <Icon size={18} />
                        </button>
                    ))}
                </nav>

                <main className="flex-1 overflow-auto bg-white">
                    {view === 'agenda' && <AgendaView plan={state.plan} dispatch={dispatch} />}
                    {view === 'beds' && <BedsView plan={state.plan} dispatch={dispatch} />}
                    {view === 'library' && <LibraryView plan={state.plan} dispatch={dispatch} />}
                </main>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: clean (warnings about unused `plan`/`dispatch` props on placeholders are OK; the views are stubs that will use them in later plans).

- [ ] **Step 4: Commit**

```bash
git add src/components/AlmanacShell.jsx src/components/AgendaView.jsx src/components/BedsView.jsx src/components/LibraryView.jsx
git commit -m "WB-ARCH-0003: AlmanacShell + 3 placeholder views"
```

---

## Task 8: Wire App.jsx to AlmanacShell + restore-from-localStorage

**Files:**
- Modify: `src/App.jsx`

`App.jsx` currently renders `GardenPlanner`. Replace with `AlmanacShell`. Restore plan from `localStorage` if present; otherwise show `GardenSetup` first.

- [ ] **Step 1: Read the current App.jsx to capture the ErrorBoundary**

```bash
cat src/App.jsx
```

The existing `ErrorBoundary` class must be preserved verbatim — it wraps the whole app.

- [ ] **Step 2: Rewrite App.jsx**

Replace the file with:

```jsx
import React, { useState, useCallback } from 'react';
import GardenSetup from './components/GardenSetup';
import AlmanacShell from './components/AlmanacShell';
import { createEmptyPlan } from './features/plan/planSchema.js';
import { loadPlanFromStorage } from './features/plan/usePlanIO.js';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, info) {
        console.error('Willowbrook crashed:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
                    <div className="max-w-md bg-white border border-red-200 rounded-xl shadow-sm p-6">
                        <h1 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h1>
                        <p className="text-sm text-gray-600 mb-3">
                            Willowbrook hit an unexpected error. Reload the page to try again — your auto-saved plan should still be in localStorage.
                        </p>
                        <button onClick={() => window.location.reload()} className="px-3 py-1.5 bg-stone-900 text-white rounded text-sm">
                            Reload
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

function AppInner() {
    const [plan, setPlan] = useState(() => loadPlanFromStorage());

    const handleSetupComplete = useCallback((garden) => {
        setPlan(createEmptyPlan(garden));
    }, []);

    const handleNewGarden = useCallback(() => {
        if (!window.confirm('Start a new garden? Your current plan will be replaced (auto-save will overwrite).')) return;
        setPlan(null);
    }, []);

    if (!plan) {
        return <GardenSetup onComplete={handleSetupComplete} />;
    }
    return <AlmanacShell initialPlan={plan} onNewGarden={handleNewGarden} />;
}

export default function App() {
    return (
        <ErrorBoundary>
            <AppInner />
        </ErrorBoundary>
    );
}
```

- [ ] **Step 3: Run lint + start the dev server for manual smoke test**

```bash
npm run lint
```

Expected: clean.

```bash
npm run dev
```

Open the URL the dev server prints. Manual checks:
- Setup page shows with no width/length fields, the new Frost button, and date inputs
- Clicking "Open Almanac" lands you on the empty Agenda placeholder
- The left rail switches between Agenda / Beds / Library
- Refreshing the page keeps you in the shell (auto-saved plan is restored)
- "New Garden" prompts confirm and returns you to Setup

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "WB-ARCH-0003: wire AlmanacShell into App; auto-restore from localStorage"
```

---

## Task 9: Delete the old planner code

**Files:**
- Delete: `src/components/GardenPlanner.jsx`
- Delete: `src/components/Sidebar.jsx`
- Delete: `src/features/planner/` (entire folder)
- Delete: `tests/keyboardShortcuts.test.js`
- Modify or delete: `tests/planner.test.js` (extract the catalog test we added in Task 3, then delete)

- [ ] **Step 1: Extract the lone surviving catalog test**

The catalog timing-validation test added in Task 3 needs a new home before we delete `tests/planner.test.js`.

Create `tests/catalog.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlantNeighborIds, validatePlantTimingFields } from '../src/features/catalog/catalog.js';

test('all bundled plant neighbor IDs resolve to known plants', () => {
    assert.deepEqual(validatePlantNeighborIds(), []);
});

test('every bundled plant has valid daysToMaturity and startIndoorsWeeksBeforeLastFrost', () => {
    assert.deepEqual(validatePlantTimingFields(), []);
});
```

- [ ] **Step 2: Delete the old planner files**

```bash
rm src/components/GardenPlanner.jsx
rm src/components/Sidebar.jsx
rm -rf src/features/planner/
rm tests/planner.test.js
rm tests/keyboardShortcuts.test.js
```

- [ ] **Step 3: Verify no remaining imports reference deleted files**

```bash
grep -rE "from '[^']*planner|GardenPlanner|Sidebar\\.jsx|useCameraControls|useKeyboardShortcuts|usePlannerIO|LearnTab|LayersTab|TimelineTab" src/ tests/
```

Expected: no output. If anything matches, fix the import (it's almost certainly leftover and should be removed, since none of those modules exist anymore).

- [ ] **Step 4: Run full verification**

```bash
npm run lint && npm test && npm run build
```

Expected:
- Lint: 0 errors, 0 warnings
- Tests: all pass (planSchema, planReducer, frostDates, catalog)
- Build: succeeds, JS bundle smaller than the previous 276 kB

Capture the bundle size from build output.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "WB-ARCH-0003: delete old freeform planner (canvas, modes, sidebar, planner tests)"
```

---

## Task 10: Handoff — session log + work-index update

**Files:**
- Modify: `docs/session-log.md`
- Modify: `docs/work-index.md`

Per the project's `CLAUDE.md`, the handoff is its own ritual: a session-log entry with verification evidence and next actions.

- [ ] **Step 1: Append a session-log entry**

Prepend (above the most recent "Session 6" entry) the following block to `docs/session-log.md`, after the `---` separator at the top:

```markdown
### 2026-05-27 - Session 7

- Markers: `WB-ARCH-0003` (Foundation plan, Plan 1 of 3)
- Objective: Stand up v2 data layer, new GardenSetup with frost dates, AlmanacShell with empty views. Delete the freeform canvas.
- Work completed:
  - DEC-0002 recorded; marker flipped to IN_PROGRESS.
  - `src/features/plan/planSchema.js`: SCHEMA_VERSION=2, createEmptyPlan, validatePlanFile. v1 files explicitly rejected.
  - `src/features/plan/planReducer.js`: full v2 action set (ADD_BED, UPDATE_BED, REMOVE_BED, ADD_PLANTING, UPDATE_PLANTING, REMOVE_PLANTING, ADD_JOURNAL_ENTRY, ADD_CUSTOM_PLANT, UPDATE_CUSTOM_PLANT, MARK_TASK_DONE, LOAD_PLAN, UNDO, REDO). History cap 50.
  - `src/features/plan/usePlanIO.js`: localStorage auto-save + JSON import/export + v1 rejection.
  - `src/features/catalog/frostDates.js`: pure ZIP→lat/lon→farmsense fetch with 8 s timeout.
  - `src/features/catalog/plantDatabase.js`: added daysToMaturity + startIndoorsWeeksBeforeLastFrost to all 28 plants.
  - `src/components/GardenSetup.jsx`: dropped width/length; added frost-date fetch + manual override.
  - `src/components/AlmanacShell.jsx` + Agenda/Beds/Library placeholders: shell skeleton with three navigable views.
  - `src/App.jsx`: restore from localStorage on boot; ErrorBoundary preserved.
  - Deleted: GardenPlanner.jsx, Sidebar.jsx, src/features/planner/, tests/planner.test.js, tests/keyboardShortcuts.test.js.
- Verification: `npm run lint` clean, `npm test` all suites pass (planSchema, planReducer, frostDates, catalog), `npm run build` succeeds. Manual smoke: setup wizard → almanac shell → view-switching → auto-save survives reload.
- Decisions made: DEC-0002 (Almanac product redirection, schema-v2 clean break).
- Open issues/blockers: None.
- Next actions:
  - Plan 2 — Library + Beds (LibraryView, AddPlantForm, BedsView, BedDetail, BedFootprint, footprint.js).
  - Plan 3 — Agenda (agenda.js engine, AgendaView, mark-task-done flow).
```

- [ ] **Step 2: Note the marker is still IN_PROGRESS**

In `docs/work-index.md`, leave `WB-ARCH-0003` as `IN_PROGRESS` (Plans 2 and 3 are still pending). Bump the Updated cell to 2026-05-27.

- [ ] **Step 3: Final commit**

```bash
git add docs/session-log.md docs/work-index.md
git commit -m "WB-ARCH-0003: session log + work-index (Plan 1 complete)"
```

- [ ] **Step 4: Print bundle size and final status**

```bash
git log --oneline -12 && npm run build 2>&1 | tail -10
```

This is the end of Plan 1. The app is now bed-shaped infrastructure with empty views; Plans 2 and 3 fill them in.

---

## Spec coverage check (self-review)

| Spec section | Covered by |
|---|---|
| §2.1 Agenda view | Placeholder only (Plan 3 fills it in) |
| §2.2 Beds view | Placeholder only (Plan 2 fills it in) |
| §2.3 Library view | Placeholder only (Plan 2 fills it in) |
| §3 Data model | Task 1 (schema) + Task 2 (reducer) |
| §3.1 Catalog schema additions | Task 3 |
| §4 Bed footprint | Plan 2 |
| §5 Calendar engine | Plan 3 |
| §6 Delete old code | Task 9 |
| §7 Keep ZIP-lookup + zone + companion data + reducer pattern + save/load | Tasks 3, 5, 6, 8 |
| §7 Frost-date API | Task 4 + Task 5 |
| §8 Architecture (folder layout) | Tasks 1, 2, 4, 6, 7 |
| §9 Migration: clean break | Task 1 (`validatePlanFile` rejects v1) |
| §10 DEC + risk + Gate 2 threat model | Task 0 (DEC-0002 includes threat model) |
| §10 Test budget (pure modules tested) | Tasks 1, 2, 4 |
| §12 Success criteria — "Saving and reloading a plan produces an identical agenda" | Tasks 6, 8 (round-trip via JSON + localStorage) |

Open scope (intentional):
- "Mark done" UI flow (reducer action `MARK_TASK_DONE` is built in Task 2; the UI lives in Plan 3)
- "Could plant now" toggle (Plan 3)
- Photos (out of scope per spec §10)
