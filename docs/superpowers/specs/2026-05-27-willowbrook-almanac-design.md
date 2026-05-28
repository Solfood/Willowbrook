# Willowbrook Almanac — Design Spec

**Date:** 2026-05-27
**Status:** Draft — awaiting user review
**Type:** Product redirection (rewrite of the planner UI, schema, and core loop; reuses zone/companion data and engineering scaffold)

---

## 1. Motivation

The current app is a freeform top-down garden planner: drop emoji plants on a grid, save the layout as JSON. It has three corrosive problems:

1. **Plant art is single emoji glyphs**, so adding a plant means hunting for an unused emoji. There is no real plant-art system.
2. **Move/place flow has three modes** (Pan/Place/Move) plus a two-step "arm" gate for structures, plus `selectedTool` doubling as both "new placement" and "item being moved." This is where the user-reported movement bugs live.
3. **The library is 28 plants hardcoded in source.** A user can't add their own without editing JS.

The deeper issue: a static layout drawing is the wrong primary artifact. The hard part of home gardening is *managing the year* — what to start indoors when, what to direct-sow, what to transplant after frost, what to harvest now, what to log when it goes wrong. The current app addresses none of that.

This spec replaces the freeform canvas with a **bed-centric garden journal whose home screen is a weekly task agenda**.

---

## 2. Product shape

Three top-level views, switched by a left rail or top tab strip:

### 2.1 Agenda (home)

The first thing a user sees. Two stacked sections:

- **This Week** — dated tasks computed from the user's actual plantings (not generic suggestions). Each task is one line: action verb + plant + bed + a why. Examples:
  - "Start tomato seeds indoors — 6 weeks before last frost" *(Bed: Backyard West)*
  - "Direct-sow radishes — succession round 2 of 4" *(Bed: Salad Strip)*
  - "Transplant peppers outdoors — last frost is past" *(Bed: Backyard West)*
  - "Harvest lettuce — planted 45 days ago, days-to-maturity reached" *(Bed: Salad Strip)*
- **Next Week** — same shape, one week ahead. Lets users see what's coming.

A toggle at the top: **Show "could plant now" suggestions** — when on, the agenda also lists plants from the library whose planting window includes the current month but are not currently planted anywhere. Off by default.

