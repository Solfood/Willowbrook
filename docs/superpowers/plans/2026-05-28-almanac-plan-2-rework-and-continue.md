# Willowbrook Almanac — Plan 2 Rework + Continue

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconcile warren's session-9 output (`origin/main` at `02a4da3`) with the Plan 2 design spec, then finish the remaining 10+ tasks that warren skipped. After this plan, the Library and Beds views are real, AddPlantForm with Wikidata lookup works, BedDetail renders plantings + footprint + journal + history, and the success criteria in spec §13 are met.

**Why this exists:** Session 9 (warren) implemented Task 1 from the original plan correctly, partially implemented Tasks 2–4 with material API/algorithm deviations from the spec, and skipped Tasks 5–13 entirely. This plan brings the divergent modules back in line and resumes UI work.

**Architecture:** Same as the original Plan 2 design — pure modules under `features/{library,beds,catalog}/`, React components that consume them, no schema/reducer changes. AlmanacShell gains `selectedBedId` routing.

**Tech stack:** React 19, Vite, Tailwind, lucide-react, `node:test`. No new runtime dependencies.

**Companion docs:**
- Spec: `docs/superpowers/specs/2026-05-27-willowbrook-almanac-plan-2-design.md`
- Original plan (still mostly applicable, but superseded by this for sequencing): `docs/superpowers/plans/2026-05-27-almanac-plan-2-library-and-beds.md`
- Marker: `WB-ARCH-0003` (already `IN_PROGRESS`)
- Project rules: `CLAUDE.md` — every commit references `WB-ARCH-0003`; commits follow the `WB-ARCH-0003: <subject>` convention (NOT conventional-commits)

---

## What warren built that this plan keeps

- **`src/features/catalog/catalog.js`** — `getAllPlants(plan)`, `getPlantsById(plan)`. Matches spec exactly. **Keep as-is.**
- **`src/features/library/libraryFilters.js`** — `filterPlants`, `getCategories`. Pure, tested. **Extend** (Task 2): rename to spec names + add `yours` synthetic chip support.
- **`tests/libraryFilters.test.js`** — 12 cases, all green. Will need updates as the API renames; keep the bones.
- **The 30 pure-module tests warren wrote** that don't depend on the rewritten modules.

## What this plan removes or replaces

- **`NEXT.md`** at the repo root — deleted in Task 1. Duplicates `docs/work-index.md` + `docs/session-log.md`.
- **`src/features/beds/footprint.js`** — algorithm and contract diverge from spec §4. **Replace** (Task 3).
- **`src/features/beds/BedFootprint.jsx`** — props shape and overflow rendering diverge from spec §4. **Replace** (Task 4).
- **`src/features/catalog/wikidataLookup.js`** — uses SPARQL where spec §6 explicitly chose `wbsearchentities`; wrong function name, wrong return shape, wrong location. **Replace + relocate** (Task 5).
- **`tests/footprint.test.js`** and **`tests/wikidataLookup.test.js`** — bound to the wrong contracts. **Replace.**
- **`src/features/library/LibraryView.jsx`** — current version is a stub with scope-creep `Clone` button. **Replace** (Task 8). Keep the Export-my-plants affordance (warren earned that one); drop Clone in favor of the real `AddPlantForm`.

## File map

**Create:**
- `src/features/library/AddPlantForm.jsx`
- `src/features/library/wikidataLookup.js` (replaces the catalog/ version)
- `src/features/beds/BedDetail.jsx`
- `tests/wikidataLookup.test.js` (replaces; relocated import path)

**Modify:**
- `src/features/library/libraryFilters.js` — rename API + add `yours` chip
- `src/features/library/LibraryView.jsx` — rewrite to spec; keep Export, drop Clone
- `src/features/beds/footprint.js` — rewrite to spec algorithm
- `src/features/beds/BedFootprint.jsx` — rewrite to spec contract
- `src/features/beds/BedsView.jsx` — cards + Add Bed modal + empty state
- `src/components/AlmanacShell.jsx` — `selectedBedId` routing
- `tests/libraryFilters.test.js` — adapt to renamed API + add `yours` cases
- `tests/footprint.test.js` — replace bound test cases
- `docs/session-log.md` — append Session 10 (rework) and Session 11 (continue)
- `docs/work-index.md` — bump Updated

**Delete:**
- `NEXT.md`
- `src/features/catalog/wikidataLookup.js` (the SPARQL version)

---

## Task 1: Cleanup — delete `NEXT.md` and the misplaced SPARQL lookup

**Why first:** Both files compete with what comes next. Easier to delete now than to merge-conflict against.

