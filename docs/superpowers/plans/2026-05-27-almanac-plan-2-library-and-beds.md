# Willowbrook Almanac — Plan 2 Implementation Plan (Library + Beds)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Library and Beds placeholders with the full bed-centric workflow described in the Plan 2 design spec: a card-grid plant library with manual/Wikidata-assisted custom-plant entry, a bed cards view + Add Bed modal, a BedDetail page with editable plantings table + journal + history, and the pure `footprint.js` packing algorithm rendered as an emoji preview. After this plan, a user can create beds, populate them with plantings (drawing from the bundled 28 + their own custom plants), see a footprint preview, and journal — all without leaving the Almanac shell.

**Architecture:** Pure modules under `features/{library,beds,catalog}/` carry the real logic (`footprint.js`, `wikidataLookup.js`, `libraryFilters.js`, `catalog.js` helpers) and are unit-tested with `node:test`. React components consume those modules and dispatch existing v2 reducer actions; no new reducer actions, no schema bump. AlmanacShell gains a `selectedBedId` state to route between `BedsView` and `BedDetail` without a router dependency.

**Tech stack:** React 19, Vite, Tailwind, lucide-react, `node:test`. No new runtime dependencies.

**Companion docs:**
- Spec: `docs/superpowers/specs/2026-05-27-willowbrook-almanac-plan-2-design.md`
- Parent: `docs/superpowers/specs/2026-05-27-willowbrook-almanac-design.md`, `docs/decisions/DEC-0002.md`
- Marker: `WB-ARCH-0003` (already `IN_PROGRESS` from Plan 1)
- Project rules: `CLAUDE.md` — every commit references `WB-ARCH-0003`

---

## File map

**Create:**
- `src/features/library/libraryFilters.js` — pure search + category filter
- `src/features/library/wikidataLookup.js` — pure fetch + normalize (DI-friendly)
- `src/features/library/AddPlantForm.jsx` — drawer form + Wikidata lookup
- `src/features/beds/footprint.js` — pure packing algorithm
- `src/features/beds/BedFootprint.jsx` — `<pre>` grid + legend + overflow warning
- `src/features/beds/BedDetail.jsx` — header + plantings + footprint + journal + history
- `tests/libraryFilters.test.js`
- `tests/wikidataLookup.test.js`
- `tests/footprint.test.js`

**Modify:**
- `src/features/catalog/catalog.js` — add `getAllPlants(plan)` and `getPlantsById(plan)`
- `src/features/library/LibraryView.jsx` — replace placeholder with real grid
- `src/features/beds/BedsView.jsx` — replace placeholder with cards + Add Bed modal + empty state
- `src/components/AlmanacShell.jsx` — add `selectedBedId` state; route Beds tab between list and detail
- `tests/catalog.test.js` — append tests for the two new helpers
- `docs/session-log.md` — append Plan 2 session entry
- `docs/work-index.md` — leave marker as `IN_PROGRESS` (Plan 3 still pending); bump Updated date

---

## Task 1: Catalog helpers — `getAllPlants` + `getPlantsById`

**Why first:** Every Library and Beds component needs to merge bundled and user-added plants into a single lookup. Pure, easily testable, no UI dependencies.

**Files:**
- Modify: `src/features/catalog/catalog.js`
- Modify: `tests/catalog.test.js`

- [ ] **Step 1: Add failing tests**

Append to `tests/catalog.test.js`:

```js
import { getAllPlants, getPlantsById } from '../src/features/catalog/catalog.js';

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
    // Custom plants normally use UUIDs, but if someone hand-edits a plan
    // and re-uses a bundled id, the custom plant should win deterministically.
    const shadow = { id: 'tomato', name: 'My Tomato', isUserAdded: true };
    const map = getPlantsById({ customPlants: [shadow] });
    assert.equal(map.tomato, shadow);
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm test
```

Expected: 5 new tests fail with `getAllPlants is not a function` / `getPlantsById is not a function`. The 6 existing catalog/frostDates/planSchema/planReducer tests still pass.

- [ ] **Step 3: Implement the helpers**

Append to `src/features/catalog/catalog.js`:

```js
export function getAllPlants(plan) {
    const custom = Array.isArray(plan?.customPlants) ? plan.customPlants : [];
    return [...PLANT_DATABASE, ...custom];
}

export function getPlantsById(plan) {
    const map = {};
    for (const p of PLANT_DATABASE) map[p.id] = p;
    const custom = Array.isArray(plan?.customPlants) ? plan.customPlants : [];
    for (const p of custom) map[p.id] = p;  // custom wins on collision
    return map;
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm test
```

Expected: all tests pass, including the 5 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/features/catalog/catalog.js tests/catalog.test.js
git commit -m "WB-ARCH-0003: catalog.getAllPlants + getPlantsById helpers"
```

---

## Task 2: Library filter helpers

**Why next:** Pure module that backs `LibraryView`'s search and category chips. Test-first so the filter semantics are nailed before UI work.

**Files:**
- Create: `src/features/library/libraryFilters.js`
- Create: `tests/libraryFilters.test.js`

- [ ] **Step 1: Write the failing test file**

Create `tests/libraryFilters.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterPlants, deriveCategoryChips } from '../src/features/library/libraryFilters.js';

const SAMPLE = [
    { id: 'tomato',   name: 'Tomato',  category: 'vegetables', notes: 'support and airflow' },
    { id: 'basil',    name: 'Basil',   category: 'herbs',      notes: 'pinch for branching' },
    { id: 'marigold', name: 'Marigold',category: 'flowers',    notes: 'deters pests' },
    { id: 'u-1', isUserAdded: true, name: 'Yardlong Bean', category: 'vegetables', notes: '' },
];

test('filterPlants returns all when search empty and category null', () => {
    assert.equal(filterPlants(SAMPLE, { search: '', category: null }).length, 4);
});

test('filterPlants matches against name case-insensitively', () => {
    const out = filterPlants(SAMPLE, { search: 'tom', category: null });
    assert.deepEqual(out.map((p) => p.id), ['tomato']);
});

test('filterPlants matches against notes substring', () => {
    const out = filterPlants(SAMPLE, { search: 'airflow', category: null });
    assert.deepEqual(out.map((p) => p.id), ['tomato']);
});

test('filterPlants filters by category', () => {
    const out = filterPlants(SAMPLE, { search: '', category: 'herbs' });
    assert.deepEqual(out.map((p) => p.id), ['basil']);
});

test('filterPlants synthetic "yours" category filters by isUserAdded', () => {
    const out = filterPlants(SAMPLE, { search: '', category: 'yours' });
    assert.deepEqual(out.map((p) => p.id), ['u-1']);
});

test('filterPlants combines search + category (AND)', () => {
    const out = filterPlants(SAMPLE, { search: 'bean', category: 'vegetables' });
    assert.deepEqual(out.map((p) => p.id), ['u-1']);
});

test('deriveCategoryChips returns sorted unique categories plus "yours" when user plants exist', () => {
    const chips = deriveCategoryChips(SAMPLE);
    assert.deepEqual(chips, ['flowers', 'herbs', 'vegetables', 'yours']);
});

