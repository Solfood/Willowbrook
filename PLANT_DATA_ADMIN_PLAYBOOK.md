# Plant Data Admin Playbook

Last updated: February 22, 2026  
Owner role: "Junior admin" for plant intelligence data quality

## Purpose
- Keep plant spacing, neighbor guidance, and planting windows accurate and auditable.
- Make the catalog extensible without losing trust in recommendations.
- Give future contributors (human or AI) a repeatable workflow.

## Current State
- App data source: `src/features/catalog/plantDatabase.js`
- Derived helpers: `src/features/catalog/catalog.js`
- UI consumers:
  - placement guidance + Learn tab: `src/components/GardenPlanner.jsx`
  - plant cards: `src/components/Sidebar.jsx`
- Metadata status:
  - all current plant entries include `sourceRefs`, `lastReviewed`, `regionScope`, and `evidence`
  - companion guidance remains advisory (`neighbors` confidence generally low)

## Source Policy (Required)
- Prefer primary/authoritative sources:
  - Land-grant university extension publications
  - USDA where applicable
  - Peer-reviewed papers for disputed claims
- Companion planting claims are often weak evidence:
  - mark evidence level
  - avoid presenting anecdotal claims as hard rules
- Every factual entry should include provenance metadata.

## Verified Accessible Reference Sources
Checked accessible on February 22, 2026.

### USDA / Government
- USDA Plant Hardiness Zone Map: https://planthardiness.ars.usda.gov
- USDA NAL page on companion planting overview: https://www.nal.usda.gov/farms-and-agricultural-production-systems/companion-planting-guide

### Extension / University
- University of Minnesota Extension (tomatoes): https://extension.umn.edu/vegetables/growing-tomatoes
- Cornell gardening resources landing: https://gardening.cals.cornell.edu
- NC State Extension (planting calendars and crop guidance): https://extensiongardener.ces.ncsu.edu/planting-calendar/
- Purdue Extension publication library search (vegetable crop references): https://edustore.purdue.edu
- Washington State University extension (home garden publications): https://extension.wsu.edu

### Evidence caution source
- Texas A&M AgriLife (companion planting caveats): https://agrilifeextension.tamu.edu/library/gardening/companion-planting/

## Proposed Data Schema Additions
Add these fields to each plant record over time:

- `sourceRefs`: array of source objects
  - `title`
  - `url`
  - `publisher`
  - `lastChecked` (ISO date)
- `lastReviewed` (ISO date)
- `regionScope` (e.g., `US-general`, `US-zone-7`, `NC`)
- `evidence`
  - `spacing`: `high|medium|low`
  - `neighbors`: `high|medium|low`
  - `window`: `high|medium|low`
- `spacingInches`
  - eventually migrate to `spacingRangeInches: { min, max, recommended }`
- `goodNeighbors`, `avoidNeighbors`
  - keep but treat as advisory unless high-confidence source support
- `plantingWindow`
  - currently single range; later move to zone-aware windows

## Review Rules
- Spacing:
  - require >=2 aligned references OR 1 strong extension source with high confidence
- Planting windows:
  - must include region scope
  - do not claim universal timing for all US climates
- Companion relationships:
  - default `medium/low` unless extension or research-backed
  - conflicting claims -> keep as advisory and flag in notes

## Update Workflow
1. Pick plants to review (start with top-used plants in app).
2. Gather candidate values from authoritative sources.
3. Record source links + review date.
4. Resolve conflicts:
   - prefer extension/localized guidance
   - if unresolved, store conservative default + lower confidence
5. Update `plantDatabase.js`.
6. Run quality checks:
   - `npm run lint`
   - `npm test`
   - `npm run build`
7. Commit with clear message including plant IDs touched.
8. Update this playbook with any new findings, caveats, or workflow changes before final handoff.

## Quality Gate Checklist (Before Merge)
- [ ] Every modified plant has at least one `sourceRef`
- [ ] `lastReviewed` updated
- [ ] No empty neighbor arrays without intentional decision
- [ ] Spacing values are realistic and units are inches
- [ ] UI still renders Learn/Timeline/Sidebar spacing details
- [ ] New UI data is compact by default (details can expand; avoid clutter)
- [ ] Lint, tests, and build pass

## Iteration Continuity Check (Required Every Session)
Before ending any plant-data-related iteration:
- [ ] Update `PLANT_DATA_ADMIN_PLAYBOOK.md` with what changed in this session
- [ ] Add at least one "learning" or "caveat" if applicable
- [ ] Confirm whether confidence levels changed for any affected plants
- [ ] Confirm UI remains readable with added data (no default clutter)

Future assistant prompt guardrail:
"Before final response, update `PLANT_DATA_ADMIN_PLAYBOOK.md` with new findings and explicitly confirm the Iteration Continuity Check items."

## New Learnings (Session Notes)
- Rich plant metadata can clutter the Learn panel quickly; default state should show compact chips and summaries, with `details` expanders for sources and nearby diagnostics.
- Spacing guidance is substantially stronger than companion guidance for most home-garden datasets; keep companion confidence conservative unless direct extension-backed evidence is available.
- Region scope needs to be visible in UI whenever a planting window is shown to avoid overclaiming universality.

## Roadmap (Recommended)
1. Add provenance + evidence fields in code and UI.
2. Add zone-aware planting windows (`USDA zone` setting in app).
3. Add script-based validation for missing source metadata.
4. Add import pipeline from curated CSV/JSON review files.
5. Add tests for spacing/neighbor warning logic.

## Future Prompt Templates
Use these prompts for future development sessions.

### A) Data accuracy pass
"Audit and update spacing + planting windows for these plant IDs: [ids]. Use only extension/USDA-quality sources, record sourceRefs and confidence, and run lint/test/build."

### B) Companion evidence pass
"Review companion guidance for [ids]. Classify each rule as high/medium/low evidence with source links. Downgrade uncertain claims to advisory."

### C) Regionalization pass
"Implement zone-aware planting windows for USDA zones 5-9. Keep fallback defaults and update Learn/Timeline UI to show zone context."

### D) Validation tooling pass
"Add a validation script that fails CI when plant entries are missing sourceRefs, lastReviewed, or confidence fields."

## Non-Negotiables
- Do not add new plant facts without source URLs.
- Do not treat companion data as deterministic unless evidence is strong.
- Keep user-facing guidance transparent when confidence is low.