**Files:**
- Delete: `NEXT.md`
- Delete: `src/features/catalog/wikidataLookup.js`

- [ ] **Step 1: Confirm a clean working tree on main, up to date with origin**

```bash
git status
git pull --ff-only origin main
```

Expected: clean tree, already up to date (HEAD = `02a4da3`).

- [ ] **Step 2: Delete the two files**

```bash
git rm NEXT.md src/features/catalog/wikidataLookup.js
```

- [ ] **Step 3: Drop the SPARQL test file too**

```bash
git rm tests/wikidataLookup.test.js
```

Task 5 re-creates it bound to the correct module.

- [ ] **Step 4: Run lint + tests**

```bash
npm run lint
npm test
```

Expected: lint clean; tests fall from 63 to 52 (11 wikidata tests removed). All remaining tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "WB-ARCH-0003: drop NEXT.md and SPARQL wikidataLookup (rework prep)"
```

---

## Task 2: libraryFilters — rename to spec API + add `yours` synthetic chip

**Files:**
- Modify: `src/features/library/libraryFilters.js`
- Modify: `tests/libraryFilters.test.js`

- [ ] **Step 1: Update the test file to drive the new API**

Open `tests/libraryFilters.test.js` and replace its body with:

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

test('filterPlants treats whitespace-only search as empty', () => {
    assert.equal(filterPlants(SAMPLE, { search: '   ', category: null }).length, 4);
});

test('deriveCategoryChips returns sorted unique categories plus "yours" when user plants exist', () => {
    assert.deepEqual(deriveCategoryChips(SAMPLE), ['flowers', 'herbs', 'vegetables', 'yours']);
});

test('deriveCategoryChips omits "yours" when no user plants', () => {
    assert.deepEqual(deriveCategoryChips(SAMPLE.slice(0, 3)), ['flowers', 'herbs', 'vegetables']);
});

test('deriveCategoryChips skips plants with no category', () => {
    const noCat = [...SAMPLE, { id: 'x', name: 'Nameless' }];
    assert.deepEqual(deriveCategoryChips(noCat), ['flowers', 'herbs', 'vegetables', 'yours']);
});
```

- [ ] **Step 2: Run tests and confirm failure**

```bash
npm test
```

Expected: all 10 libraryFilters tests fail with `deriveCategoryChips is not exported`. Other tests still pass.

- [ ] **Step 3: Rewrite the module to match**

Overwrite `src/features/library/libraryFilters.js` with:

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

- [ ] **Step 4: Run tests and confirm pass**

```bash
npm test
```

