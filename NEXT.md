# NEXT — Follow-up Work After PR #1 (WB-ARCH-0003 Plan 2 spec + Plan 1 code)

The merged PR shipped Plan 1 (data layer + AlmanacShell skeleton) and the full spec/plan documents for Plan 2 (Library + Beds) and Plan 3 (Agenda). All three feature views are still placeholders. Items below are sourced from the plan and spec documents.

---

## Small

| # | Item | Description |
|---|------|-------------|
| S1 | **Catalog helpers** (`getAllPlants`, `getPlantsById`) | Pure functions that merge the 28 bundled plants with `plan.customPlants` into a single array or id-map. Unblocks every Library and Beds component. Tests specified in Plan 2 doc Task 1. |
| S2 | **`libraryFilters.js`** | Pure search + category-filter module for LibraryView. Takes the merged plant list, a query string, and an optional category; returns filtered results. |
| S3 | **Edit bundled plants (clone workaround)** | Bundled plants are read-only. A small "Clone to My Plants" button on a plant card copies it into `customPlants` so users can edit it. No new reducer actions needed. |
| S4 | **Library import/export affordance** | An explicit "Export my plants" button that serialises only `customPlants` to a JSON file. The JSON save/load already round-trips them; this just surfaces the action in the UI. |

---

## Medium

| # | Item | Description |
|---|------|-------------|
| M1 | **`footprint.js` + `BedFootprint.jsx`** | Row-major packing algorithm that fills a bed grid with plant icons; renders as a `<pre>` emoji grid with legend and overflow warning. Pure module with unit tests. |
| M2 | **`wikidataLookup.js`** | Fetch-and-normalize helper for the Wikidata SPARQL endpoint. Returns candidate plant records (name, common names, GBIF taxon ID) for a free-text query. DI-friendly for testing. |
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

**S1 → S2 → M1** in sequence: the catalog helpers feed the library filters, and the footprint module is self-contained. Together they clear the entire pure-logic layer for Plan 2 so the UI components (L1, L2) can be assembled in one further run.
