# Session Log

Append-only continuity log.

---

### 2026-05-28 - Session 10 (Plan 2 rework + finish)

- Markers: `WB-ARCH-0003` (Plan 2 of 3 — Library + Beds; reconciliation + completion)
- Objective: Reconcile session-9 (warren) divergences with the Plan 2 spec, then execute the skipped UI work (AddPlantForm, real LibraryView, BedsView, BedDetail, BedFootprint integration). Followed the rework plan at `docs/superpowers/plans/2026-05-28-almanac-plan-2-rework-and-continue.md`.
- Work completed (14 tasks, one commit each):
  - **T1** Cleanup: deleted `NEXT.md` and the SPARQL `src/features/catalog/wikidataLookup.js` + its tests.
  - **T2** `src/features/library/libraryFilters.js`: renamed to spec API (`filterPlants({ search, category })` + `deriveCategoryChips`); added synthetic `yours` chip. LibraryView import updated.
  - **T3** `src/features/beds/footprint.js`: rewrote to spec algorithm — 6″ cells, deterministic big-first ordering, fill-stamp packing, per-plant overflow records, exported `CELL_INCHES` + `EMPTY_CELL`. 7 tests.
  - **T4** `src/features/beds/BedFootprint.jsx`: rewrote against new `computeFootprint({ bed, plantings, plantsById })` contract.
  - **T5** `src/features/library/wikidataLookup.js` (new): `wbsearchentities` REST endpoint, no SPARQL, DI-friendly `fetch`, 8 s `AbortController`, `{ ok, results | error }` shape. 10 tests.
  - **T6** `src/features/library/AddPlantForm.jsx`: right-side drawer with manual entry, edit mode, full field set + validation.
  - **T7** AddPlantForm wired Wikidata `🔍 Look up online` button + candidate panel with fail-soft inline error + CC0 credit.
  - **T8** `src/features/library/LibraryView.jsx`: rewrote per spec (search + category chips + card grid + click-to-expand + `yours` badge + edit pencil for custom plants); preserved warren's `Export my plants` JSON download; dropped the `Clone to My Plants` button.
  - **T9** `src/features/beds/BedsView.jsx`: cards + Add Bed modal + sprout empty state.
  - **T10** `src/components/AlmanacShell.jsx`: `selectedBedId` state; route the Beds tab between list and detail; left-rail Beds tap resets selection. BedDetail stub created.
  - **T11** `src/features/beds/BedDetail.jsx`: header with rename/resize + remove-with-confirm.
  - **T12** BedDetail plantings table with inline editable Qty (blur)/Status (change)/Date (change)/Notes (blur) + `× Remove?` inline confirm + Add Planting inline row.
  - **T13** BedDetail Journal section (append-only entries) + collapsible History table (harvested + removed plantings, null-date tiebreaker on `id`).
  - **T14** BedFootprint integrated into BedDetail between PlantingsSection and JournalSection.
- Verification: `npm run lint` clean, `npm test` 56/56 pass (24 from Plan 1 + 5 catalog from session 8 + 10 libraryFilters + 7 footprint + 10 wikidata), `npm run build` succeeds.
- Decisions made: dropped Clone (replaced by AddPlantForm); kept Export (post-v1 follow-up shipped early).
- Open issues / blockers: None.
- Post-merge follow-up: revised Plan 2 spec §9 bundle budget from "≤ 213 kB" (Plan 1 empty-shell baseline) to "≤ 300 kB JS / ≤ 100 kB gzipped" (realistic for four real React components with no new deps). Plan 2 as shipped lands at ~270 kB / ~79 kB gzipped — comfortably under the revised budget. Future plans should track per-PR; revisit code-splitting only if Plan 3 pushes us toward 350 kB.
- Next actions:
  - Plan 3 (Agenda) — `agenda.js` engine + `AgendaView` + mark-task-done wiring. The bed-card "next task" line in BedsView is stubbed; Plan 3 wires it.

---

### 2026-05-28 - Session 9

- Markers: `WB-ARCH-0003` (Plan 2, Tasks S2/S3/S4/M1/M2)
- Objective: Work through NEXT.md small items (S2→S4) then medium items (M1→M2).
- Work completed (5 of 5 stop limit):
  - **S2** — `src/features/library/libraryFilters.js`: `filterPlants(plants, { query, category })` and `getCategories(plants)` pure functions. 12 unit tests in `tests/libraryFilters.test.js`.
  - **S3 + S4** — `src/features/library/LibraryView.jsx` (replaces placeholder): filterable plant card grid using `filterPlants`/`getCategories`/`getAllPlants`. Bundled plant cards expose "Clone to My Plants" (dispatches `ADD_CUSTOM_PLANT` — no new reducer action). "Export my plants" button serialises only `customPlants` to JSON download. Both affordances bundled in one component.
  - **M1** — `src/features/beds/footprint.js`: `computeFootprint(bed, plantings, plantsById)` row-major packing (each plant claims cells ∝ spacing²) + `buildLegend(grid, plantsById)`. `src/features/beds/BedFootprint.jsx`: `<pre>` emoji grid with legend list and overflow warning banner. 12 unit tests in `tests/footprint.test.js`.
  - **M2** — `src/features/catalog/wikidataLookup.js`: `lookupPlants(query, { fetchFn, timeoutMs })` + `normaliseSparqlResults(sparqlJson)`. DI fetchFn stub keeps all 11 tests network-free. 8 s AbortController timeout.
