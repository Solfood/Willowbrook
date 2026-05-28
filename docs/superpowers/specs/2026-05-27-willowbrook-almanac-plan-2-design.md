# Willowbrook Almanac — Plan 2 Design Spec (Library + Beds)

**Date:** 2026-05-27
**Status:** Draft — awaiting user review
**Marker:** WB-ARCH-0003 (Plan 2 of 3 under the bed-centric Almanac rewrite)
**Parent:** [Almanac design spec](./2026-05-27-willowbrook-almanac-design.md), [DEC-0002](../../decisions/DEC-0002.md)

---

## 1. Scope

This is the second of three implementation slices for the Almanac rewrite. Plan 1 (Foundation) shipped the v2 schema, the reducer + IO + auto-save, the extended `plantDatabase`, `GardenSetup` with API-resolved frost dates, and the empty `AlmanacShell` with placeholder Library / Beds views. Plan 3 (Agenda) is unchanged and remains future work.

**Plan 2 delivers:** real `LibraryView` and `BedsView`/`BedDetail` screens, the pure `footprint.js` packing module + `BedFootprint` renderer, the `AddPlantForm` with an optional Wikidata lookup affordance, and the small `catalog.js` helpers needed to merge bundled and user-added plants.

**Plan 2 does NOT touch:** the v2 schema, the reducer action set, `GardenSetup`, `frostDates.js`, or the Almanac shell's overall layout. All of those are stable from Plan 1.

---

## 2. Library

### 2.1 `LibraryView.jsx`

- Top toolbar:
  - Search input (matches against plant `name` and `notes`, case-insensitive substring).
  - Category filter chips, derived from the union of categories across `PLANT_DATABASE` and `plan.customPlants`, plus a synthetic `yours` chip that filters to `isUserAdded: true`.
  - Primary `+ Add a plant` button on the right.
- Body: responsive card grid (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`).
  - Each card: icon, name, key stats (spacing inches, days-to-maturity, planting-window months rendered as a 12-cell strip with the active months highlighted), and a `yours` badge if the plant is user-added.
  - Click a card → expand inline to reveal `notes`, `goodNeighbors` / `avoidNeighbors` (rendered as id-chips), and `sourceRefs` (bundled plants only).
  - User-added plants get an inline edit-pencil that re-opens `AddPlantForm` in edit mode; bundled plants are read-only.

### 2.2 `AddPlantForm.jsx`

A right-side drawer (`fixed inset-y-0 right-0 w-96` style) — cleaner than a modal for a tall form, and won't fight a future BedDetail-embedded variant.

Fields (in order):

| Field | Type | Default | Required |
|---|---|---|---|
| `name` | text | `""` | yes |
| `category` | select (existing categories + "new category…" inline option) | `""` | yes |
| `icon` | text (≥ 1 char) | `🌱` | yes |
| `spacingInches` | number ≥ 0 | `12` | yes |
| `daysToMaturity` | number ≥ 0 | `60` | yes |
| `startIndoorsWeeksBeforeLastFrost` | number ≥ 0 (0 = direct-sow) | `0` | yes |
| `plantingWindow.start` | month dropdown (0–11) | `3` | yes |
| `plantingWindow.end` | month dropdown (0–11) | `8` | yes |
| `goodNeighbors` | multi-select from `getAllPlants(plan)` | `[]` | no |
| `avoidNeighbors` | multi-select from `getAllPlants(plan)` | `[]` | no |
| `notes` | textarea | `""` | no |

Above the form fields, a single action: **`🔍 Look up online`** button (described in §6). When a Wikidata candidate is selected, a small "data via Wikidata (CC0)" credit line appears under the button.

Submit:
- Create mode → dispatch `ADD_CUSTOM_PLANT` with payload `{ ...form, id: crypto.randomUUID(), isUserAdded: true }`.
- Edit mode → dispatch `UPDATE_CUSTOM_PLANT` with `{ id, patch }`.

---

## 3. Beds

### 3.1 `BedsView.jsx`

- Header: `+ Add bed` primary button on the right.
- Body: responsive card grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`).
  - Each card: bed name, dimensions (`4' × 8'`), one-line planting summary (`3 tomatoes · 12 basil · 24 carrots`, truncated past 3 entries with `+N more`), and the soonest upcoming agenda-derived task for that bed (`Harvest lettuce in 4d`) when one exists. Plan 2 stubs this: it just shows the planting summary; the agenda-derived task line is wired in Plan 3.
  - Click → BedDetail page.