Tasks are not editable beyond "mark done" (which advances the planting's status). The agenda is a derived view, not a separate data store.

### 2.2 Beds

A scrollable list of bed cards. Each card shows: bed name, dimensions, current planting summary (e.g., "3 tomatoes · 12 basil · 24 carrots"), the next task for that bed.

Clicking into a bed opens a **bed detail page** with four sections:

1. **Current plantings** — table of plantings with status (planned / sown indoors / direct-sown / transplanted / growing / harvested), quantity, planted date, days to maturity. Add / edit / remove rows. To add: pick from library, set quantity, optional date, optional notes.
2. **Bed footprint** — an auto-generated ASCII/emoji "art" preview. See §4.
3. **Journal log** — append-only text entries with dates. Free-text. No photos in v1.
4. **History** — prior plantings (status = harvested or removed). Read-only.

### 2.3 Library

The plant catalog. Searchable, filterable by category. Each plant shows: name, icon (single char/emoji), spacing, days-to-maturity, planting window, companion notes, source refs (if extension-derived).

**"Add a plant" button** opens a form: name, category, icon character, spacing (inches), days to maturity, planting window (months), "weeks before last frost to start indoors" (optional, defaults to 0 = direct-sow), companion good/avoid (optional, picked from existing plants), free-text notes. Saved into `customPlants` and persisted alongside the rest of the plan.

User-added plants are visually marked (e.g., a small "yours" tag) and editable; bundled extension-data plants are read-only.

---

## 3. Data model

Replaces the current `{ width, length, items[{x, y, type, ...}] }` shape.

```ts
type Garden = {
  name: string;
  zone: string;            // USDA hardiness zone, e.g. "7a"
  zip: string | null;      // optional, set during setup
  lastFrostDate: string;   // ISO date, e.g. "2026-04-15"
  firstFrostDate: string;  // ISO date
};

type Bed = {
  id: string;
  name: string;
  widthFt: number;
  lengthFt: number;
};

type PlantingStatus =
  | "planned"
  | "sown_indoors"
  | "direct_sown"
  | "transplanted"
  | "harvested"
  | "removed";

type Planting = {
  id: string;
  bedId: string;
  plantId: string;
  quantity: number;
  status: PlantingStatus;
  datePlanted: string | null;  // ISO date, null when planned-but-not-acted
  notes: string;
};

type JournalEntry = {
  id: string;
  bedId: string;
  date: string;             // ISO date
  text: string;
};

type CustomPlant = {
  // Same fields as bundled plants; see §3.1
  id: string;
  name: string;
  category: string;
  icon: string;             // single char/emoji
  spacingInches: number;
  daysToMaturity: number;
  plantingWindow: { start: number; end: number };  // months 0-11
  startIndoorsWeeksBeforeLastFrost: number;        // 0 = direct-sow
  goodNeighbors: string[];
  avoidNeighbors: string[];
  notes: string;
  isUserAdded: true;
};

type PlanFile = {
  schemaVersion: 2;         // bump from current schema
  garden: Garden;
  beds: Bed[];
  plantings: Planting[];
  journal: JournalEntry[];
  customPlants: CustomPlant[];
};
```

### 3.1 Bundled plant schema additions

The existing `PLANT_DATABASE` entries gain two fields:

- `daysToMaturity: number` — needed to compute harvest tasks.
- `startIndoorsWeeksBeforeLastFrost: number` — `0` means direct-sow only.

Both can be added to the existing 28 plants from extension references in one pass; new plants come with them from the form.

The existing `spacingInches`, `plantingWindow`, `goodNeighbors`, `avoidNeighbors`, `notes`, `sourceRefs`, `lastReviewed`, `regionScope`, `evidence` fields all carry forward.

---

## 4. Bed footprint visualization

For each bed, render a small monospace "art" preview computed from plantings + bed dimensions. Pure function, no canvas, no drag-drop.

**Inputs:** `bed.widthFt`, `bed.lengthFt`, list of `Planting` for this bed, plant catalog (for `spacingInches` and `icon`).

**Algorithm (row-major auto-pack — not a real layout, just a footprint):**

1. Convert the bed to a grid of cells where each cell is 6 inches × 6 inches. A 4ft × 8ft bed → 8 × 16 grid.
2. For each planting in display order, compute its footprint in cells (a tomato at 24" spacing = 4×4 cells). Multiply by quantity to get total cells needed.
3. Walk the grid row-major, placing each plant's emoji into cells until its quantity is satisfied. Use empty cells for unplanted space.
4. Render as a `<pre>` block, one character per cell, with a header row showing dimensions.

Example output for a 4×8 bed with 3 tomatoes, 12 basil, 24 carrots:

```
Bed: Backyard West  (4'×8')
🍅 🍅 🍅 🌿 🌿 🌿 🌿 🌿 🌿 🌿 🌿 🌿 🌿 🌿 🌿 🥕
🥕 🥕 🥕 🥕 🥕 🥕 🥕 🥕 🥕 🥕 🥕 🥕 🥕 🥕 🥕 🥕
🥕 🥕 🥕 🥕 🥕 ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
```

(The example glosses over spacing math; the algorithm produces a deterministic packing, not a horticulturally accurate layout. The footprint is honest about that — it is decorative, not prescriptive.)

A small legend underneath maps emoji → name × count.

This is **the** visualization for a bed. There is no other canvas, ever.

---

## 5. Calendar / task engine

A pure module: `src/features/almanac/agenda.js`. No React imports, no DOM. Fully testable with `node --test`.

**Signature:**

```js
export function computeAgenda({
  plantings,
  plantsById,
  zone,
  lastFrostDate,
  firstFrostDate,
  today,            // ISO date, injectable for testing
  windowDays,       // e.g. 14 (this week + next week)
}): Task[]
```

**Task shape:**

```js
type Task = {
  id: string;              // stable for "mark done"
  date: string;            // ISO date
  action: "start_indoors" | "direct_sow" | "transplant" | "harvest" | "succession";
  plantingId: string;
  plantName: string;
  bedName: string;
  reason: string;          // human-readable "why"
};
```

**Generation rules** (per planting). For each, the task fires on exactly one date — no spamming the agenda day after day:

| Planting status | Task date | Action |
|---|---|---|
| `planned` + plant has `startIndoorsWeeksBeforeLastFrost > 0` | `lastFrostDate - N weeks` | `start_indoors` |
| `planned` + plant is direct-sow | first day of the plant's zone-shifted `plantingWindow` in the current year | `direct_sow` |
| `sown_indoors` | `lastFrostDate + 7 days` (one-week buffer) | `transplant` |
| `transplanted` or `direct_sown` | `datePlanted + daysToMaturity` | `harvest` |

**Window filter:** tasks with a date in `[today - 7 days, today + windowDays]` are returned. Anything older than 7 days that is still un-acted-on stays as **Overdue** with the date stamp, sorted to the top of the agenda. Anything beyond `today + windowDays` is hidden until it gets closer.

**Status transitions** are driven by "mark done" on a task: e.g., marking a `start_indoors` task done sets the planting's status to `sown_indoors` and records today as `datePlanted`.

---

## 6. What gets deleted

The freeform canvas is gone. Specifically:

- `src/components/GardenPlanner.jsx` (1,168 lines) — the canvas, ruler, ghost cursor, camera, modes, snap, structure rendering, print path
- `src/features/planner/useCameraControls.js`
- `src/features/planner/useKeyboardShortcuts.js` (the move-mode keyboard logic; nudge-by-arrow no longer applies)
- `src/components/Sidebar.jsx` (rewritten as bed inspector)
- The Pan/Place/Move mode state, snap-to-grid state, `armedStructureMoveId`, `selectedTool`, ghost positioning math
- Print-plan-root CSS and the duplicate print render path

The `STRUCTURES` concept (raised beds, garden plots) goes away as a *placeable item* — beds themselves become first-class objects with dimensions.

---

## 7. What gets kept

- **`GardenSetup.jsx`** — the ZIP-to-zone lookup. Extended to also resolve **last and first frost dates from an API** (candidate: NOAA NCEI freeze-date normals, or a community endpoint such as `farmsense.net/api/`). API-first is the design intent; a manual-entry fallback only appears when the API call fails or returns no data for the ZIP. Frost dates are persisted in the plan file (§3) so subsequent loads don't re-fetch.
- **`PLANT_DATABASE`** — kept and extended with `daysToMaturity` and `startIndoorsWeeksBeforeLastFrost`. The `getPlantById`, `getPlantCompanions`, `getPlantingWindow` helpers carry forward unchanged.
- **`ZONE_MONTH_SHIFT`** — still drives the planting-window shift for non-7a zones.
- **`planReducer.js` pattern** — kept and adapted. Undo/redo applies to plantings + journal + custom plants (every commit is an atomic state snapshot, capped at 50 like today).
- **Save/load JSON** — kept; schema bumps to `schemaVersion: 2`. Loader rejects v1 files with a clear "this is an old file from before the Almanac rewrite" message and a one-shot import button (§9).
- **Error boundary, localStorage notes pattern, ZIP timeout handling** — all kept.
- **Engineering scaffold** — `policies/project-policy.yaml`, `docs/work-index.md`, `docs/session-log.md`, `docs/decisions/`, the test setup with `node --test`.

---

## 8. Architecture

Top-level layout:

```
src/
  App.jsx                          # routes Setup → Almanac shell
  components/
    GardenSetup.jsx                # kept, extended with frost-date resolution
    AlmanacShell.jsx               # left rail, three views, save/load toolbar
  features/
    agenda/
      AgendaView.jsx               # the home screen
      agenda.js                    # pure compute (testable)
    beds/
      BedsView.jsx                 # bed list
      BedDetail.jsx                # current plantings + journal + history
      BedFootprint.jsx             # the ASCII art preview
      footprint.js                 # pure packing function (testable)
    library/
      LibraryView.jsx
      AddPlantForm.jsx
    catalog/
      plantDatabase.js             # extended schema
      catalog.js                   # extended helpers
    plan/
      planReducer.js               # renamed conceptually, same pattern
      planSchema.js                # v2 schema validation
      usePlanIO.js                 # save/load JSON
```

Each feature folder owns its views + pure logic + tests. The pure modules (`agenda.js`, `footprint.js`, `catalog.js`) are the value; React is the skin.

**State:** one `useReducer` at `AlmanacShell` holding the full `PlanFile` shape. Reducer actions: `ADD_BED`, `UPDATE_BED`, `REMOVE_BED`, `ADD_PLANTING`, `UPDATE_PLANTING`, `REMOVE_PLANTING`, `ADD_JOURNAL_ENTRY`, `ADD_CUSTOM_PLANT`, `UPDATE_CUSTOM_PLANT`, `MARK_TASK_DONE` (mutates a planting via task ID), `LOAD_PLAN`, `UNDO`, `REDO`.

**Persistence:** auto-save the current plan to `localStorage` on every commit (new — current app doesn't auto-save). Save/load JSON files still works for explicit export/import. localStorage limit (~5MB) is plenty for text-only data.

---

## 9. Migration: clean break (no importer)

No migration path. v1 `.json` files are rejected at load time with a clear message:

> "This file is from an older version of Willowbrook. The app has been rewritten around beds and a weekly agenda; v1 layouts are no longer supported. Start a new plan to continue."

The loader detects v1 by the absence of `schemaVersion` (or `schemaVersion < 2`) and refuses to populate state. No conversion code, no import button, no maintained legacy path. Users who want to preserve an old plan can keep the v1 JSON file as-is on disk; it just won't open in the new app.

This is the simplest, lowest-maintenance posture and aligns with the spirit of the rewrite.

---

## 10. Engineering principles & scope guardrails

- **YAGNI v1:** no photos, no weather API integration beyond optional frost-date resolution, no multi-garden support, no sync, no auth, no mobile-first push notifications. The app is still a single-user GH-Pages static site with JSON files.
- **Desktop-only gate stays for v1.** Mobile is a future track. The agenda view is read-friendly on phones, but editing the library/beds works best on desktop.
- **Test budget:** every pure module in `features/*/` (agenda.js, footprint.js, catalog.js, planReducer.js) gets `node --test` coverage. React components don't get tests in v1 — the value is in the pure logic.
- **One DEC record** to be created for this redirection (`DEC-NNNN.md`) pointing at this spec and summarizing the product shift + schema bump. Risk = medium (schema-breaking, deletes most of the canvas surface) → Gate 2 (threat model) applies, scoped to the new frost-date HTTP fetch and the JSON save/load boundary.

---

## 11. Open follow-ups (post-v1, not in this spec)

- Photos in the journal (storage strategy TBD — base64 in JSON is wasteful; IndexedDB is a better home).
- Weather integration ("frost warning tomorrow night").
- Year-over-year crop rotation suggestions (the data model already supports it via `history`).
- A real square-foot-gardening layout editor inside a bed (if users want spatial control later).
- Mobile-friendly view of the agenda (read-only is easy; editing is the hard part).
- A "shared garden" / multi-user mode (would require a backend; not in scope).

---

## 12. Success criteria for v1

- A user can: set up a garden (zone + frost dates), add 3 beds, drop in 8 plantings (mix of planned/sown/transplanted/growing), and see a meaningful agenda for this week and next week.
- Adding a new plant from the form takes < 30 seconds and the plant immediately shows up in the library search.
- The agenda surfaces an overdue task if you forget to mark a "start indoors" task done.
- Saving and reloading a plan produces an identical agenda.
- `npm run lint` clean; `npm test` covers `agenda.js`, `footprint.js`, `planReducer.js`, and the v1→v2 importer.
- Total app JS bundle ≤ current 276 kB (we're deleting a lot more than we're adding).