- Verification: `npm run lint` clean, `npm test` 63/63 pass (up from 41).
- Decisions made: None — all pure-module / small UI additions, no DEC records required.
- Open issues/blockers: None.
- Next actions:
  - **M3** — Year-over-year crop rotation hints (flag beds with same plant family in consecutive years; read-only badge on BedDetail).
  - **M4** — Mobile-friendly AgendaView (read-only weekly task list; data is local).
  - **L1** — LibraryView full Plan 2 scope: AddPlantForm drawer with manual entry + Wikidata lookup (now unblocked by M2).
  - **L2** — BedsView + BedDetail: bed cards, Add Bed modal, plantings table, BedFootprint preview, journal (now unblocked by M1).

---

### 2026-05-28 - Session 8

- Markers: `WB-ARCH-0003` (Plan 2, Task 1)
- Objective: Write NEXT.md from the PR #1 merge commit's referenced docs; implement the highest-value small follow-up item.
- Work completed:
  - Created `NEXT.md` at repo root: all future-work items from the Plan 2 and Plan 3 spec/plan documents, categorised as small / medium / large with one-line descriptions.
  - Implemented `getAllPlants(plan)` and `getPlantsById(plan)` in `src/features/catalog/catalog.js` — pure helpers that merge the 28 bundled plants with `plan.customPlants`. These are the foundation every Library and Beds component will build on (Plan 2 Task 1).
  - Added 5 new tests to `tests/catalog.test.js` covering: bundled-only, appended custom, null/missing-plan tolerance, merged id-map, and custom-plant precedence on collision.
- Verification: `npm run lint` clean, `npm test` 29/29 pass (up from 24).
- Decisions made: None — pure data-layer addition, no DEC record required.
- Open issues/blockers: None.
- Next actions:
  - `libraryFilters.js` (NEXT.md S2) — pure search + category-filter over `getAllPlants` output. Small, self-contained, unblocks LibraryView.
  - `footprint.js` + `BedFootprint.jsx` (NEXT.md M1) — packing algorithm. Can run in parallel with library work.
  - Plan 2 UI components (L1, L2) — LibraryView, BedsView, BedDetail once pure modules are done.

---

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
  - `src/components/GardenSetup.jsx`: dropped width/length; added frost-date fetch + manual override. Default frost dates compute from current year.
  - `src/components/AlmanacShell.jsx` + Agenda/Beds/Library placeholders: shell skeleton with three navigable views.
  - `src/App.jsx`: restore from localStorage on boot; ErrorBoundary preserved.
  - Deleted: GardenPlanner.jsx, Sidebar.jsx, src/features/planner/, tests/planner.test.js, tests/keyboardShortcuts.test.js.
- Post-task cleanup (commit `6bd9eee`): moved Agenda/Beds/Library views from `src/components/` into their spec-defined `src/features/{agenda,beds,library}/` homes; renamed `plannerReducer` → `planReducer` (v1 artifact); removed unused `STRUCTURES` export from `catalog.js`.
- Verification: `npm run lint` clean, `npm test` 24/24 pass (planSchema 7, planReducer 11, frostDates 4, catalog 2), `npm run build` succeeds (213 kB JS, down from 276 kB). User ran `npm run dev` and confirmed setup → empty-shell flow works.
- Decisions made: DEC-0002 (Almanac product redirection, schema-v2 clean break).
- Open issues/blockers: None.
- Outstanding user request (capture for Plan 2 brainstorm):
  - Source the plant library from an external API rather than (or in addition to) the 28 hardcoded bundled plants — the same way frost dates were resolved from `farmsense.net`. Candidate APIs to evaluate: Perenual.com (modern, free tier rate-limited), Trefle.io (open-source plant DB, hosting has been spotty), OpenFarm.cc (community-curated), USDA PLANTS Database (US-centric, no formal API), Wikidata SPARQL. Decision needs to land in Plan 2 brainstorm: which API, what data we actually need from it, offline/cached behaviour, and how user-added custom plants coexist with API-sourced ones.