- Empty state (no beds): single centered card, sprout icon, copy *"Create your first bed to start tracking plantings."*, primary `+ Add bed` CTA.

**Add Bed modal:**
- Fields: `name`, `widthFt`, `lengthFt`.
- Client validation: name non-empty; `widthFt` and `lengthFt` finite numbers > 0.
- Submit → `ADD_BED` with payload `{ id: crypto.randomUUID(), name, widthFt, lengthFt }`.

### 3.2 `BedDetail.jsx`

Routed via a `selectedBedId` state on `AlmanacShell` (lightweight switch, not React Router — matches the existing shell pattern). A back button returns to `BedsView`.

The page contains, in order:

1. **Header strip** — bed name, dimensions, inline pencil-icon → rename + resize form, and a danger-zone `Remove bed` link that confirms before dispatching `REMOVE_BED` (which cascades to plantings + journal — already implemented in the reducer).
2. **Current plantings table** — `current = plantings.filter(p => p.bedId === bedId && p.status !== 'harvested' && p.status !== 'removed')`. Columns: icon, plant name, quantity (editable number input, commits via `UPDATE_PLANTING` on `blur` or `Enter`), status (dropdown with all 6 `PLANTING_STATUSES`, commits on change), `datePlanted` (HTML date input, commits on change), notes (text input, commits on `blur`), and a remove `×` button (confirms via inline "remove?" yes/no before dispatching `REMOVE_PLANTING`). Below the table: an inline **+ Add planting** row that expands on click to a single-line form (plant combobox over `getAllPlants(plan)`, quantity, status default `planned`, optional date, optional notes). Submit appends, collapses, and refocuses the plant combobox for fast multi-add; an explicit `Cancel` button collapses without submitting.
3. **Bed footprint** — `<BedFootprint bed={bed} plantings={currentPlantings} plantsById={plantsById} />`. Static, no interaction. See §4.
4. **Journal** — small text input + `Add entry` button at the top; below, append-only list of entries (newest first) showing date + text. Plain text only; no markdown, no photos in v1.
5. **History** — collapsed by default. When expanded, shows the same table shape as Current, read-only, listing plantings whose status is `harvested` or `removed`. Sorted by `datePlanted` desc; entries with `datePlanted === null` sort to the bottom (tiebreak: planting `id` asc).

---

## 4. Bed footprint algorithm

Pure module: `src/features/beds/footprint.js`. No React, no DOM. Fully testable with `node --test`.

### 4.1 Signature

```js
export const CELL_INCHES = 6;
export const EMPTY_CELL = '·';

export function computeFootprint({ bed, plantings, plantsById }) {
  // returns:
  // {
  //   gridCols: number,           // floor(widthFt * 12 / CELL_INCHES)
  //   gridRows: number,           // floor(lengthFt * 12 / CELL_INCHES)
  //   cells: string[][],          // [row][col] of icon char or EMPTY_CELL
  //   legend: [{ plantId, name, icon, requested, placed }],
  //   overflow: [{ plantId, name, missing }]
  // }
}
```

### 4.2 Algorithm

1. Compute `gridCols`, `gridRows` from bed dimensions. Pre-fill `cells` with `EMPTY_CELL`.
2. Sort plantings deterministically: by `spacingInches` descending, ties broken by `plantId` ascending. Bigger plants placed first so they don't get squeezed into leftover cells.
3. For each planting:
   - `cellsPerPlant = max(1, round(spacingInches / CELL_INCHES) ** 2)` — a 24" tomato → 16 cells, a 3" carrot → 1 cell.
   - `needed = quantity * cellsPerPlant`.
   - Walk row-major over `cells`; stamp `icon` into consecutive `cellsPerPlant`-sized empty runs until `needed` is satisfied or the grid is full.
   - Record `placed` (cells filled) and compute `missing = max(0, requested − placedQuantity)`.
4. Return the structure. Legend entries are in placement order.

> **Placement honesty:** consistent with the Plan 1 spec §4, the footprint is *deterministic packing, not horticulturally accurate*. We do NOT place a 24" tomato as a contiguous 2D 4×4 block — we just stamp `cellsPerPlant` consecutive cells row-major. Two large plants side-by-side may look visually odd. The legend is the source of truth. This avoids a hairy 2D packing problem for a decorative v1 preview.

### 4.3 `BedFootprint.jsx`

