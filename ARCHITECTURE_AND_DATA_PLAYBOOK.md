# Architecture And Data Playbook

Last updated: February 22, 2026  
Role: engineering maintainer (product, architecture, data quality)

## Scope
- UI/interaction architecture
- Planner state and persistence
- Plant intelligence data quality
- Release safety and regression checks

## System Map
- Setup UI: `src/components/GardenSetup.jsx`
- App shell/state handoff: `src/App.jsx`
- Main planner and UX logic: `src/components/GardenPlanner.jsx`
- Plant catalog/data helpers: `src/features/catalog/catalog.js`
- Plant source-of-truth records: `src/features/catalog/plantDatabase.js`
- Save/load schema validation: `src/features/planner/planSchema.js`
- Core tests: `tests/planner.test.js`

## Architecture Principles
- Desktop-first editing UX; do not silently degrade interaction semantics.
- Keep core actions explicit:
  - left click: act/select/place based on mode
  - right click: cancel/deselect
  - keyboard delete: remove selected
- Keep heavy guidance data compact by default; expand details on demand.
- Any new model field must flow end-to-end:
  - setup/input
  - runtime state
  - save/load schema
  - relevant UI surfaces
  - tests

## Plant Data Governance
- Prefer authoritative sources:
  - land-grant extension first
  - USDA/government where applicable
  - peer-reviewed sources when disputes matter
- Companion relationships are advisory unless strong evidence exists.
- Required metadata per plant:
  - `sourceRefs[]`
  - `lastReviewed`
  - `regionScope`
  - `evidence.spacing|neighbors|window`

## Confidence Semantics
- `S/N/W` in UI means:
  - `S`: spacing confidence
  - `N`: neighbor confidence
  - `W`: planting-window confidence
- Scale:
  - `high`: strong extension/government support
  - `medium`: partial support or limited agreement
  - `low`: heuristic/advisory/incomplete evidence

## Zone Strategy (Implemented)
- USDA zone is captured during setup.
- Zone is persisted in save files and validated on load.
- Timeline/Learn window guidance uses zone-aware window shifting.
- Important caveat:
  - current zone shift is a broad heuristic, not a full regional agronomy model.
  - USDA map embedding can be browser-policy dependent; always keep a direct "open in new tab" fallback.

## Interaction Learnings (Recent)
- Selection should not clear when cursor moves from canvas to side panels.
- Move mode must clear any active "new placement" tool to prevent accidental placement.
- Right-click should never behave like left-click placement.
- Emoji-as-SVG icons can blur under transformed canvases; native glyph rendering is crisper.
- ZIP-based zone auto-detection improves accuracy and onboarding speed over manual dropdown selection.

## UI Clutter Policy
- Default panels show concise summary chips.
- Verbose diagnostics (sources, nearby plants) go into `<details>` expanders.
- Any added explanatory key must be compact and opt-in.

## Release Regression Method (Required Before Push)
1. Diff review focused on behavior edges (mode switching, selection, load/save, keybindings).
2. Run:
  - `npm run lint`
  - `npm test`
  - `npm run build`
3. Spot-check high-risk flows:
  - Place/Move/Delete
  - Right-click cancel
  - Learn context persistence
  - Save/load compatibility
  - Zone propagation
4. Document findings in this playbook before final handoff.

## External Integration Notes
- Zone auto-set uses: `https://phzmapi.org/{ZIP}.json`
  - treat as best-effort UX helper
  - must fail gracefully with clear message
  - dropdown remains authoritative/manual fallback
- USDA map reference:
  - primary: embedded map frame on setup screen
  - fallback: external link `https://planthardiness.ars.usda.gov/`

## Iteration Continuity Check (Mandatory Every Session)
Before ending a feature session:
- [ ] Update this file with new findings/methods/caveats
- [ ] Record any architecture decisions or known tradeoffs
- [ ] Confirm regression method was run
- [ ] Confirm UI readability was preserved
- [ ] Confirm tests/build status

Future assistant guardrail prompt:
"Before final response, update `ARCHITECTURE_AND_DATA_PLAYBOOK.md` with session findings and confirm the Iteration Continuity Check."

## Backlog Priorities
1. Replace heuristic zone window shifts with plant/zone table data.
2. Add CI validator for missing/old `sourceRefs` and stale `lastReviewed`.
3. Add interaction tests for move-mode and right-click semantics.
4. Add migration path for future schema versions (`schemaVersion`).

## Non-Negotiables
- Do not add new plant facts without source URLs.
- Do not represent low-confidence companion guidance as deterministic.
- Do not push UX changes that break core edit semantics without explicit review.