- Next actions:
  - **New session** — brainstorm + write Plan 2 (Library + Beds). Start by deciding the plant-data source (see Outstanding user request above) before designing `LibraryView` and `AddPlantForm`. Then `BedsView`, `BedDetail`, `BedFootprint`, and the pure `footprint.js` packing module.
  - Plan 3 — Agenda (`agenda.js` engine, `AgendaView`, mark-task-done flow). Unchanged from Plan 1 sign-off.

---

### 2026-04-30 - Session 6

- Markers: `WB-ARCH-0002`
- Objective: Phase 2 modularization — extract right-panel tabs into dedicated sub-components.
- Work completed:
  - Created `src/features/planner/LearnTab.jsx`: owns the Learn tab JSX plus the `HelpCard` helper (previously a file-local function in GardenPlanner.jsx). Props: `focusedPlantContext`, `placementInsights`, `zone`.
  - Created `src/features/planner/LayersTab.jsx`: owns the Layers tab JSX plus `LayerRow`. Props: `layers`, `setLayers`, `selectedTool`.
  - Created `src/features/planner/TimelineTab.jsx`: owns the Timeline tab JSX plus the `MONTH_LABELS` constant. Props: `timelineMonth`, `setTimelineMonth`, `zone`, `timelineRows`.
  - Updated `src/components/GardenPlanner.jsx`: imported the three tab components; replaced ~179 lines of inline JSX with three single-line component calls; removed `HelpCard`, `LayerRow`, and `MONTH_LABELS` definitions. Line count reduced from 1,346 → 1,168 (−178 lines).
- Verification: `npm run lint` clean, `npm test` 39/39 pass, `npm run build` succeeds (276 kB JS).
- Decisions made: None — pure render extraction, no DEC record required.
- Open issues/blockers: None.
- Next actions:
  - No further backlog items from the cleanup sprint. New work should be driven by the next feature or bug request.

---

### 2026-04-30 - Session 5

- Markers: `WB-DATA-0001`
- Objective: Replace heuristic zone planting window formula with an explicit lookup table.
- Work completed:
  - Removed `getZoneNumber()` and the `Math.round((7 - zoneNumber) / 2)` formula from `src/features/catalog/catalog.js`.
  - Added `ZONE_MONTH_SHIFT` lookup table covering all 26 USDA zone keys (1a–13b) with integer month shifts relative to the zone 7a baseline. The a/b half-zone distinction is now explicit: e.g. 6a→+1, 6b→0, 8a→0, 8b→-1.
  - Added `getZoneMonthShift(zone)` helper that returns 0 (zone 7 behavior) for any unrecognized zone string.
  - Added 6 tests for `getPlantingWindow` to `tests/planner.test.js` covering the baseline (7a), cold shift (4b), warm shift (8b), a/b boundary (6b vs 7a), unknown zone fallback, and null return for unknown plant.
- Verification: `npm run lint` clean, `npm test` 39/39 pass, `npm run build` succeeds (275 kB JS).
- Decisions made: None — data-only replacement, no DEC record required.
- Open issues/blockers: None.
- Next actions:
  - WB-ARCH-0002 (future) — phase 2 modularization: extract right-panel tabs (Learn, Layers, Timeline) as sub-components.

---

### 2026-04-30 - Session 4

- Markers: `WB-DX-0002`
- Objective: Interaction test suite — keyboard shortcuts and move-mode lifecycle.
- Work completed:
  - Extracted `createKeyDownHandler(opts)` pure factory from `useKeyboardShortcuts.js`; hook now calls it internally. Refactored hook signature to destructure opts so dep array matches exactly (eliminating the `react-hooks/exhaustive-deps` warning about `opts`).
  - Created `tests/keyboardShortcuts.test.js`: 16 tests covering Ctrl+Z/Y, Meta+Z, Ctrl+Shift+Z, Escape variants (new vs. moved tool), Delete (with item, no item, input focus guard), Arrow keys (right/left/clamp, pan-mode no-op, selectedTool no-op, structure no-op).
  - Added 3 move-mode tests to `tests/planner.test.js`: RESET_TO_COMMITTED after PICKUP restores item to items list; PICKUP_ITEM when item already absent is a no-op on history; LOAD_ITEMS after undo branch does not corrupt history.
- Verification: `npm run lint` clean (0 errors, 0 warnings), `npm test` 33/33 pass, `npm run build` succeeds (275 kB JS).
- Decisions made: None — pure test coverage expansion, no DEC record required.
- Open issues/blockers: None.
- Next actions:
  - WB-DATA-0001 — replace heuristic zone window shift formula with plant/zone lookup table.
  - WB-ARCH-0002 (future) — phase 2 modularization: extract right-panel tabs (Learn, Layers, Timeline) as sub-components.

---

### 2026-04-25 - Session 3