Expected: all 10 libraryFilters tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/library/libraryFilters.js tests/libraryFilters.test.js
git commit -m "WB-ARCH-0003: libraryFilters — rename to spec API + add 'yours' chip"
```

---

## Task 3: Rewrite `footprint.js` to spec algorithm

**Files:**
- Modify: `src/features/beds/footprint.js`
- Modify: `tests/footprint.test.js`

- [ ] **Step 1: Replace the test file with the spec-aligned cases**

Overwrite `tests/footprint.test.js` with:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFootprint, CELL_INCHES, EMPTY_CELL } from '../src/features/beds/footprint.js';

const TOMATO = { id: 'tomato', name: 'Tomato', icon: '🍅', spacingInches: 24 };
const CARROT = { id: 'carrot', name: 'Carrot', icon: '🥕', spacingInches: 3  };
const BASIL  = { id: 'basil',  name: 'Basil',  icon: '🌿', spacingInches: 12 };

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
    const filled = r.cells.flat().filter((c) => c === '🥕').length;
    assert.equal(filled, 5);
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
    const placed = r.cells.flat().filter((c) => c === '🥕').length;
    assert.equal(placed, 16);
    assert.deepEqual(r.legend, [{ plantId: 'carrot', name: 'Carrot', icon: '🥕', requested: 20, placed: 16 }]);
    assert.deepEqual(r.overflow, [{ plantId: 'carrot', name: 'Carrot', missing: 4 }]);
});

test('multiple plants are placed big-spacing-first (deterministic)', () => {
    const r = computeFootprint({
        bed: { widthFt: 4, lengthFt: 4 },
        plantings: [
            { plantId: 'carrot', quantity: 10 },
            { plantId: 'tomato', quantity: 1 },
        ],
        plantsById: PLANTS,
    });
    const flat = r.cells.flat();
    const firstFilled = flat.find((c) => c !== EMPTY_CELL);
    assert.equal(firstFilled, '🍅');
    assert.deepEqual(r.legend.map((e) => e.plantId), ['tomato', 'carrot']);
});

test('mixed sizes: tomato + basil + carrot all appear with correct counts', () => {
    const r = computeFootprint({
        bed: { widthFt: 4, lengthFt: 8 },
        plantings: [
            { plantId: 'tomato', quantity: 2 },
            { plantId: 'basil',  quantity: 4 },
            { plantId: 'carrot', quantity: 20 },
        ],
        plantsById: PLANTS,
    });
    const counts = r.cells.flat().reduce((acc, c) => {
        if (c !== EMPTY_CELL) acc[c] = (acc[c] || 0) + 1;
        return acc;
    }, {});
    assert.equal(counts['🍅'], 32);  // 2 × 16
    assert.equal(counts['🌿'], 16);  // 4 × 4
    assert.equal(counts['🥕'], 20);  // 20 × 1
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

Expected: all 7 footprint tests fail (old `computeFootprint` has wrong signature, no `CELL_INCHES` / `EMPTY_CELL` export, wrong return shape).

- [ ] **Step 3: Rewrite the module to spec**

Overwrite `src/features/beds/footprint.js` with:

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
    let cursor = 0;

    for (const { planting, plant } of enriched) {
        const cpp = cellsPerPlantFor(plant);
        const requested = Math.max(0, Number(planting.quantity) || 0);
        let placedPlants = 0;

        outer: while (placedPlants < requested) {
            for (let i = 0; i < cpp; i++) {
                if (cursor >= totalCells) break outer;
                const row = Math.floor(cursor / gridCols);
                const col = cursor % gridCols;
                cells[row][col] = plant.icon;
                cursor++;
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

Note: this fully replaces the file. The old `buildLegend` helper is no longer needed — `legend` is part of the `computeFootprint` return value now.

- [ ] **Step 4: Run tests and confirm pass**

```bash
npm test
```

Expected: all 7 footprint tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/beds/footprint.js tests/footprint.test.js
git commit -m "WB-ARCH-0003: rewrite footprint to spec (6\" cells, big-first, per-plant overflow)"
```

---

## Task 4: Rewrite `BedFootprint.jsx` against the new contract

**Files:**
- Modify: `src/features/beds/BedFootprint.jsx`

- [ ] **Step 1: Overwrite the component**

Overwrite `src/features/beds/BedFootprint.jsx` with:

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

Props are now `{ bed, plantings, plantsById }` (the spec contract). Callers must pre-filter and supply `plantsById`. No internal `useMemo`; the parent passes pre-computed inputs.

- [ ] **Step 2: Lint + build**

```bash
npm run lint && npm run build
```

Expected: 0 errors; build succeeds. (Bundle should drop slightly — we removed an icon import.)

- [ ] **Step 3: Commit**

```bash
git add src/features/beds/BedFootprint.jsx
git commit -m "WB-ARCH-0003: BedFootprint — match new computeFootprint contract"
```

---

## Task 5: Wikidata lookup — `wbsearchentities`, correct contract, in `library/`

**Files:**
- Create: `src/features/library/wikidataLookup.js`
- Create: `tests/wikidataLookup.test.js`

(The previous `src/features/catalog/wikidataLookup.js` was deleted in Task 1.)

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
        { id: 'Q11789', label: 'Tomato', description: 'fictional character' },
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
    const fakeFetch = async () => ({ ok: true, status: 200, json: async () => ({}) });
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

Expected: 10 wikidata tests fail with `Cannot find module '../src/features/library/wikidataLookup.js'`.

- [ ] **Step 3: Implement the module**

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

- [ ] **Step 4: Run tests and confirm pass**

```bash
npm test
```