- Calls `computeFootprint(...)` once per render (cheap, pure, memoizable).
- Header line: `Bed: <name> (<W>'×<L>')`.
- Renders `cells` as a `<pre>` block, one space between characters per row.
- Legend: `icon × name × count` per entry.
- If `overflow.length > 0`, render a one-line warning under the legend per overflowed plant: `⚠️ 18 carrots don't fit at 3" spacing in this 4×4 bed`.

---

## 5. Catalog and data-layer additions

`catalog.js` gains two helpers, both pure:

```js
export function getAllPlants(plan) {
  return [...PLANT_DATABASE, ...(plan?.customPlants ?? [])];
}

export function getPlantsById(plan) {
  // memoized via a WeakMap keyed on plan.customPlants array reference;
  // O(1) lookups during render.
}
```

No reducer changes, no schema changes. The v2 schema already has `customPlants` and the reducer already has `ADD_CUSTOM_PLANT` and `UPDATE_CUSTOM_PLANT`.

Custom plant `id` is `crypto.randomUUID()`. Bundled plant IDs are short strings (`tomato`, `carrot`, …), so collision is impossible.

---

## 6. Wikidata integration

Pure module: `src/features/library/wikidataLookup.js`.

### 6.1 Endpoint choice

The lightweight `wbsearchentities` REST endpoint, not SPARQL:

```
https://www.wikidata.org/w/api.php
  ?action=wbsearchentities
  &search=<query>
  &language=en
  &format=json
  &type=item
  &limit=5
  &origin=*
```

- No API key, no auth, no rate-limit anxiety for our usage scale.
- `&origin=*` enables anonymous CORS — works from a GitHub Pages static site.
- Returns a JSON shape like `{ search: [{ id: "Q...", label, description, ... }] }`.
- Wikidata content is CC0 — no attribution required, but we display a "data via Wikidata (CC0)" credit line as good practice.

### 6.2 Module shape

```js
export async function searchPlantsByName(query, { signal, fetch = globalThis.fetch } = {}) {
  // returns normalized: [{ qid, name, description }]
  // throws on non-2xx, timeout/abort, or malformed JSON
}
```

- 8s `AbortController` timeout — same pattern as `frostDates.js` from Plan 1.
- `fetch` is dependency-injected so tests run under `node --test` against a fixture without network.
- Output is strict: only `qid`, `name`, `description`; ignores all other Wikidata fields.

### 6.3 Form integration

- Clicking **`🔍 Look up online`** in `AddPlantForm` calls `searchPlantsByName(currentName)` and displays a results panel below the button with up to 5 candidates (name + description).
- Picking a candidate overwrites the current `name` field unconditionally with the candidate's `name`. It fills `category` *only if* the candidate's `description` matches a known category keyword via a small case-insensitive map: `vegetable` → `vegetables`, `herb` → `herbs`, `flower` → `flowers`. Otherwise `category` stays as the user had it.
- `icon` is NOT prefilled — Wikidata doesn't expose anything emoji-shaped. The user picks `icon` manually (defaults to `🌱`).
- API failure / timeout shows an inline notice ("Couldn't reach Wikidata — fill in by hand"). The form stays fully usable manually. No retry storm.

---

## 7. Error handling & validation

- **Wikidata fetch:** see §6.2/§6.3 — typed errors, inline notice, no retry.
- **Add Bed validation:** name non-empty; `widthFt`, `lengthFt` finite numbers > 0. Inline field errors; submit disabled until valid.
- **Add Planting validation:** plant selected; quantity ≥ 1 integer. Status defaults to `planned`; date optional.
- **AddPlantForm validation:** name non-empty; icon length ≥ 1 char; spacing / DTM / indoor-weeks numeric ≥ 0; planting-window start/end in 0–11.
- **Bed-overflow in BedFootprint:** not an error — surfaced as one `⚠️` line per overflowed plant in the legend (per the brainstorming decision: "Pack what fits, show 'N more not shown' indicator").

`getAllPlants`, `getPlantsById`, and `computeFootprint` are pure and cannot fail at runtime under valid plan shape (which `validatePlanFile` already guarantees at load time).

---

## 8. Architecture & file layout

```
src/
  features/
    library/
      LibraryView.jsx
      AddPlantForm.jsx
      wikidataLookup.js
    beds/
      BedsView.jsx
      BedDetail.jsx
      BedFootprint.jsx
      footprint.js
    catalog/
      catalog.js              # extended with getAllPlants + getPlantsById
tests/
  footprint.test.js
  wikidataLookup.test.js
  library.test.js             # pure category/search filter helpers
```