- Markers: `WB-ARCH-0001`
- Objective: Extract three custom hooks from GardenPlanner.jsx to reduce its size and improve maintainability.
- Work completed:
  - Created `src/features/planner/useCameraControls.js`: owns `camera` state, `cursorWorld` state, and all derived callbacks (`toWorld`, `setCursorFromClient`, `fitToView`, `zoomAt`, `zoomFromViewportCenter`) plus the initial fit-to-view effect.
  - Created `src/features/planner/usePlannerIO.js`: owns `handleSave`, `handleLoad`, `handlePrint` — all file I/O logic extracted cleanly with a `loadItems` callback for the dispatch boundary.
  - Created `src/features/planner/useKeyboardShortcuts.js`: owns the `keydown` event handler (undo/redo, Escape, Delete, arrow-key nudge).
  - Updated `src/components/GardenPlanner.jsx`: removed extracted code, added hook imports and call sites. Line count reduced from 1,548 → 1,345 (−203 lines).
  - Fixed `viewportRef` missing from `useCallback` dep arrays in `useCameraControls.js` to satisfy the React Compiler lint rule (`react-hooks/preserve-manual-memoization`).
- Verification: `npm run lint` clean, `npm test` 14/14 pass, `npm run build` succeeds (275 kB JS).
- Decisions made: None — purely behavioral refactor, no DEC record required.
- Open issues/blockers: None.
- Next actions:
  - WB-DX-0002 — interaction test suite (move mode, right-click cancel, keyboard shortcuts) — now easier since keyboard logic lives in a standalone hook.
  - WB-DATA-0001 — replace heuristic zone window shift formula with plant/zone lookup table.
  - WB-ARCH-0002 (future) — phase 2 modularization: extract right-panel tabs (Learn, Layers, Timeline) as sub-components.

---

### 2026-04-25 - Session 2

- Markers: `WB-FIX-0001`
- Objective: Robustness quick wins — ZIP lookup timeout, error boundary, undo history cap, plant neighbor ID validation.
- Work completed:
  - `src/components/GardenSetup.jsx`: Added `AbortController` + 8 s timeout to ZIP lookup; `AbortError` produces a specific "timed out" message instead of the generic error.
  - `src/App.jsx`: Added inline `ErrorBoundary` class component wrapping all rendered content; shows reload prompt on unhandled crash.
  - `src/features/planner/planReducer.js`: `COMMIT_ITEMS` now caps history at 50 entries (`MAX_HISTORY = 50`), preventing unbounded memory growth.
  - `src/features/catalog/catalog.js`: Exported `validatePlantNeighborIds()` function; dev-mode guard logs unknown neighbor IDs on startup; fixed `.js` extension on `plantDatabase` import for Node ESM compatibility.
  - `src/features/catalog/plantDatabase.js`: Removed 23 invalid neighbor ID references across 19 plants (IDs `dill`, `fennel`, `pea`, `cabbage`, `cucumber`, `squash`, `rue`, `asparagus`, `rose`, `sage`, `brassica` were referenced but absent from the DB). `corn.goodNeighbors` updated to use `zucchini` (the correct DB ID) instead of `squash`; `lavender.goodNeighbors` updated to `['daisy']`.
  - `tests/planner.test.js`: Added two new tests — history cap enforced at 50, and neighbor ID integrity check.
- Verification: `npm run lint` clean, `npm test` 14/14 pass, `npm run build` succeeds (273 kB JS, 22 kB CSS).
- Decisions made: None — all changes are low-risk, no DEC record required.
- Open issues/blockers: None.
- Next actions:
  - WB-ARCH-0001 — split `GardenPlanner.jsx` (1 548 lines) into focused modules (camera, canvas, inspector, panels).
  - WB-DX-0002 — interaction test suite (move mode, right-click cancel, keyboard shortcuts).
  - WB-DATA-0001 — replace heuristic zone window shift formula with plant/zone lookup table.

---

### 2026-04-24 - Session 1

- Markers: `WB-DX-0001`
- Objective: Bootstrap the engineering scaffold onto the Willowbrook repo.
- Work completed: Created CLAUDE.md, policies/project-policy.yaml, docs/work-index.md, docs/session-log.md, docs/decisions/DEC-0001.md. Added docs/experiments/ placeholder. This is a cross-cutting item across the Solfood GitHub Pages suite (SUITE-DX-0001).
- Verification: All placeholder values replaced; scaffold structure matches engineering-scaffold-template. Policy reflects actual tech stack (React 18, Vite, TypeScript, Tailwind, lucide-react). Risk tolerance set to low — no server-side data or auth. `suite` block correctly references bluray and recipes-wiki.
- Decisions made: DEC-0001 — adopt engineering scaffold for AI-assisted development. Low risk.
- Open issues/blockers: None.
- Next actions: Start next real work item — review Willowbrook's existing ARCHITECTURE_AND_DATA_PLAYBOOK.md to extract decisions into DEC records, or pick up a new feature from the backlog.
- References: engineering-scaffold-template, SUITE-DX-0001