Expected: all 10 wikidata tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/library/wikidataLookup.js tests/wikidataLookup.test.js
git commit -m "WB-ARCH-0003: wikidataLookup via wbsearchentities (no SPARQL, DI fetch, 8s timeout)"
```

---

## Tasks 6–14: AddPlantForm, LibraryView, BedsView, AlmanacShell routing, BedDetail

These tasks are **unchanged from the original plan**. Follow them as written, with two small adaptations called out below.

**Reference:** `docs/superpowers/plans/2026-05-27-almanac-plan-2-library-and-beds.md`

- **Task 6** ≡ original Task 5: AddPlantForm manual mode.
- **Task 7** ≡ original Task 6: wire Wikidata `Look up online`.
  **Adaptation:** the import in the original plan reads `import { searchPlantsByName } from './wikidataLookup.js';` — this is now correct because the module lives in `features/library/` as of Task 5 above.
- **Task 8** ≡ original Task 7: LibraryView replacement.
  **Adaptation:** the original plan replaces the entire LibraryView with the spec'd grid. Add the `Export my plants` affordance back in (warren's working code, worth keeping). Specifically: import `Download` from lucide-react, add the `exportCustomPlants(customPlants, gardenName)` helper, and add an `Export my plants` button next to `+ Add a plant` in the header. The button is disabled when `plan.customPlants.length === 0`. Do NOT bring the `Clone to My Plants` button across — AddPlantForm replaces it.
- **Task 9** ≡ original Task 8: BedsView with cards + Add Bed + empty state.
- **Task 10** ≡ original Task 9: AlmanacShell `selectedBedId` routing.
- **Task 11** ≡ original Task 10: BedDetail header strip + rename/resize + remove.
- **Task 12** ≡ original Task 11: BedDetail plantings table + Add Planting row.
- **Task 13** ≡ original Task 12: BedDetail journal + history.
- **Task 14** ≡ original Task 13: wire `BedFootprint` into BedDetail.

Each commit must use the `WB-ARCH-0003: <subject>` convention (not conventional-commits).

### Concrete adaptation for Task 8 (LibraryView Export-button add)

In the LibraryView code from the original plan's Task 7, **before** the closing `</header>`, change the imports and header block.

Replace this import:

```jsx
import { Plus, Pencil } from 'lucide-react';
```

with:

```jsx
import { Plus, Pencil, Download } from 'lucide-react';
```

Add this helper near the top of the file, above `LibraryView`:

```jsx
function exportCustomPlants(customPlants, gardenName) {
    const payload = JSON.stringify(customPlants, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(gardenName || 'garden').replace(/\s+/g, '-').toLowerCase()}-my-plants.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
```

Replace the header block:

```jsx
<header className="flex items-center justify-between mb-4">
    <h2 className="text-xl font-semibold text-gray-800">Library</h2>
    <button onClick={() => setFormMode('create')}
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800">
        <Plus size={16} /> Add a plant
    </button>
</header>
```

with:

```jsx
<header className="flex items-center justify-between mb-4">
    <h2 className="text-xl font-semibold text-gray-800">Library</h2>
    <div className="flex items-center gap-2">
        <button
            disabled={!plan?.customPlants?.length}
            onClick={() => exportCustomPlants(plan.customPlants, plan?.garden?.name)}
            title={plan?.customPlants?.length ? 'Export your custom plants as JSON' : 'No custom plants yet'}
            className="inline-flex items-center gap-1 px-3 py-1.5 border rounded text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
            <Download size={14} /> Export my plants
        </button>
        <button onClick={() => setFormMode('create')}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800">
            <Plus size={16} /> Add a plant
        </button>
    </div>
</header>
```

Everything else in original Task 7 stays as written.

---

## Task 15: Verification + handoff

**Files:**
- Modify: `docs/work-index.md`
- Modify: `docs/session-log.md`

- [ ] **Step 1: Run the full verification suite**

```bash
npm run lint
npm test
npm run build
```

Expected: lint clean; all tests pass (24 from Plan 1 + 5 catalog from PR #2 + 10 libraryFilters + 7 footprint + 10 wikidata = 56 minimum; possibly more); build succeeds.

- [ ] **Step 2: Confirm bundle size is within budget**

Spec §9 budget: ≤ 213 kB JS. The current `origin/main` ships at ~240 kB (warren overshot), but most of that came from deletable scope-creep + unwired modules. After this plan: AddPlantForm and BedDetail add real code but `lucide-react` is tree-shaken, the Clone button + SPARQL helper are gone, and there are no new runtime dependencies.

If the bundle is over 213 kB after this plan, surface to the user before marking the task done. Acceptable to land at +5 kB if every byte is accounted for; over that, stop and investigate.

- [ ] **Step 3: Bump `docs/work-index.md` Updated date**

In `docs/work-index.md`, leave `WB-ARCH-0003` Status as `IN_PROGRESS` (Plan 3 / Agenda still pending). Update the `Updated` column to today.

- [ ] **Step 4: Append the rework + continue entry to `docs/session-log.md`**

Append a new entry near the top of the log:

```markdown
### <today> - Session 10/11 (rework + continue)

- Markers: `WB-ARCH-0003` (Plan 2 of 3 — Library + Beds, rework + finish)
- Objective: Reconcile session-9 (warren) divergences with the Plan 2 spec, then execute the skipped UI work (AddPlantForm, real LibraryView, BedsView, BedDetail, BedFootprint integration).
- Work completed:
  - Cleanup: deleted `NEXT.md` (duplicated work-index) and the SPARQL `src/features/catalog/wikidataLookup.js`.
  - `src/features/library/libraryFilters.js`: renamed to spec API (`filterPlants({ search, category })` + `deriveCategoryChips`); added synthetic `yours` chip.
  - `src/features/beds/footprint.js`: rewrote to spec algorithm — 6″ cells, deterministic big-first ordering, fill-stamp packing, per-plant overflow records, exported `CELL_INCHES` + `EMPTY_CELL`.
  - `src/features/beds/BedFootprint.jsx`: rewrote against the new `computeFootprint({ bed, plantings, plantsById })` contract.
  - `src/features/library/wikidataLookup.js` (new, replaces deleted one): `wbsearchentities` REST endpoint, no SPARQL, DI-friendly `fetch`, 8 s `AbortController`, `{ ok, results | error }` shape, `searchPlantsByName` + `parseWbSearchResponse` + `WB_SEARCH_URL` exports.
  - `src/features/library/AddPlantForm.jsx`: right-side drawer with manual entry, edit mode, and `🔍 Look up online` Wikidata wiring.
  - `src/features/library/LibraryView.jsx`: rewrote per spec (search input + category chips + card grid + click-to-expand + `yours` badge + edit pencil); preserved warren's `Export my plants` JSON download; dropped the `Clone to My Plants` button (superseded by AddPlantForm).
  - `src/features/beds/BedsView.jsx`: cards + Add Bed modal + sprout empty state.
  - `src/components/AlmanacShell.jsx`: `selectedBedId` state, route the Beds tab between list and detail.
  - `src/features/beds/BedDetail.jsx`: header with rename/resize + remove-with-confirm, plantings table with inline editable Qty/Status/Date/Notes + Add Planting row, BedFootprint section, journal entry input + list, collapsible history table.
- Verification: `npm run lint` clean, `npm test` <N> pass, `npm run build` succeeds at <size> kB JS.
- Decisions made: dropped Clone (replaced by AddPlantForm); kept Export (post-v1 follow-up shipped early).
- Open issues/blockers: None.
- Next actions:
  - Plan 3 (Agenda) — `agenda.js` engine + `AgendaView` + mark-task-done wiring. The bed-card "next task" line in BedsView is still stubbed; Plan 3 wires it.
```

- [ ] **Step 5: Commit and confirm clean tree**

```bash
git add docs/work-index.md docs/session-log.md
git commit -m "WB-ARCH-0003: Plan 2 rework + continue — verification + session log"
git status
```

Expected: clean tree.

---

## Self-review notes

**Spec coverage** (against `docs/superpowers/specs/2026-05-27-willowbrook-almanac-plan-2-design.md`):

- §2.1 LibraryView — Task 8 ✓ (with Export bonus from warren preserved)
- §2.2 AddPlantForm — Tasks 6 + 7 ✓
- §3.1 BedsView — Task 9 ✓
- §3.2 BedDetail — Tasks 10–13 ✓
- §4 footprint algorithm (6″ cells, big-first, overflow shape, constants) — Task 3 ✓
- §4 BedFootprint rendering — Task 4; integrated in Task 14
- §5 catalog helpers — already shipped (warren PR #2)
- §6 Wikidata via wbsearchentities — Task 5 ✓
- §7 validation — covered across Tasks 6, 9, 12
- §10 threat-model deltas — Task 5 (timeout, strict shape, origin=*, no eval)
- §11 testing — Tasks 2–5 ✓
- §13 success criteria — Task 15 ✓

**Placeholder scan:** no TBD, no "implement later", no "similar to". Every code step contains executable code.

**Type consistency:** `computeFootprint({ bed, plantings, plantsById })`, `searchPlantsByName(query, { fetch, signal, timeoutMs })`, `parseWbSearchResponse(payload)`, `WB_SEARCH_URL(query)`, `filterPlants(plants, { search, category })`, `deriveCategoryChips(plants)`, `getAllPlants(plan)`, `getPlantsById(plan)`, `actions.{addBed,updateBed,removeBed,addPlanting,updatePlanting,removePlanting,addJournalEntry,addCustomPlant,updateCustomPlant}` — all match across this plan, the original plan, and the spec.

**Risk surface for the executor:** the biggest trap is that Tasks 6–14 reference the original plan by section number. The executor MUST open `docs/superpowers/plans/2026-05-27-almanac-plan-2-library-and-beds.md` and execute those original-Task-N blocks, with the two adaptations called out above. They are NOT inlined here — that would double the plan size for no informational gain.