test('deriveCategoryChips omits "yours" when no user plants', () => {
    const chips = deriveCategoryChips(SAMPLE.slice(0, 3));
    assert.deepEqual(chips, ['flowers', 'herbs', 'vegetables']);
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm test
```

Expected: 8 new tests fail with `Cannot find module '../src/features/library/libraryFilters.js'`.

- [ ] **Step 3: Implement the module**

Create `src/features/library/libraryFilters.js`:

```js
export function filterPlants(plants, { search = '', category = null } = {}) {
    const needle = search.trim().toLowerCase();
    return plants.filter((p) => {
        if (category === 'yours') {
            if (!p.isUserAdded) return false;
        } else if (category) {
            if (p.category !== category) return false;
        }
        if (!needle) return true;
        const hay = `${p.name ?? ''} ${p.notes ?? ''}`.toLowerCase();
        return hay.includes(needle);
    });
}

export function deriveCategoryChips(plants) {
    const set = new Set();
    let hasUserAdded = false;
    for (const p of plants) {
        if (p.category) set.add(p.category);
        if (p.isUserAdded) hasUserAdded = true;
    }
    const chips = Array.from(set).sort();
    if (hasUserAdded) chips.push('yours');
    return chips;
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm test
```

Expected: all 8 new tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/library/libraryFilters.js tests/libraryFilters.test.js
git commit -m "WB-ARCH-0003: pure libraryFilters (search + category + 'yours')"
```

---

## Task 3: Pure footprint packing algorithm

**Why next:** Hardest pure module in Plan 2. Heavy test-first so the algorithm is locked before the React renderer wraps it.

**Files:**
- Create: `src/features/beds/footprint.js`
- Create: `tests/footprint.test.js`

- [ ] **Step 1: Write the failing test file**

Create `tests/footprint.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFootprint, CELL_INCHES, EMPTY_CELL } from '../src/features/beds/footprint.js';

const TOMATO  = { id: 'tomato',  name: 'Tomato',  icon: '🍅', spacingInches: 24 };
const CARROT  = { id: 'carrot',  name: 'Carrot',  icon: '🥕', spacingInches: 3  };
const BASIL   = { id: 'basil',   name: 'Basil',   icon: '🌿', spacingInches: 12 };

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
    const filledCells = r.cells.flat().filter((c) => c === '🥕').length;
    assert.equal(filledCells, 5);  // 5 carrots × 1 cell each
    assert.deepEqual(r.legend, [{ plantId: 'carrot', name: 'Carrot', icon: '🥕', requested: 5, placed: 5 }]);
    assert.deepEqual(r.overflow, []);
});

test('carrots overflow when quantity exceeds grid cells', () => {
    // 2x2 bed = 4x4 cell grid = 16 cells; ask for 20 carrots.
    const r = computeFootprint({
        bed: { widthFt: 2, lengthFt: 2 },
        plantings: [{ plantId: 'carrot', quantity: 20 }],
        plantsById: PLANTS,
    });
    const placedCount = r.cells.flat().filter((c) => c === '🥕').length;
    assert.equal(placedCount, 16);
    assert.deepEqual(r.legend, [{ plantId: 'carrot', name: 'Carrot', icon: '🥕', requested: 20, placed: 16 }]);
    assert.deepEqual(r.overflow, [{ plantId: 'carrot', name: 'Carrot', missing: 4 }]);
});

test('multiple plants are placed big-spacing-first (deterministic)', () => {
    // Big tomato (24" = 16 cells per plant) must be stamped before tiny carrot.
    // 4x4 bed = 8x8 = 64 cells. 1 tomato (16) + 10 carrots (10) = 26 cells used.
    const r = computeFootprint({
        bed: { widthFt: 4, lengthFt: 4 },
        plantings: [
            { plantId: 'carrot', quantity: 10 },
            { plantId: 'tomato', quantity: 1 },
        ],
        plantsById: PLANTS,
    });
    // First non-empty cell must be tomato (placed first).
    const flat = r.cells.flat();
    const firstFilled = flat.find((c) => c !== EMPTY_CELL);
    assert.equal(firstFilled, '🍅');
    // Legend order: tomato first.
    assert.deepEqual(r.legend.map((e) => e.plantId), ['tomato', 'carrot']);
});

test('mixed sizes: tomato + basil + carrot all appear with correct counts', () => {
    const r = computeFootprint({
        bed: { widthFt: 4, lengthFt: 8 },
        plantings: [
            { plantId: 'tomato', quantity: 2 },  // 2 × 16 = 32 cells
            { plantId: 'basil',  quantity: 4 },  // 4 × 4  = 16 cells
            { plantId: 'carrot', quantity: 20 }, // 20 × 1 = 20 cells (total 68, fits in 128)
        ],
        plantsById: PLANTS,
    });
    const counts = r.cells.flat().reduce((acc, c) => {
        if (c !== EMPTY_CELL) acc[c] = (acc[c] || 0) + 1;
        return acc;
    }, {});
    assert.equal(counts['🍅'], 32);
    assert.equal(counts['🌿'], 16);
    assert.equal(counts['🥕'], 20);
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
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm test
```

Expected: 7 new tests fail with `Cannot find module '../src/features/beds/footprint.js'`.

- [ ] **Step 3: Implement `footprint.js`**

Create `src/features/beds/footprint.js`:

```js
export const CELL_INCHES = 6;
export const EMPTY_CELL = '·';

function cellsPerPlantFor(plant) {
    const span = Math.max(1, Math.round((plant?.spacingInches ?? CELL_INCHES) / CELL_INCHES));
    return span * span;
}

export function computeFootprint({ bed, plantings, plantsById }) {
    const gridCols = Math.floor((bed.widthFt * 12) / CELL_INCHES);
    const gridRows = Math.floor((bed.lengthFt * 12) / CELL_INCHES);
    const totalCells = gridCols * gridRows;

    const cells = Array.from({ length: gridRows }, () => Array.from({ length: gridCols }, () => EMPTY_CELL));

    // Sort: bigger spacing first, then plantId asc.
    const enriched = plantings
        .map((p) => ({ planting: p, plant: plantsById[p.plantId] }))
        .filter((e) => e.plant);

    enriched.sort((a, b) => {
        const da = b.plant.spacingInches - a.plant.spacingInches;
        if (da !== 0) return da;
        return a.planting.plantId.localeCompare(b.planting.plantId);
    });

    const legend = [];
    const overflow = [];
    let cursor = 0;  // flat index into cells

    for (const { planting, plant } of enriched) {
        const cpp = cellsPerPlantFor(plant);
        const requested = Math.max(0, Number(planting.quantity) || 0);
        let placedCells = 0;
        let placedPlants = 0;

        outer: while (placedPlants < requested) {
            for (let i = 0; i < cpp; i++) {
                if (cursor >= totalCells) break outer;
                const row = Math.floor(cursor / gridCols);
                const col = cursor % gridCols;
                cells[row][col] = plant.icon;
                cursor++;
                placedCells++;
            }
            placedPlants++;
        }

        legend.push({
            plantId: planting.plantId,
            name: plant.name,
            icon: plant.icon,
            requested,
            placed: placedPlants,
        });
        if (placedPlants < requested) {
            overflow.push({
                plantId: planting.plantId,
                name: plant.name,
                missing: requested - placedPlants,
            });
        }
    }

    return { gridCols, gridRows, cells, legend, overflow };
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm test
```

Expected: all 7 footprint tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/beds/footprint.js tests/footprint.test.js
git commit -m "WB-ARCH-0003: pure footprint packing (row-major, big-first, overflow indicator)"
```

---

## Task 4: Wikidata lookup module

**Why next:** Pure I/O wrapper for `AddPlantForm`. DI-friendly so we can test the fetch wrapper itself (timeout, non-200, malformed JSON), not just the parser.

**Files:**
- Create: `src/features/library/wikidataLookup.js`
- Create: `tests/wikidataLookup.test.js`

- [ ] **Step 1: Write the failing test file**

Create `tests/wikidataLookup.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchPlantsByName, parseWbSearchResponse, WB_SEARCH_URL } from '../src/features/library/wikidataLookup.js';

const HAPPY_FIXTURE = {
    search: [
        { id: 'Q23501', label: 'tomato', description: 'species of plant, vegetable' },
        { id: 'Q165044', label: 'Solanum lycopersicum', description: 'species in the genus Solanum' },
        { id: 'Q11789', label: 'Tomato', description: 'fictional character', /* ignored */ },
    ],
    'search-continue': 3,
    success: 1,
};

test('parseWbSearchResponse normalizes the search array to {qid, name, description}', () => {
    const out = parseWbSearchResponse(HAPPY_FIXTURE);
    assert.equal(out.length, 3);
    assert.deepEqual(out[0], { qid: 'Q23501', name: 'tomato', description: 'species of plant, vegetable' });
});

test('parseWbSearchResponse handles a missing description gracefully', () => {
    const out = parseWbSearchResponse({ search: [{ id: 'Qx', label: 'thing' }] });
    assert.equal(out[0].description, '');
});

test('parseWbSearchResponse throws on malformed input', () => {
    assert.throws(() => parseWbSearchResponse(null), /Wikidata/);
    assert.throws(() => parseWbSearchResponse({}), /Wikidata/);
    assert.throws(() => parseWbSearchResponse({ search: 'not an array' }), /Wikidata/);
});

test('WB_SEARCH_URL builds the wbsearchentities URL with origin=* for CORS', () => {
    const url = WB_SEARCH_URL('tomato');
    assert.match(url, /action=wbsearchentities/);
    assert.match(url, /search=tomato/);
    assert.match(url, /origin=%2A|origin=\*/);
    assert.match(url, /language=en/);
    assert.match(url, /format=json/);
});

test('WB_SEARCH_URL URL-encodes the query', () => {
    assert.match(WB_SEARCH_URL('bell pepper'), /search=bell%20pepper|search=bell\+pepper/);
});

test('searchPlantsByName happy path returns normalized results', async () => {
    const fakeFetch = async () => ({ ok: true, status: 200, json: async () => HAPPY_FIXTURE });
    const r = await searchPlantsByName('tomato', { fetch: fakeFetch });
    assert.equal(r.ok, true);
    assert.equal(r.results[0].qid, 'Q23501');
});

test('searchPlantsByName surfaces non-2xx as an error result', async () => {
    const fakeFetch = async () => ({ ok: false, status: 503, json: async () => ({}) });
    const r = await searchPlantsByName('tomato', { fetch: fakeFetch });
    assert.equal(r.ok, false);
    assert.match(r.error, /Wikidata/);
});

test('searchPlantsByName surfaces AbortError as a timeout result', async () => {
    const fakeFetch = async () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; };
    const r = await searchPlantsByName('tomato', { fetch: fakeFetch });
    assert.equal(r.ok, false);
    assert.match(r.error, /timed out|Wikidata/i);
});

test('searchPlantsByName surfaces malformed JSON as an error result', async () => {
    const fakeFetch = async () => ({ ok: true, status: 200, json: async () => ({ /* missing search */ }) });
    const r = await searchPlantsByName('tomato', { fetch: fakeFetch });
    assert.equal(r.ok, false);
    assert.match(r.error, /Wikidata/);
});

test('searchPlantsByName rejects empty query without hitting the network', async () => {
    let called = false;
    const fakeFetch = async () => { called = true; return { ok: true, json: async () => HAPPY_FIXTURE }; };
    const r = await searchPlantsByName('   ', { fetch: fakeFetch });
    assert.equal(r.ok, false);
    assert.equal(called, false);
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm test
```

Expected: 10 new tests fail with `Cannot find module '../src/features/library/wikidataLookup.js'`.

- [ ] **Step 3: Implement `wikidataLookup.js`**

Create `src/features/library/wikidataLookup.js`:

```js
const DEFAULT_TIMEOUT_MS = 8000;

export function WB_SEARCH_URL(query, { limit = 5, language = 'en' } = {}) {
    const params = new URLSearchParams({
        action: 'wbsearchentities',
        search: query,
        language,
        format: 'json',
        type: 'item',
        limit: String(limit),
        origin: '*',
    });
    return `https://www.wikidata.org/w/api.php?${params.toString()}`;
}

export function parseWbSearchResponse(payload) {
    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.search)) {
        throw new Error('Wikidata response missing "search" array');
    }
    return payload.search.map((item) => ({
        qid: item.id,
        name: item.label ?? '',
        description: item.description ?? '',
    }));
}

export async function searchPlantsByName(query, { fetch: fetchFn = globalThis.fetch, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
    const q = String(query ?? '').trim();
    if (!q) return { ok: false, error: 'Enter a plant name to search.' };

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const resp = await fetchFn(WB_SEARCH_URL(q), { signal: controller.signal });
        if (!resp.ok) {
            return { ok: false, error: `Wikidata returned ${resp.status}.` };
        }
        const payload = await resp.json();
        const results = parseWbSearchResponse(payload);
        return { ok: true, results };
    } catch (err) {
        if (err?.name === 'AbortError') {
            return { ok: false, error: 'Wikidata lookup timed out — fill in the plant by hand.' };
        }
        return { ok: false, error: `Wikidata lookup failed: ${err?.message ?? 'unknown error'}` };
    } finally {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', onAbort);
    }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
npm test
```

Expected: all 10 wikidata tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/library/wikidataLookup.js tests/wikidataLookup.test.js
git commit -m "WB-ARCH-0003: wikidata wbsearchentities lookup (DI fetch, 8s timeout)"
```

---

## Task 5: AddPlantForm (manual mode only)

**Why next:** A self-contained drawer component. Building manual-mode first keeps the test surface narrow — Wikidata wiring is its own task. No unit tests per spec principle ("React components don't get tests in v1"); lint clean + build clean is the gate.

**Files:**
- Create: `src/features/library/AddPlantForm.jsx`

- [ ] **Step 1: Implement the component**

Create `src/features/library/AddPlantForm.jsx`:

```jsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { actions } from '../plan/planReducer.js';
import { getAllPlants } from '../catalog/catalog.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pickCategoryFromDescription(desc) {
    const d = String(desc || '').toLowerCase();
    if (d.includes('vegetable')) return 'vegetables';
    if (d.includes('herb')) return 'herbs';
    if (d.includes('flower')) return 'flowers';
    return null;
}

function blankForm() {
    return {
        name: '',
        category: '',
        icon: '🌱',
        spacingInches: 12,
        daysToMaturity: 60,
        startIndoorsWeeksBeforeLastFrost: 0,
        plantingWindowStart: 3,
        plantingWindowEnd: 8,
        goodNeighbors: [],
        avoidNeighbors: [],
        notes: '',
    };
}

function formFromPlant(plant) {
    return {
        name: plant.name ?? '',
        category: plant.category ?? '',
        icon: plant.icon ?? '🌱',
        spacingInches: plant.spacingInches ?? 12,
        daysToMaturity: plant.daysToMaturity ?? 60,
        startIndoorsWeeksBeforeLastFrost: plant.startIndoorsWeeksBeforeLastFrost ?? 0,
        plantingWindowStart: plant.plantingWindow?.start ?? 3,
        plantingWindowEnd: plant.plantingWindow?.end ?? 8,
        goodNeighbors: plant.goodNeighbors ?? [],
        avoidNeighbors: plant.avoidNeighbors ?? [],
        notes: plant.notes ?? '',
    };
}

export default function AddPlantForm({ plan, dispatch, editPlantId = null, onClose }) {
    const allPlants = getAllPlants(plan);
    const existingCategories = Array.from(new Set(allPlants.map((p) => p.category).filter(Boolean))).sort();
    const editTarget = editPlantId ? plan.customPlants.find((p) => p.id === editPlantId) : null;

    const [form, setForm] = useState(editTarget ? formFromPlant(editTarget) : blankForm());
    const [categoryMode, setCategoryMode] = useState('existing');  // 'existing' | 'new'
    const [errors, setErrors] = useState({});

    const set = (patch) => setForm((f) => ({ ...f, ...patch }));

    function validate() {
        const e = {};
        if (!form.name.trim()) e.name = 'Name is required.';
        if (!form.category.trim()) e.category = 'Category is required.';
        if ([...form.icon].length < 1) e.icon = 'Icon must be at least one character.';
        if (!Number.isFinite(+form.spacingInches) || +form.spacingInches < 0) e.spacingInches = 'Must be ≥ 0.';
        if (!Number.isFinite(+form.daysToMaturity) || +form.daysToMaturity < 0) e.daysToMaturity = 'Must be ≥ 0.';
        if (!Number.isFinite(+form.startIndoorsWeeksBeforeLastFrost) || +form.startIndoorsWeeksBeforeLastFrost < 0) {
            e.startIndoorsWeeksBeforeLastFrost = 'Must be ≥ 0.';
        }
        return e;
    }

    function handleSubmit(ev) {
        ev.preventDefault();
        const e = validate();
        setErrors(e);
        if (Object.keys(e).length > 0) return;

        const payload = {
            name: form.name.trim(),
            category: form.category.trim(),
            icon: form.icon,
            spacingInches: +form.spacingInches,
            daysToMaturity: +form.daysToMaturity,
            startIndoorsWeeksBeforeLastFrost: +form.startIndoorsWeeksBeforeLastFrost,
            plantingWindow: { start: +form.plantingWindowStart, end: +form.plantingWindowEnd },
            goodNeighbors: form.goodNeighbors,
            avoidNeighbors: form.avoidNeighbors,
            notes: form.notes,
            isUserAdded: true,
        };

        if (editPlantId) {
            dispatch(actions.updateCustomPlant(editPlantId, payload));
        } else {
            dispatch(actions.addCustomPlant({ id: crypto.randomUUID(), ...payload }));
        }
        onClose?.();
    }

    return (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose}>
            <aside className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-lg overflow-y-auto"
                onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between px-4 py-3 border-b">
                    <h3 className="font-semibold">{editPlantId ? 'Edit plant' : 'Add a plant'}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
                </header>

                <form onSubmit={handleSubmit} className="p-4 space-y-4 text-sm">
                    <Field label="Name" error={errors.name}>
                        <input type="text" value={form.name} onChange={(e) => set({ name: e.target.value })}
                            className="border rounded px-2 py-1 w-full" />
                    </Field>

                    <Field label="Category" error={errors.category}>
                        {categoryMode === 'existing' ? (
                            <select value={form.category} onChange={(e) => {
                                if (e.target.value === '__new__') setCategoryMode('new');
                                else set({ category: e.target.value });
                            }} className="border rounded px-2 py-1 w-full">
                                <option value="">— select —</option>
                                {existingCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                                <option value="__new__">+ new category…</option>
                            </select>
                        ) : (
                            <div className="flex gap-2">
                                <input type="text" value={form.category} onChange={(e) => set({ category: e.target.value })}
                                    placeholder="new category" className="border rounded px-2 py-1 flex-1" />
                                <button type="button" onClick={() => setCategoryMode('existing')}
                                    className="text-xs text-gray-600 underline">use existing</button>
                            </div>
                        )}
                    </Field>

                    <Field label="Icon (emoji or character)" error={errors.icon}>
                        <input type="text" value={form.icon} onChange={(e) => set({ icon: e.target.value })}
                            className="border rounded px-2 py-1 w-20 text-2xl text-center" />
                    </Field>

                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Spacing (in)" error={errors.spacingInches}>
                            <input type="number" min="0" value={form.spacingInches}
                                onChange={(e) => set({ spacingInches: e.target.value })}
                                className="border rounded px-2 py-1 w-full" />
                        </Field>
                        <Field label="Days to maturity" error={errors.daysToMaturity}>
                            <input type="number" min="0" value={form.daysToMaturity}
                                onChange={(e) => set({ daysToMaturity: e.target.value })}
                                className="border rounded px-2 py-1 w-full" />
                        </Field>
                        <Field label="Indoor weeks before last frost" error={errors.startIndoorsWeeksBeforeLastFrost}>
                            <input type="number" min="0" value={form.startIndoorsWeeksBeforeLastFrost}
                                onChange={(e) => set({ startIndoorsWeeksBeforeLastFrost: e.target.value })}
                                className="border rounded px-2 py-1 w-full" />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Window start month">
                            <select value={form.plantingWindowStart}
                                onChange={(e) => set({ plantingWindowStart: +e.target.value })}
                                className="border rounded px-2 py-1 w-full">
                                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                            </select>
                        </Field>
                        <Field label="Window end month">
                            <select value={form.plantingWindowEnd}
                                onChange={(e) => set({ plantingWindowEnd: +e.target.value })}
                                className="border rounded px-2 py-1 w-full">
                                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                            </select>
                        </Field>
                    </div>

                    <NeighborMultiSelect label="Good neighbors" value={form.goodNeighbors} all={allPlants}
                        onChange={(ids) => set({ goodNeighbors: ids })} />
                    <NeighborMultiSelect label="Avoid neighbors" value={form.avoidNeighbors} all={allPlants}
                        onChange={(ids) => set({ avoidNeighbors: ids })} />

                    <Field label="Notes">
                        <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })}
                            className="border rounded px-2 py-1 w-full h-20" />
                    </Field>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                        <button type="button" onClick={onClose}
                            className="px-3 py-1.5 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="submit"
                            className="px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800">
                            {editPlantId ? 'Save changes' : 'Add plant'}
                        </button>
                    </div>
                </form>
            </aside>
        </div>
    );
}

function Field({ label, error, children }) {
    return (
        <label className="block">
            <span className="block text-xs font-medium text-gray-700 mb-1">{label}</span>
            {children}
            {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
        </label>
    );
}

function NeighborMultiSelect({ label, value, all, onChange }) {
    return (
        <Field label={`${label} (optional)`}>
            <select multiple size="4" value={value}
                onChange={(e) => onChange(Array.from(e.target.selectedOptions).map((o) => o.value))}
                className="border rounded px-2 py-1 w-full">
                {all.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
            </select>
        </Field>
    );
}

// Re-export the small helper so Task 6 can reuse it without duplicating the regex.
export { pickCategoryFromDescription };
```

- [ ] **Step 2: Run lint to verify it parses and follows hooks rules**

```bash
npm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Run build to verify the bundle compiles**

```bash
npm run build
```

Expected: build succeeds. (Component is not yet imported anywhere; tree-shaking may drop it. That's fine — Task 7 wires it in.)

- [ ] **Step 4: Commit**

```bash
git add src/features/library/AddPlantForm.jsx
git commit -m "WB-ARCH-0003: AddPlantForm drawer (manual entry, validation, edit mode)"
```

---

## Task 6: Wire Wikidata `Look up online` into AddPlantForm

**Files:**
- Modify: `src/features/library/AddPlantForm.jsx`

- [ ] **Step 1: Add the lookup UI and state**

Modify `src/features/library/AddPlantForm.jsx`. Add these imports at the top:

```jsx
import { Search } from 'lucide-react';
import { searchPlantsByName } from './wikidataLookup.js';
```

Inside the `AddPlantForm` function body, after the existing `useState` calls, add:

```jsx
const [lookup, setLookup] = useState({ status: 'idle', results: [], error: null });
const [usedCandidate, setUsedCandidate] = useState(false);

async function handleLookup() {
    if (!form.name.trim()) {
        setLookup({ status: 'error', results: [], error: 'Enter a plant name to search.' });
        return;
    }
    setLookup({ status: 'loading', results: [], error: null });
    const r = await searchPlantsByName(form.name);
    if (r.ok) setLookup({ status: 'ok', results: r.results, error: null });
    else setLookup({ status: 'error', results: [], error: r.error });
}

function applyCandidate(c) {
    const patch = { name: c.name };
    const inferred = pickCategoryFromDescription(c.description);
    if (inferred && !form.category) patch.category = inferred;
    set(patch);
    setUsedCandidate(true);
    setLookup({ status: 'idle', results: [], error: null });
}
```

- [ ] **Step 2: Insert the lookup affordance above the Name field**

In the form JSX, immediately *before* the existing `<Field label="Name" ...>` block, add:

```jsx
<div className="border rounded p-3 bg-gray-50">
    <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-700">Optional: pre-fill from Wikidata</span>
        <button type="button" onClick={handleLookup}
            disabled={lookup.status === 'loading'}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded bg-white hover:bg-gray-100 disabled:opacity-50">
            <Search size={12} /> {lookup.status === 'loading' ? 'Searching…' : 'Look up online'}
        </button>
    </div>
    {lookup.status === 'error' && (
        <p className="text-xs text-red-600 mb-1">{lookup.error}</p>
    )}
    {lookup.status === 'ok' && lookup.results.length === 0 && (
        <p className="text-xs text-gray-600">No matches. Fill in by hand.</p>
    )}
    {lookup.status === 'ok' && lookup.results.length > 0 && (
        <ul className="space-y-1">
            {lookup.results.map((c) => (
                <li key={c.qid}>
                    <button type="button" onClick={() => applyCandidate(c)}
                        className="text-left text-xs w-full px-2 py-1 border rounded bg-white hover:bg-green-50">
                        <span className="font-medium">{c.name}</span>
                        {c.description && <span className="text-gray-600"> — {c.description}</span>}
                    </button>
                </li>
            ))}
        </ul>
    )}
    {usedCandidate && (
        <p className="text-[10px] text-gray-500 mt-2">data via Wikidata (CC0)</p>
    )}
</div>
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/features/library/AddPlantForm.jsx
git commit -m "WB-ARCH-0003: AddPlantForm wires Wikidata 'Look up online' (fail-soft inline)"
```

---

## Task 7: LibraryView — real implementation

**Files:**
- Modify: `src/features/library/LibraryView.jsx`

- [ ] **Step 1: Replace the placeholder with the real view**

Overwrite `src/features/library/LibraryView.jsx` with:

```jsx
import React, { useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { getAllPlants } from '../catalog/catalog.js';
import { filterPlants, deriveCategoryChips } from './libraryFilters.js';
import AddPlantForm from './AddPlantForm.jsx';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function MonthStrip({ window }) {
    if (!window) return null;
    const active = new Set();
    const { start, end } = window;
    if (start <= end) {
        for (let i = start; i <= end; i++) active.add(i);
    } else {
        for (let i = start; i <= 11; i++) active.add(i);
        for (let i = 0; i <= end; i++) active.add(i);
    }
    return (
        <div className="flex gap-0.5 text-[10px] mt-1">
            {MONTHS.map((m, i) => (
                <span key={i}
                    className={`w-4 h-4 inline-flex items-center justify-center rounded-sm ${
                        active.has(i) ? 'bg-green-200 text-green-900' : 'bg-gray-100 text-gray-400'
                    }`}>{m}</span>
            ))}
        </div>
    );
}

export default function LibraryView({ plan, dispatch }) {
    const allPlants = getAllPlants(plan);
    const categories = deriveCategoryChips(allPlants);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [formMode, setFormMode] = useState(null);  // null | 'create' | { editPlantId }

    const filtered = filterPlants(allPlants, { search, category });

    return (
        <div className="p-6">
            <header className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Library</h2>
                <button onClick={() => setFormMode('create')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800">
                    <Plus size={16} /> Add a plant
                </button>
            </header>

            <div className="flex flex-col md:flex-row gap-3 mb-4">
                <input type="search" placeholder="Search plants by name or notes…"
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 border rounded px-3 py-1.5 text-sm" />
                <div className="flex flex-wrap gap-1">
                    <Chip active={category === null} onClick={() => setCategory(null)}>all</Chip>
                    {categories.map((c) => (
                        <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map((p) => (
                    <article key={p.id}
                        className="border rounded p-3 bg-white hover:shadow-sm cursor-pointer"
                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-2xl">{p.icon}</div>
                                <div className="font-medium">{p.name}</div>
                                <div className="text-xs text-gray-600">{p.category}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {p.isUserAdded && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">yours</span>
                                )}
                                {p.isUserAdded && (
                                    <button onClick={(e) => { e.stopPropagation(); setFormMode({ editPlantId: p.id }); }}
                                        className="p-1 hover:bg-gray-100 rounded" title="Edit">
                                        <Pencil size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-2">
                            <div>Spacing: {p.spacingInches}″ · DTM: {p.daysToMaturity}d</div>
                            <MonthStrip window={p.plantingWindow} />
                        </div>
                        {expandedId === p.id && (
                            <div className="mt-3 pt-3 border-t text-xs space-y-2">
                                {p.notes && <p className="text-gray-700">{p.notes}</p>}
                                {(p.goodNeighbors?.length > 0) && (
                                    <p><span className="font-medium text-green-700">Good with:</span> {p.goodNeighbors.join(', ')}</p>
                                )}
                                {(p.avoidNeighbors?.length > 0) && (
                                    <p><span className="font-medium text-red-700">Avoid:</span> {p.avoidNeighbors.join(', ')}</p>
                                )}
                                {p.sourceRefs?.length > 0 && (
                                    <details>
                                        <summary className="text-gray-500 cursor-pointer">Sources</summary>
                                        <ul className="list-disc pl-4 mt-1 text-gray-600">
                                            {p.sourceRefs.map((ref, i) => (
                                                <li key={i}>
                                                    <a href={ref.url} target="_blank" rel="noreferrer" className="underline">{ref.title}</a>
                                                    {ref.publisher && <span> — {ref.publisher}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                )}
                            </div>
                        )}
                    </article>
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-full text-center text-sm text-gray-500 py-8">
                        No plants match. Try clearing filters or adding one.
                    </div>
                )}
            </div>

            {formMode === 'create' && (
                <AddPlantForm plan={plan} dispatch={dispatch} onClose={() => setFormMode(null)} />
            )}
            {formMode && formMode.editPlantId && (
                <AddPlantForm plan={plan} dispatch={dispatch} editPlantId={formMode.editPlantId}
                    onClose={() => setFormMode(null)} />
            )}
        </div>
    );
}

function Chip({ active, onClick, children }) {
    return (
        <button onClick={onClick}
            className={`text-xs px-2 py-1 rounded border ${
                active ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}>{children}</button>
    );
}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

Open the app, click into Library tab. Verify:
- 28 bundled plants show as cards in the grid.
- Search input filters live (try `tom`).
- Category chips work; `all` resets.
- Clicking a card expands notes/companions/sources.
- `+ Add a plant` opens the drawer; submitting a manual plant adds a card with a `yours` badge.
- `Look up online` returns Wikidata candidates when online; on a clearly broken case it shows an inline error and the form remains usable.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/features/library/LibraryView.jsx
git commit -m "WB-ARCH-0003: LibraryView card grid + search + category chips + Add Plant"
```

---

## Task 8: BedsView — cards, Add Bed modal, empty state

**Files:**
- Modify: `src/features/beds/BedsView.jsx`

- [ ] **Step 1: Replace the placeholder**

Overwrite `src/features/beds/BedsView.jsx` with:

```jsx
import React, { useState } from 'react';
import { Plus, Sprout, X } from 'lucide-react';
import { actions } from '../plan/planReducer.js';
import { getPlantsById } from '../catalog/catalog.js';

function summarizePlantings(plantings, plantsById) {
    if (plantings.length === 0) return 'No plantings yet';
    const counts = {};
    for (const p of plantings) {
        const name = plantsById[p.plantId]?.name ?? p.plantId;
        counts[name] = (counts[name] || 0) + p.quantity;
    }
    const entries = Object.entries(counts);
    const shown = entries.slice(0, 3).map(([n, q]) => `${q} ${n}`);
    const extra = entries.length - 3;
    return extra > 0 ? `${shown.join(' · ')} · +${extra} more` : shown.join(' · ');
}

export default function BedsView({ plan, dispatch, onSelectBed }) {
    const [showAdd, setShowAdd] = useState(false);
    const plantsById = getPlantsById(plan);

    const activeByBed = plan.beds.map((bed) => ({
        bed,
        active: plan.plantings.filter((p) => p.bedId === bed.id && p.status !== 'harvested' && p.status !== 'removed'),
    }));

    if (plan.beds.length === 0) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-center">
                <Sprout size={48} className="text-green-700 mb-4" />
                <h2 className="text-xl font-semibold text-gray-800 mb-2">No beds yet</h2>
                <p className="text-sm text-gray-600 mb-6">Create your first bed to start tracking plantings.</p>
                <button onClick={() => setShowAdd(true)}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800">
                    <Plus size={16} /> Add bed
                </button>
                {showAdd && <AddBedModal dispatch={dispatch} onClose={() => setShowAdd(false)} />}
            </div>
        );
    }

    return (
        <div className="p-6">
            <header className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Beds</h2>
                <button onClick={() => setShowAdd(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800">
                    <Plus size={16} /> Add bed
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {activeByBed.map(({ bed, active }) => (
                    <button key={bed.id} onClick={() => onSelectBed(bed.id)}
                        className="text-left border rounded p-4 bg-white hover:shadow-sm">
                        <div className="font-medium">{bed.name}</div>
                        <div className="text-xs text-gray-600">{bed.widthFt}′ × {bed.lengthFt}′</div>
                        <div className="text-sm mt-2">{summarizePlantings(active, plantsById)}</div>
                    </button>
                ))}
            </div>

            {showAdd && <AddBedModal dispatch={dispatch} onClose={() => setShowAdd(false)} />}
        </div>
    );
}

function AddBedModal({ dispatch, onClose }) {
    const [name, setName] = useState('');
    const [widthFt, setWidthFt] = useState('4');
    const [lengthFt, setLengthFt] = useState('8');
    const [errors, setErrors] = useState({});

    function submit(e) {
        e.preventDefault();
        const next = {};
        if (!name.trim()) next.name = 'Bed name is required.';
        if (!Number.isFinite(+widthFt) || +widthFt <= 0) next.widthFt = 'Must be > 0.';
        if (!Number.isFinite(+lengthFt) || +lengthFt <= 0) next.lengthFt = 'Must be > 0.';
        setErrors(next);
        if (Object.keys(next).length > 0) return;

        dispatch(actions.addBed({
            id: crypto.randomUUID(),
            name: name.trim(),
            widthFt: +widthFt,
            lengthFt: +lengthFt,
        }));
        onClose();
    }

    return (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white rounded shadow-lg p-4 w-80" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Add bed</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={16} /></button>
                </header>
                <form onSubmit={submit} className="space-y-3 text-sm">
                    <label className="block">
                        <span className="block text-xs font-medium text-gray-700 mb-1">Name</span>
                        <input value={name} onChange={(e) => setName(e.target.value)}
                            className="border rounded px-2 py-1 w-full" autoFocus />
                        {errors.name && <span className="text-xs text-red-600">{errors.name}</span>}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="block text-xs font-medium text-gray-700 mb-1">Width (ft)</span>
                            <input type="number" min="0.5" step="0.5" value={widthFt}
                                onChange={(e) => setWidthFt(e.target.value)}
                                className="border rounded px-2 py-1 w-full" />
                            {errors.widthFt && <span className="text-xs text-red-600">{errors.widthFt}</span>}
                        </label>
                        <label className="block">
                            <span className="block text-xs font-medium text-gray-700 mb-1">Length (ft)</span>
                            <input type="number" min="0.5" step="0.5" value={lengthFt}
                                onChange={(e) => setLengthFt(e.target.value)}
                                className="border rounded px-2 py-1 w-full" />
                            {errors.lengthFt && <span className="text-xs text-red-600">{errors.lengthFt}</span>}
                        </label>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t">
                        <button type="button" onClick={onClose}
                            className="px-3 py-1.5 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="submit"
                            className="px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800">Add</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Run lint and build**

```bash
npm run lint && npm run build
```

Expected: 0 errors; build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/features/beds/BedsView.jsx
git commit -m "WB-ARCH-0003: BedsView cards + empty state + Add Bed modal"
```

---

## Task 9: AlmanacShell — selectedBedId routing

**Files:**
- Modify: `src/components/AlmanacShell.jsx`

- [ ] **Step 1: Add selectedBedId state and route the Beds tab**

Edit `src/components/AlmanacShell.jsx`:

Replace the import line:

```jsx
import BedsView from '../features/beds/BedsView';
```

with:

```jsx
import BedsView from '../features/beds/BedsView';
import BedDetail from '../features/beds/BedDetail';
```

Replace the body of `AlmanacShell` so it tracks a selected bed. Specifically, replace the existing `useState` for `view` and the `main` rendering block. After the existing `useState` calls, the file should read:

```jsx
const [view, setView] = useState('agenda');
const [selectedBedId, setSelectedBedId] = useState(null);
const [loadError, setLoadError] = useState(null);
const { handleSave, handleLoad } = usePlanIO({ plan: state.plan, dispatch, setLoadError });
```

And the `<main>` block becomes:

```jsx
<main className="flex-1 overflow-auto bg-white">
    {view === 'agenda' && <AgendaView plan={state.plan} dispatch={dispatch} />}
    {view === 'beds' && !selectedBedId && (
        <BedsView plan={state.plan} dispatch={dispatch} onSelectBed={setSelectedBedId} />
    )}
    {view === 'beds' && selectedBedId && (
        <BedDetail plan={state.plan} dispatch={dispatch} bedId={selectedBedId}
            onBack={() => setSelectedBedId(null)} />
    )}
    {view === 'library' && <LibraryView plan={state.plan} dispatch={dispatch} />}
</main>
```

Also: when the user clicks the left-rail Beds icon, reset `selectedBedId` so they land on the list. Replace the existing `onClick={() => setView(id)}` in the rail nav with:

```jsx
onClick={() => {
    if (id === 'beds') setSelectedBedId(null);
    setView(id);
}}
```

- [ ] **Step 2: Create a temporary BedDetail stub so the build succeeds**

Create `src/features/beds/BedDetail.jsx` with a minimal stub (Tasks 10-13 fill it in):

```jsx
import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function BedDetail({ plan, bedId, onBack }) {
    const bed = plan.beds.find((b) => b.id === bedId);
    if (!bed) return (
        <div className="p-6">
            <button onClick={onBack} className="text-sm underline">← back to beds</button>
            <p className="mt-4 text-sm text-gray-600">Bed not found.</p>
        </div>
    );
    return (
        <div className="p-6">
            <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-gray-700 hover:underline">
                <ArrowLeft size={14} /> Back to beds
            </button>
            <h2 className="text-xl font-semibold mt-2">{bed.name}</h2>
            <p className="text-xs text-gray-600">{bed.widthFt}′ × {bed.lengthFt}′</p>
            <p className="mt-4 text-sm text-gray-500">Sections coming in next tasks.</p>
        </div>
    );
}
```

- [ ] **Step 3: Run lint and build**

```bash
npm run lint && npm run build
```

Expected: 0 errors; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/AlmanacShell.jsx src/features/beds/BedDetail.jsx
git commit -m "WB-ARCH-0003: AlmanacShell selectedBedId routing + BedDetail stub"
```

---

## Task 10: BedDetail — header strip, rename/resize, remove bed

**Files:**
- Modify: `src/features/beds/BedDetail.jsx`

- [ ] **Step 1: Implement the header strip**

Overwrite `src/features/beds/BedDetail.jsx` with:

```jsx
import React, { useState } from 'react';
import { ArrowLeft, Pencil, Trash2, Check, X } from 'lucide-react';
import { actions } from '../plan/planReducer.js';

export default function BedDetail({ plan, dispatch, bedId, onBack }) {
    const bed = plan.beds.find((b) => b.id === bedId);
    const [editing, setEditing] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [draft, setDraft] = useState(null);

    if (!bed) {
        return (
            <div className="p-6">
                <button onClick={onBack} className="text-sm underline">← back to beds</button>
                <p className="mt-4 text-sm text-gray-600">Bed not found.</p>
            </div>
        );
    }

    function startEdit() {
        setDraft({ name: bed.name, widthFt: String(bed.widthFt), lengthFt: String(bed.lengthFt) });
        setEditing(true);
    }

    function saveEdit() {
        const widthFt = +draft.widthFt;
        const lengthFt = +draft.lengthFt;
        if (!draft.name.trim() || !Number.isFinite(widthFt) || widthFt <= 0 || !Number.isFinite(lengthFt) || lengthFt <= 0) {
            return;  // ignore invalid input; user keeps editing
        }
        dispatch(actions.updateBed(bed.id, {
            name: draft.name.trim(),
            widthFt,
            lengthFt,
        }));
        setEditing(false);
    }

    function handleRemove() {
        dispatch(actions.removeBed(bed.id));
        onBack();
    }

    return (
        <div className="p-6 space-y-6">
            <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-gray-700 hover:underline">
                <ArrowLeft size={14} /> Back to beds
            </button>

            {!editing && (
                <header className="flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">{bed.name}</h2>
                        <p className="text-xs text-gray-600">{bed.widthFt}′ × {bed.lengthFt}′</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={startEdit}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-gray-50">
                            <Pencil size={12} /> Edit
                        </button>
                        {!confirmRemove ? (
                            <button onClick={() => setConfirmRemove(true)}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 border border-red-300 text-red-700 rounded hover:bg-red-50">
                                <Trash2 size={12} /> Remove bed
                            </button>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-xs">
                                Remove bed and all its plantings?
                                <button onClick={handleRemove}
                                    className="px-2 py-1 bg-red-600 text-white rounded">Yes, remove</button>
                                <button onClick={() => setConfirmRemove(false)}
                                    className="px-2 py-1 border rounded">Cancel</button>
                            </span>
                        )}
                    </div>
                </header>
            )}

            {editing && (
                <header className="flex items-end gap-2 flex-wrap">
                    <label className="block">
                        <span className="block text-xs font-medium text-gray-700">Name</span>
                        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                            className="border rounded px-2 py-1" />
                    </label>
                    <label className="block">
                        <span className="block text-xs font-medium text-gray-700">Width (ft)</span>
                        <input type="number" min="0.5" step="0.5" value={draft.widthFt}
                            onChange={(e) => setDraft({ ...draft, widthFt: e.target.value })}
                            className="border rounded px-2 py-1 w-20" />
                    </label>
                    <label className="block">
                        <span className="block text-xs font-medium text-gray-700">Length (ft)</span>
                        <input type="number" min="0.5" step="0.5" value={draft.lengthFt}
                            onChange={(e) => setDraft({ ...draft, lengthFt: e.target.value })}
                            className="border rounded px-2 py-1 w-20" />
                    </label>
                    <button onClick={saveEdit}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-700 text-white rounded">
                        <Check size={12} /> Save
                    </button>
                    <button onClick={() => setEditing(false)}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded">
                        <X size={12} /> Cancel
                    </button>
                </header>
            )}

            <p className="text-sm text-gray-500">Plantings, footprint, journal and history come in next tasks.</p>
        </div>
    );
}
```

- [ ] **Step 2: Run lint and build**

```bash
npm run lint && npm run build
```

Expected: 0 errors; build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/features/beds/BedDetail.jsx
git commit -m "WB-ARCH-0003: BedDetail header (rename/resize + remove-with-confirm)"
```

---

## Task 11: BedDetail — current plantings table + Add Planting inline row

**Files:**
- Modify: `src/features/beds/BedDetail.jsx`

- [ ] **Step 1: Add imports**

In `src/features/beds/BedDetail.jsx`, expand the top imports:

```jsx
import React, { useState } from 'react';
import { ArrowLeft, Pencil, Trash2, Check, X, Plus } from 'lucide-react';
import { actions } from '../plan/planReducer.js';
import { getAllPlants, getPlantsById } from '../catalog/catalog.js';
import { PLANTING_STATUS_VALUES } from '../plan/planSchema.js';
```

- [ ] **Step 2: Insert the plantings section above the placeholder line**

Just before the existing `<p className="text-sm text-gray-500">Plantings, footprint, ...` line, insert:

```jsx
<PlantingsSection plan={plan} dispatch={dispatch} bedId={bed.id} />
```

Then below the `BedDetail` function, append these new component definitions:

```jsx
function PlantingsSection({ plan, dispatch, bedId }) {
    const allPlants = getAllPlants(plan);
    const plantsById = getPlantsById(plan);
    const current = plan.plantings.filter(
        (p) => p.bedId === bedId && p.status !== 'harvested' && p.status !== 'removed'
    );

    const [adding, setAdding] = useState(false);

    return (
        <section>
            <h3 className="font-semibold mb-2">Current plantings</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                    <thead>
                        <tr className="text-left text-xs text-gray-600 border-b">
                            <th className="py-1 pr-2">Icon</th>
                            <th className="py-1 pr-2">Plant</th>
                            <th className="py-1 pr-2">Qty</th>
                            <th className="py-1 pr-2">Status</th>
                            <th className="py-1 pr-2">Date planted</th>
                            <th className="py-1 pr-2">Notes</th>
                            <th className="py-1 pr-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {current.length === 0 && (
                            <tr><td colSpan="7" className="text-xs text-gray-500 py-2">No plantings yet.</td></tr>
                        )}
                        {current.map((p) => (
                            <PlantingRow key={p.id} planting={p} plant={plantsById[p.plantId]} dispatch={dispatch} />
                        ))}
                    </tbody>
                </table>
            </div>

            {!adding && (
                <button onClick={() => setAdding(true)}
                    className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-gray-50">
                    <Plus size={12} /> Add planting
                </button>
            )}
            {adding && (
                <AddPlantingRow bedId={bedId} allPlants={allPlants} dispatch={dispatch}
                    onDone={() => setAdding(false)} />
            )}
        </section>
    );
}

function PlantingRow({ planting, plant, dispatch }) {
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [draftQty, setDraftQty] = useState(String(planting.quantity));
    const [draftNotes, setDraftNotes] = useState(planting.notes ?? '');

    function commitQty() {
        const n = parseInt(draftQty, 10);
        if (!Number.isFinite(n) || n < 1) {
            setDraftQty(String(planting.quantity));
            return;
        }
        if (n !== planting.quantity) dispatch(actions.updatePlanting(planting.id, { quantity: n }));
    }

    function commitNotes() {
        if (draftNotes !== (planting.notes ?? '')) dispatch(actions.updatePlanting(planting.id, { notes: draftNotes }));
    }

    return (
        <tr className="border-b last:border-0">
            <td className="py-1 pr-2 text-xl">{plant?.icon ?? '?'}</td>
            <td className="py-1 pr-2">{plant?.name ?? planting.plantId}</td>
            <td className="py-1 pr-2">
                <input type="number" min="1" value={draftQty}
                    onChange={(e) => setDraftQty(e.target.value)}
                    onBlur={commitQty}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    className="border rounded px-1 py-0.5 w-16" />
            </td>
            <td className="py-1 pr-2">
                <select value={planting.status}
                    onChange={(e) => dispatch(actions.updatePlanting(planting.id, { status: e.target.value }))}
                    className="border rounded px-1 py-0.5">
                    {PLANTING_STATUS_VALUES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
            </td>
            <td className="py-1 pr-2">
                <input type="date" value={planting.datePlanted ?? ''}
                    onChange={(e) => dispatch(actions.updatePlanting(planting.id, { datePlanted: e.target.value || null }))}
                    className="border rounded px-1 py-0.5" />
            </td>
            <td className="py-1 pr-2">
                <input type="text" value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    onBlur={commitNotes}
                    className="border rounded px-1 py-0.5 w-40" />
            </td>
            <td className="py-1 pr-2">
                {!confirmRemove ? (
                    <button onClick={() => setConfirmRemove(true)}
                        className="text-xs text-gray-500 hover:text-red-600">×</button>
                ) : (
                    <span className="text-xs">
                        Remove?
                        <button onClick={() => dispatch(actions.removePlanting(planting.id))}
                            className="ml-1 px-1 bg-red-600 text-white rounded">Yes</button>
                        <button onClick={() => setConfirmRemove(false)}
                            className="ml-1 px-1 border rounded">No</button>
                    </span>
                )}
            </td>
        </tr>
    );
}

function AddPlantingRow({ bedId, allPlants, dispatch, onDone }) {
    const [plantId, setPlantId] = useState(allPlants[0]?.id ?? '');
    const [quantity, setQuantity] = useState('1');
    const [status, setStatus] = useState('planned');
    const [datePlanted, setDatePlanted] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState(null);

    function submit(e) {
        e.preventDefault();
        const qty = parseInt(quantity, 10);
        if (!plantId) { setError('Pick a plant.'); return; }
        if (!Number.isFinite(qty) || qty < 1) { setError('Quantity ≥ 1.'); return; }
        dispatch(actions.addPlanting({
            id: crypto.randomUUID(),
            bedId,
            plantId,
            quantity: qty,
            status,
            datePlanted: datePlanted || null,
            notes,
        }));
        setQuantity('1');
        setStatus('planned');
        setDatePlanted('');
        setNotes('');
        setError(null);
        // keep `adding` true so the user can quickly add another; focus the plant select.
    }

    return (
        <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2 text-sm border-t pt-3">
            <label>
                <span className="block text-xs text-gray-600">Plant</span>
                <select value={plantId} onChange={(e) => setPlantId(e.target.value)}
                    className="border rounded px-1 py-0.5" autoFocus>
                    {allPlants.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                </select>
            </label>
            <label>
                <span className="block text-xs text-gray-600">Qty</span>
                <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                    className="border rounded px-1 py-0.5 w-16" />
            </label>
            <label>
                <span className="block text-xs text-gray-600">Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                    className="border rounded px-1 py-0.5">
                    {PLANTING_STATUS_VALUES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
            </label>
            <label>
                <span className="block text-xs text-gray-600">Date</span>
                <input type="date" value={datePlanted} onChange={(e) => setDatePlanted(e.target.value)}
                    className="border rounded px-1 py-0.5" />
            </label>
            <label className="flex-1 min-w-40">
                <span className="block text-xs text-gray-600">Notes</span>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                    className="border rounded px-1 py-0.5 w-full" />
            </label>
            <button type="submit"
                className="px-2 py-1 bg-green-700 text-white rounded text-xs">Add</button>
            <button type="button" onClick={onDone}
                className="px-2 py-1 border rounded text-xs">Done</button>
            {error && <p className="text-xs text-red-600 w-full">{error}</p>}
        </form>
    );
}
```

- [ ] **Step 2: Run lint and build**

```bash
npm run lint && npm run build
```

Expected: 0 errors; build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/features/beds/BedDetail.jsx
git commit -m "WB-ARCH-0003: BedDetail plantings table + inline Add Planting row"
```

---

## Task 12: BedDetail — journal + history sections

**Files:**
- Modify: `src/features/beds/BedDetail.jsx`

- [ ] **Step 1: Insert the two new sections**

In `src/features/beds/BedDetail.jsx`, replace the line `<p className="text-sm text-gray-500">Plantings, footprint, journal and history come in next tasks.</p>` (left over from Task 10) with:

```jsx
<JournalSection plan={plan} dispatch={dispatch} bedId={bed.id} />
<HistorySection plan={plan} bedId={bed.id} />
```

Then append the two new components to the bottom of the file:

```jsx
function JournalSection({ plan, dispatch, bedId }) {
    const [text, setText] = useState('');
    const today = new Date().toISOString().slice(0, 10);
    const entries = plan.journal
        .filter((j) => j.bedId === bedId)
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1));

    function submit(e) {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;
        dispatch(actions.addJournalEntry({
            id: crypto.randomUUID(),
            bedId,
            date: today,
            text: trimmed,
        }));
        setText('');
    }

    return (
        <section>
            <h3 className="font-semibold mb-2">Journal</h3>
            <form onSubmit={submit} className="flex gap-2 mb-3">
                <input type="text" value={text} onChange={(e) => setText(e.target.value)}
                    placeholder={`Add entry for ${today}…`}
                    className="flex-1 border rounded px-2 py-1 text-sm" />
                <button type="submit"
                    className="px-2 py-1 bg-green-700 text-white rounded text-xs">Add entry</button>
            </form>
            {entries.length === 0 ? (
                <p className="text-xs text-gray-500">No journal entries yet.</p>
            ) : (
                <ul className="space-y-1 text-sm">
                    {entries.map((j) => (
                        <li key={j.id} className="border-b last:border-0 py-1">
                            <span className="text-xs text-gray-500">{j.date}</span>
                            <span className="ml-2">{j.text}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function HistorySection({ plan, bedId }) {
    const [open, setOpen] = useState(false);
    const plantsById = getPlantsById(plan);
    const past = plan.plantings
        .filter((p) => p.bedId === bedId && (p.status === 'harvested' || p.status === 'removed'))
        .slice()
        .sort((a, b) => {
            if (a.datePlanted === b.datePlanted) return a.id.localeCompare(b.id);
            if (a.datePlanted === null) return 1;
            if (b.datePlanted === null) return -1;
            return a.datePlanted < b.datePlanted ? 1 : -1;
        });

    return (
        <section>
            <button onClick={() => setOpen((o) => !o)}
                className="font-semibold flex items-center gap-1 text-sm">
                {open ? '▾' : '▸'} History ({past.length})
            </button>
            {open && (
                <div className="overflow-x-auto mt-2">
                    <table className="min-w-full text-sm border-collapse">
                        <thead>
                            <tr className="text-left text-xs text-gray-600 border-b">
                                <th className="py-1 pr-2">Icon</th>
                                <th className="py-1 pr-2">Plant</th>
                                <th className="py-1 pr-2">Qty</th>
                                <th className="py-1 pr-2">Status</th>
                                <th className="py-1 pr-2">Date planted</th>
                                <th className="py-1 pr-2">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {past.length === 0 && (
                                <tr><td colSpan="6" className="text-xs text-gray-500 py-2">No history yet.</td></tr>
                            )}
                            {past.map((p) => (
                                <tr key={p.id} className="border-b last:border-0 text-gray-700">
                                    <td className="py-1 pr-2 text-xl">{plantsById[p.plantId]?.icon ?? '?'}</td>
                                    <td className="py-1 pr-2">{plantsById[p.plantId]?.name ?? p.plantId}</td>
                                    <td className="py-1 pr-2">{p.quantity}</td>
                                    <td className="py-1 pr-2">{p.status.replace(/_/g, ' ')}</td>
                                    <td className="py-1 pr-2">{p.datePlanted ?? '—'}</td>
                                    <td className="py-1 pr-2">{p.notes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
```

- [ ] **Step 2: Run lint and build**

```bash
npm run lint && npm run build
```

Expected: 0 errors; build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/features/beds/BedDetail.jsx
git commit -m "WB-ARCH-0003: BedDetail journal + collapsible history sections"
```

---

## Task 13: BedFootprint — render the packing as `<pre>` + legend + overflow

**Files:**
- Create: `src/features/beds/BedFootprint.jsx`
- Modify: `src/features/beds/BedDetail.jsx`

- [ ] **Step 1: Create the renderer**

Create `src/features/beds/BedFootprint.jsx`:

```jsx
import React from 'react';
import { computeFootprint } from './footprint.js';

export default function BedFootprint({ bed, plantings, plantsById }) {
    const { cells, legend, overflow, gridCols, gridRows } = computeFootprint({ bed, plantings, plantsById });

    return (
        <section>
            <h3 className="font-semibold mb-2">Bed footprint</h3>
            <p className="text-xs text-gray-500 mb-2">
                Bed: {bed.name} ({bed.widthFt}′ × {bed.lengthFt}′) — {gridCols} × {gridRows} cells at 6″ each.
            </p>
            <pre className="text-base leading-tight font-mono bg-gray-50 p-2 rounded border inline-block max-w-full overflow-x-auto">
                {cells.map((row) => row.join(' ')).join('\n')}
            </pre>
            {legend.length > 0 && (
                <ul className="mt-2 text-xs space-y-0.5">
                    {legend.map((e) => (
                        <li key={e.plantId}>
                            <span className="text-base">{e.icon}</span> {e.name} × {e.placed}
                            {e.placed < e.requested && (
                                <span className="text-amber-700"> (of {e.requested} requested)</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {overflow.length > 0 && (
                <ul className="mt-2 text-xs text-amber-700 space-y-0.5">
                    {overflow.map((o) => (
                        <li key={o.plantId}>
                            ⚠️ {o.missing} {o.name.toLowerCase()} don&apos;t fit in this {bed.widthFt}′ × {bed.lengthFt}′ bed.
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
```

- [ ] **Step 2: Wire it into BedDetail**

In `src/features/beds/BedDetail.jsx`:

Add this import at the top:

```jsx
import BedFootprint from './BedFootprint.jsx';
```

Inside the `BedDetail` component's return, between the `<PlantingsSection ... />` and `<JournalSection ... />` lines, insert:

```jsx
<BedFootprint
    bed={bed}
    plantings={plan.plantings.filter((p) => p.bedId === bed.id && p.status !== 'harvested' && p.status !== 'removed')}
    plantsById={getPlantsById(plan)}
/>
```

- [ ] **Step 3: Run lint and build**

```bash
npm run lint && npm run build
```

Expected: 0 errors; build succeeds.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

In the app:
- Create a bed (e.g., "Backyard West", 4 × 8).
- Add 3 tomatoes, 12 basil, 24 carrots.
- Verify the footprint shows tomatoes first (big-spacing first), basil and carrots fill remaining cells, and legend counts match.
- Add 60 carrots into a 2 × 2 bed; verify the overflow warning appears.
- Mark one planting as `harvested`; confirm it disappears from current plantings, the footprint redraws without it, and it shows in History.
- Write a journal entry; reload the page (auto-save means it should persist via localStorage from Plan 1).

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/features/beds/BedFootprint.jsx src/features/beds/BedDetail.jsx
git commit -m "WB-ARCH-0003: BedFootprint pre/emoji preview with legend + overflow warning"
```

---

## Task 14: Verification + handoff

**Files:**
- Modify: `docs/work-index.md`
- Modify: `docs/session-log.md`

- [ ] **Step 1: Run the full verification suite**

```bash
npm run lint
npm test
npm run build
```

Expected: lint clean (0 errors, 0 warnings); all tests pass (foundation tests from Plan 1 + 5 new catalog tests + 8 libraryFilters + 7 footprint + 10 wikidata = 24 + 30 = 54 total, roughly); build succeeds. Note the dist JS size from `npm run build` output.

- [ ] **Step 2: Confirm bundle size is within budget**

The Plan 2 spec §9 sets a budget of "≤ 213 kB JS" (Plan 1's shipped size). Read the size reported by `vite build` in step 1.

If the bundle is over budget, stop here and surface to the user — do NOT proceed to the work-index/session-log update. (Common culprits: an accidental `import * from 'lucide-react'`, an oversized fixture, an unintended dependency.)

- [ ] **Step 3: Update work-index Updated date**

In `docs/work-index.md`, leave the `WB-ARCH-0003` row's Status as `IN_PROGRESS` (Plan 3 is still pending). Update the `Updated` column to today's date (`2026-05-27`).

- [ ] **Step 4: Append the Plan 2 session-log entry**

Append a new entry to `docs/session-log.md` (newest at the top per project pattern), with this structure (fill in the actuals from your run):

```markdown
### 2026-05-27 - Session 8

- Markers: `WB-ARCH-0003` (Plan 2 of 3 — Library + Beds)
- Objective: Replace the Library and Beds placeholders with the full bed-centric workflow: card-grid Library + AddPlantForm (manual + Wikidata lookup), Beds cards + Add Bed modal + BedDetail with editable plantings + journal + history, and the pure footprint.js packing rendered as BedFootprint.
- Work completed:
  - `src/features/catalog/catalog.js`: added `getAllPlants(plan)` and `getPlantsById(plan)` helpers (5 new tests).
  - `src/features/library/libraryFilters.js`: pure search + category-chip helpers (8 tests).
  - `src/features/beds/footprint.js`: pure 6"×6"-cell row-major packing with deterministic big-spacing-first order and overflow indicator (7 tests).
  - `src/features/library/wikidataLookup.js`: DI-fetch `wbsearchentities` lookup with 8s `AbortController` timeout (10 tests: parser + URL builder + 4 fetch flows).
  - `src/features/library/AddPlantForm.jsx`: right-side drawer, manual entry + edit mode, `🔍 Look up online` button wiring Wikidata candidates with fail-soft inline error.
  - `src/features/library/LibraryView.jsx`: real implementation (search + category chips + card grid + expand-on-click + `yours` badge + edit pencil for custom plants).
  - `src/features/beds/BedsView.jsx`: cards + Add Bed modal + sprout empty state.
  - `src/components/AlmanacShell.jsx`: `selectedBedId` state, route Beds tab between list and detail; left-rail Beds tap resets selection.
  - `src/features/beds/BedDetail.jsx`: header with rename/resize + remove-with-confirm, plantings table with inline editable Qty/Status/Date/Notes + Add Planting row, BedFootprint section, journal entry input + list, collapsible history table.
  - `src/features/beds/BedFootprint.jsx`: `<pre>` grid + legend + amber overflow warnings.
- Verification: `npm run lint` clean, `npm test` <N> pass (Plan 1's <prev> + 30 new), `npm run build` succeeds (<size> kB JS, ≤ 213 kB budget). Manual smoke test against the dev server: bed-add, multi-status plantings, custom plant via manual form, custom plant via Wikidata, footprint render with and without overflow, journal entries, history.
- Decisions made: None — all design decisions were captured in the Plan 2 spec.
- Open issues/blockers: None.
- Next actions:
  - Plan 3 (Agenda) — `agenda.js` engine + `AgendaView` + mark-task-done wiring. The bed-card "next task" line stub (BedsView.jsx) will be wired then. Plan 3 spec/brainstorm not yet started.
```

- [ ] **Step 5: Commit and verify clean tree**

```bash
git add docs/work-index.md docs/session-log.md
git commit -m "WB-ARCH-0003: Plan 2 verification + session log + work-index"
git status
```

Expected: clean tree.

---

## Self-review notes

Coverage check against the spec:

- §2.1 LibraryView (grid, search, chips, expand, `yours` badge, edit pencil) — Task 7 ✓
- §2.2 AddPlantForm (drawer, manual + Wikidata, CC0 credit) — Tasks 5 + 6 ✓
- §3.1 BedsView (cards, Add Bed modal, empty state, planting summary) — Task 8 ✓. Next-task line is explicitly stubbed; spec calls this out.
- §3.2 BedDetail (header + rename/resize/remove, plantings table with inline edits + Add Planting, footprint, journal, history with `null`-datePlanted tiebreaker) — Tasks 9–13 ✓
- §4 footprint.js (algorithm + CELL_INCHES + EMPTY_CELL constants, deterministic order, overflow) — Task 3 ✓
- §5 catalog helpers (`getAllPlants`, `getPlantsById`) — Task 1 ✓
- §6 wikidataLookup (`wbsearchentities`, 8s timeout, DI fetch, fail-soft) — Task 4 + integrated in Task 6 ✓
- §7 validation (bed dims > 0, planting qty ≥ 1, AddPlantForm field validation, overflow as warning not error) — Tasks 5, 8, 11, 13 ✓
- §10 threat-model deltas (8s timeout, strict shape validation, `origin=*`, no eval, no dangerouslySetInnerHTML) — Task 4 ✓
- §11 testing (footprint, wikidata, libraryFilters) — Tasks 1–4 ✓
- §13 success criteria (round-trip persistence, lint clean, build under budget) — Task 14 ✓

No placeholders, no "implement later" steps. Type names and method signatures match across tasks (`getAllPlants`, `getPlantsById`, `actions.addBed`/`updateBed`/`removeBed`/`addPlanting`/`updatePlanting`/`removePlanting`/`addJournalEntry`/`addCustomPlant`/`updateCustomPlant`, `PLANTING_STATUS_VALUES`, `computeFootprint`, `searchPlantsByName`, `parseWbSearchResponse`, `WB_SEARCH_URL`).
