# Willowbrook Almanac — Plan 3 (Agenda) Design Spec

**Date:** 2026-05-29
**Status:** Draft (autonomous handoff — user asleep; defensible defaults applied where the foundation spec was silent)
**Marker:** WB-ARCH-0003
**Parent spec:** [Foundation §5](./2026-05-27-willowbrook-almanac-design.md)
**Plan 2 context:** [Plan 2 design](./2026-05-27-willowbrook-almanac-plan-2-design.md)

---

## 1. Goal

Implement the **Agenda** track from the foundation spec §5. The Agenda is the home view of the app — a derived, dateful list of *what to do this week and next* computed from the user's actual plantings. Each task is one line: action + plant + bed + reason. Tasks become **overdue** if not marked done; they disappear from the list seven days after their original date.

Also wires the **next-task** line stubbed on the bed cards in `BedsView.jsx` (Plan 2 left it as just plantings summary).

---

## 2. Non-goals for this slice

- **No "Could plant now" suggestions toggle.** Foundation §2.1 lists this as an optional toggle; deferring to a later track. It complicates the agenda contract (suggestion tasks have no `plantingId` so the mark-done semantics fork) for marginal v1 value.
- **No `succession` action.** Foundation §5's task shape lists it, but no firing rule is defined. Skip until a use case is concrete.
- **No "edit task" UI.** Tasks are read-only except for mark-done. Foundation §2.1 explicitly states this.
- **No tests on `AgendaView.jsx` itself.** Pure logic in `agenda.js` gets `node:test` coverage; the view is React glue (per foundation §10 test-budget policy).
- **No URL routing** to a specific task. v1 just lands on the Agenda when the tab is selected.

---

## 3. Architecture

Single new pure module + one rebuilt view component + one small edit to an existing view.

```
src/features/agenda/
  agenda.js           # NEW — pure compute, tested
  AgendaView.jsx      # REBUILD — currently a placeholder

src/features/beds/
  BedsView.jsx        # EDIT — render next-task line on each card

tests/
  agenda.test.js      # NEW
```

The reducer already exposes `MARK_TASK_DONE` (`{ plantingId, nextStatus, date }`). No reducer changes.

Catalog already exposes `getPlantsById(plan)` and `getPlantingWindow(id, zone)` with zone-shift applied. No catalog changes.

---

## 4. Pure module: `agenda.js`

### 4.1 Public exports

```js
export const AGENDA_WINDOW_DAYS = 14;       // this week + next week
export const AGENDA_OVERDUE_GRACE_DAYS = 7; // days back we still show as overdue

export function isoToday(now = new Date()) { /* "YYYY-MM-DD" in local time */ }
export function addDays(isoDate, days) { /* "YYYY-MM-DD" */ }
export function daysBetween(isoA, isoB) { /* signed integer; B − A */ }

export function computeTaskForPlanting({ planting, plant, lastFrostDate, zone, year }) {
    // returns { date, action, nextStatus, reason } | null
}

export function computeAgenda({
    plantings,
    plantsById,
    beds,
    zone,
    lastFrostDate,
    today,                           // injectable; defaults to isoToday()
    windowDays = AGENDA_WINDOW_DAYS,
}) {
    // returns { overdue: Task[], thisWeek: Task[], nextWeek: Task[] }
}
```

`Task` shape (mirrors foundation §5 with two added fields for the dispatch round-trip):

```js
{
    id: string;            // "task-<plantingId>-<action>" — stable
    date: string;          // ISO date the task fires
    action: "start_indoors" | "direct_sow" | "transplant" | "harvest";
    plantingId: string;
    plantName: string;
    bedName: string;
    reason: string;
    nextStatus: "sown_indoors" | "direct_sown" | "transplanted" | "harvested";
}
```

`id` is deterministic so React keys are stable and "this task is already in the list" checks are trivial.

### 4.2 Date math — local-date semantics, no UTC drift

All dates flow in and out as `"YYYY-MM-DD"` strings. `isoToday()` constructs from local time so 11pm on the user's clock doesn't render tomorrow's tasks. `addDays(iso, n)` parses the components as integers and constructs `new Date(y, m-1, d+n)` (local) — this is leap-year and DST safe for date-only arithmetic. `daysBetween(a, b)` works on millis at noon local to dodge any DST midnight ambiguity.

### 4.3 Task generation rules

For each planting, look up its `plant` from `plantsById`. If the plant is missing (custom plant got removed mid-session), the planting produces no task.