`AlmanacShell.jsx` gains a `selectedBedId` state and routes between `BedsView` and `BedDetail` in the existing `view === 'beds'` branch. No new React-Router dependency.

---

## 9. Engineering principles & scope guardrails

- **YAGNI v1:** no photos in journal, no drag-drop anything, no 2D bin-packing in the footprint, no internationalization, no offline-PWA, no fuzzy search beyond plain substring.
- **Test budget:** every pure module gets `node --test` coverage (`footprint.js`, `wikidataLookup.js`, the library filter helper). React components don't get unit tests in v1 — consistent with Plan 1's principle that pure modules are the value and React is the skin. `npm run lint` clean is the React-side gate.
- **No new dependencies.** Wikidata uses `fetch`; everything else is already in the project.
- **Bundle budget:** stay under the current 213 kB JS bundle (lots of UI but no new libraries; should be slack-negative).
- **No schema bump.** Plan 1 already shipped schema v2; Plan 2 uses it as-is.

---

## 10. Threat-model deltas vs DEC-0002

- **New external surface:** Wikidata REST endpoint. Mitigations: 8s `AbortController` timeout, strict response-shape validation in `searchPlantsByName`, no auth/credentials in flight, `&origin=*` for anonymous CORS only. Output is plain text rendered through React's automatic escaping — no `dangerouslySetInnerHTML`, no `eval`.
- **No new JSON-loading surface.** `usePlanIO.js` from Plan 1 already validates v2 shape on import. User-added plants are already covered by the existing schema validation (which deliberately checks shape, not contents).
- **Risk level:** unchanged from DEC-0002 (medium). The Wikidata integration is read-only against a public, CC0 endpoint with no authentication and no PII in flight.

---

## 11. Testing

Cases (minimum to pass Gate 4):

- `tests/footprint.test.js` — 6 cases:
  1. Empty bed → all cells empty, empty legend, no overflow.
  2. Single plant fits → cells filled, legend correct, no overflow.
  3. Single plant overflows → cells full, `overflow[0].missing > 0`, legend `placed < requested`.
  4. Multiple plants, deterministic order — big plants stamped first.
  5. Mixed sizes (1 tomato + 24 carrots) → both appear, totals correct.
  6. Bed dimensions that don't divide evenly by 6" (3' × 7' → 6×14 grid via floor).
- `tests/wikidataLookup.test.js` — 4 cases:
  1. Happy path: fixture JSON parses into normalized `[{ qid, name, description }]`.
  2. Timeout: `AbortError` from injected fetch surfaces as a typed error.
  3. Non-200 response throws.
  4. Malformed JSON throws.
- `tests/library.test.js` — pure category-filter + search-filter helpers extracted from `LibraryView`.

Verification gate: `npm run lint` clean, all tests pass, `npm run build` succeeds with bundle ≤ 213 kB JS.

---

## 12. Open follow-ups (post-Plan 2)

- Plan 3 (Agenda): `agenda.js` engine, `AgendaView`, mark-task-done wiring. The `next task` line on bed cards (§3.1) is stubbed until Plan 3 ships.
- 2D contiguous footprint packing (a tomato is a 4×4 block, not 16 stamped cells in a row). Decorative-only today; could become a real square-foot-gardening hint later.
- Wikidata icon hints — e.g., parsing P18 (image) into a thumbnail next to candidates. Out of scope; emoji is the icon contract.
- Edit-in-place for bundled plants (currently read-only). Workaround today: clone a bundled plant into a custom plant and edit.
- Library import/export (share custom plants between gardens). The existing JSON save/load already round-trips `customPlants`; an explicit "export library" affordance is post-v1.

---

## 13. Success criteria

- A user can create a bed, add 3+ plantings into it (mix of statuses), edit/remove rows, see the footprint reflect their picks, write a journal entry, and view the History section once a planting is marked harvested.
- A user can search the library, filter by category, click into a plant card to see notes/companions/source-refs.
- A user can add a custom plant via the manual form, and via the Wikidata `Look up online` flow, and the new plant immediately appears in the library AND in the BedDetail plant-picker.
- All test cases in §11 pass. `npm run lint` clean. `npm run build` JS bundle ≤ 213 kB.
- A v2 plan with beds, plantings, journal entries, and custom plants round-trips through save → load → render unchanged.
