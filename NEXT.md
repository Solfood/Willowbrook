# NEXT — Follow-up Work After PR #1 (WB-ARCH-0003 Plan 2 spec + Plan 1 code)

The merged PR shipped Plan 1 (data layer + AlmanacShell skeleton) and the full spec/plan documents for Plan 2 (Library + Beds) and Plan 3 (Agenda). All three feature views are still placeholders. Items below are sourced from the plan and spec documents.

---

## Small

| # | Item | Description |
|---|------|-------------|
| ~~S1~~ | ~~**Catalog helpers** (`getAllPlants`, `getPlantsById`)~~ | ~~Done — session 8.~~ |
| ~~S2~~ | ~~**`libraryFilters.js`**~~ | ~~Done — this run.~~ |
| ~~S3~~ | ~~**Edit bundled plants (clone workaround)**~~ | ~~Done — this run.~~ |
| ~~S4~~ | ~~**Library import/export affordance**~~ | ~~Done — this run (bundled with S3 in LibraryView).~~ |

---

## Medium

| # | Item | Description |
|---|------|-------------|
| ~~M1~~ | ~~**`footprint.js` + `BedFootprint.jsx`**~~ | ~~Done — this run.~~ |
| ~~M2~~ | ~~**`wikidataLookup.js`**~~ | ~~Done — this run.~~ |
| M3 | **Year-over-year crop rotation hints** | The data model already stores `history` per bed. A pure function can flag beds where the same plant family appears in consecutive years. Read-only badge on BedDetail. |
| M4 | **Mobile-friendly Agenda view** | Read-only weekly task list optimised for narrow viewports. The data is all local; no backend needed. Editing interactions deferred. |

---

## Large

| # | Item | Description |
|---|------|-------------|
| L1 | **Plan 2 — LibraryView** | Card-grid library showing bundled + custom plants; AddPlantForm drawer with manual entry and optional Wikidata lookup. Full Plan 2 Task 2–8 scope. |
| L2 | **Plan 2 — BedsView + BedDetail** | Bed cards list, Add Bed modal, and BedDetail page (plantings table, BedFootprint preview, journal log, prior-season history). Plan 2 Task 9–14 scope. |
| L3 | **Plan 3 — Agenda engine + AgendaView** | `agenda.js` pure calendar/task computation; AgendaView weekly task list; mark-task-done flow; "could plant now" suggestions. Plan 3 full scope. |
| L4 | **Photos in journal entries** | Attach photos to journal notes. Storage strategy TBD (IndexedDB preferred over base64-in-JSON). |
| L5 | **Weather integration** | Pull frost-warning or precipitation data to annotate the Agenda view. Requires a weather API decision. |
| L6 | **Real 2D layout editor** | Replace the deterministic row-major footprint packing with an interactive square-foot-gardening grid editor inside BedDetail. |
| L7 | **Multi-user / shared garden** | Shared plan state synced across devices or users. Requires a backend; out of scope for the current static-site architecture. |

---

## Recommended next run

**M3 → M4** then begin L1 or L2. All pure-logic modules for Plan 2 are now done; the next run should assemble the full Plan 2 UI (LibraryView AddPlantForm, BedsView, BedDetail).

---

## Stopped at (session 9 — 2026-05-28)

**Items completed (5/5):**
1. S2 — `libraryFilters.js` (pure filter + category helpers, 12 tests)
2. S3 — Clone to My Plants button in LibraryView
3. S4 — Export My Plants JSON download in LibraryView (bundled with S3)
4. M1 — `footprint.js` row-major packing + `BedFootprint.jsx` emoji `<pre>` grid (12 tests)
5. M2 — `wikidataLookup.js` Wikidata SPARQL fetch-and-normalise (11 tests)

**Items skipped:** M3, M4, L1–L7 — stop limit reached at 5 substantive items.

**Items added during run:** None.

**Blockers discovered:** None.
