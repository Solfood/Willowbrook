# Session Log

Append-only continuity log.

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