| Planting status         | Plant precondition                                | Task date                                            | Action          | `nextStatus`     |
|-------------------------|---------------------------------------------------|------------------------------------------------------|-----------------|------------------|
| `planned`               | `startIndoorsWeeksBeforeLastFrost > 0`            | `lastFrostDate − N×7 days`                           | `start_indoors` | `sown_indoors`   |
| `planned`               | `startIndoorsWeeksBeforeLastFrost === 0` (direct) | first day of zone-shifted `plantingWindow` in `year` | `direct_sow`    | `direct_sown`    |
| `sown_indoors`          | (any)                                             | `lastFrostDate + 7 days`                             | `transplant`    | `transplanted`   |
| `transplanted`          | `daysToMaturity > 0`, has `datePlanted`           | `datePlanted + daysToMaturity`                       | `harvest`       | `harvested`      |
| `direct_sown`           | `daysToMaturity > 0`, has `datePlanted`           | `datePlanted + daysToMaturity`                       | `harvest`       | `harvested`      |
| `harvested` / `removed` | —                                                 | (no task — terminal states)                          | —               | —                |

**Year resolution for direct-sow planted-state tasks.** `year` defaults to `parseInt(today.slice(0,4), 10)`. If the resolved first-day-of-window already passed by more than `AGENDA_OVERDUE_GRACE_DAYS`, no task is emitted (user is past the planting window for this year — silently drop rather than nag).

**Reason text** is human readable, derived per action:

- `start_indoors` → `"Start indoors — ${weeks} weeks before last frost"`
- `direct_sow` → `"Direct-sow — planting window opens"`
- `transplant` → `"Transplant out — last frost is past"`
- `harvest` → `"Harvest — ${dtm} days to maturity reached"`

### 4.4 Windowing and sorting

After producing one task per relevant planting:

1. Drop tasks whose `date` is older than `today − AGENDA_OVERDUE_GRACE_DAYS`.
2. Drop tasks whose `date` is later than `today + windowDays`.
3. Classify each survivor into one of three buckets:
   - **overdue** — `date < today`
   - **thisWeek** — `today ≤ date ≤ today + 6`
   - **nextWeek** — `today + 7 ≤ date ≤ today + windowDays`
4. Sort each bucket by `date` ascending, then `plantingId` ascending (deterministic tiebreak — keeps test snapshots stable and React keys monotonic).

Overdue lives at the top of the rendered view (most urgent), then this week, then next week.

---

## 5. AgendaView

### 5.1 Empty state

When `plan.plantings` is empty:

> "**Agenda is empty.**
> Add a bed and at least one planning so we can compute what to do next."

A button "Go to Beds" wired to a `onSwitchView('beds')` callback (passed in by `AlmanacShell`).

### 5.2 Populated state

Three stacked sections, only rendered if their bucket is non-empty:

- **Overdue** — amber header pill (Tailwind `bg-amber-100 text-amber-800`)
- **This week** — green header pill (`bg-green-100 text-green-800`)
- **Next week** — gray header pill (`bg-gray-100 text-gray-700`)

If all three buckets are empty (i.e. all plantings are terminal or out of window), show:

> "**Nothing on the agenda this fortnight.**
> Plantings will appear here as their dates approach."

### 5.3 Task row

```
[icon]  Tomato — Backyard West                    [Mark done]
        Start indoors — 6 weeks before last frost
        Wed Feb 25
```

- Icon: plant's emoji from `plantsById[plantingId].icon`
- Headline: `${plantName} — ${bedName}` (use the bed name from `beds` lookup; falls back to "(no bed)" if the bed has been removed mid-session)
- Reason: italic, smaller, gray
- Date: `Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(...)`
- Action button: dispatches `actions.markTaskDone({ plantingId, nextStatus, date: isoToday() })`

### 5.4 Mark-done semantics

`MARK_TASK_DONE` is already wired in the reducer to set `status: nextStatus, datePlanted: date || existing`. The Agenda always passes `date: isoToday()`:

- `start_indoors` → `sown_indoors` + datePlanted=today (so the transplant date computes correctly later)
- `direct_sow` → `direct_sown` + datePlanted=today (DTM clock starts now)
- `transplant` → `transplanted` + datePlanted=today (DTM clock starts at transplant date for v1; spec-acknowledged simplification — see §8.2)
- `harvest` → `harvested` + datePlanted unchanged (we pass today but the resulting planting moves to terminal state so the field's value no longer matters)

The next compute pass naturally produces the next-stage task for that planting (e.g., marking start-indoors done makes the transplant task appear when the date is in window).

---

## 6. BedsView next-task line

For each bed, find the **earliest-date task** across that bed's plantings, regardless of bucket. Render below the planting summary line:

```
3 Tomato · 12 Basil · 24 Carrot
↓
Next: Transplant Tomato — Wed Feb 25
```

If the bed has no upcoming task (all terminal or out of window), the line reads:

```
Next: (nothing scheduled)
```

Implementation: compute `computeAgenda(...)` once at the top of `BedsView`, then index its three buckets concatenated into a `tasksByBedId: { [bedId]: Task | null }` map (the per-bed earliest task).

---

## 7. Data dependencies on existing plant DB

`agenda.js` reads three plant fields:

- `daysToMaturity` (already present from Plan 1 schema bump)
- `startIndoorsWeeksBeforeLastFrost` (already present)
- `plantingWindow` — read via the existing `getPlantingWindow(id, zone)` so zone-shift applies

It reads two planting fields:

- `status`
- `datePlanted`

And one garden field:

- `lastFrostDate` (passed in)

The existing `validatePlantTimingFields()` already gates the bundled DB against missing values; user-added custom plants are validated by `AddPlantForm` (which ships with required-field checks for spacing + DTM per Plan 2 spec §3.2). No new validation needed here.

---

## 8. Threat model (low risk)

### 8.1 Surface

- No new I/O. No fetch. No DOM injection. No untrusted strings interpolated into HTML attributes.
- All user-visible strings go through React's default escaping.

### 8.2 Acknowledged simplifications

- **Transplant date = today.** Some growers track sow-date and transplant-date separately; the v1 schema has a single `datePlanted` field. Overwriting it on mark-done-transplant is a known v1 approximation, documented here. A future schema bump could add `dateTransplanted` but it isn't worth the migration.
- **Calendar drift across midnight while the tab is open.** `today` is captured at render time. If a user leaves the tab open past midnight, the agenda doesn't auto-refresh. Acceptable for v1 — re-rendering on a 1-minute interval just to catch this is over-engineering.

### 8.3 Performance

`computeAgenda` is O(plantings) with constant work per planting (one date-add, two comparisons, one sort over a small array). Even at 500 plantings (way past realistic) this runs in well under a millisecond. No memoization needed.

---

## 9. Bundle budget

Plan 2 shipped at ~270 kB JS / ~79 kB gzipped under a revised budget of 300 kB JS / 100 kB gzipped (see Plan 2 spec §9). Plan 3 adds:

- `agenda.js` — ~2 kB raw, no new deps
- `AgendaView.jsx` rebuild — ~3 kB net (replaces a 12-line placeholder with a real component)
- `BedsView` edit — < 1 kB net

Estimated total post-Plan-3: ~275 kB JS / ~81 kB gzipped. Well inside budget. Verification gate (§10) re-checks at build time.

---

## 10. Verification

- `npm test` — `agenda.test.js` passes alongside the existing 7 test files
- `npm run lint` clean
- `npm run build` — bundle ≤ 300 kB JS / ≤ 100 kB gzipped per Plan 2 §9

---

## 11. Success criteria for this slice

- A user with three plantings in mixed statuses (planned tomato, sown_indoors basil, transplanted lettuce) sees three tasks in the Agenda with correct dates and reasons.
- Marking a `start_indoors` task done advances the planting to `sown_indoors`, and the next render of the agenda surfaces the transplant task for the same planting when the date enters the window.
- A task whose date was three days ago and is still un-acted-on appears in the **Overdue** section.
- A bed card's "Next: …" line matches the earliest task for that bed; bed cards with no upcoming task read "Next: (nothing scheduled)".
- Save → reload reproduces an identical agenda (deterministic, no `Date.now()` randomness leaking into the compute path).

---

## 12. Open follow-ups (post-v1)

- "Could plant now" suggestions toggle (deferred — §2).
- Succession scheduling (radishes every 2 weeks for 4 rounds) (deferred — §2).
- Distinct `dateSown` vs `dateTransplanted` fields with schema migration.
- iCalendar (.ics) export of the agenda so it shows up in Apple/Google Calendar.
- Push/email reminders (would require a backend; out of scope for the static-site posture in foundation §10).
