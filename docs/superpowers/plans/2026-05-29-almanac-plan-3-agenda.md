# Willowbrook Almanac — Plan 3 (Agenda) Implementation Plan

**Goal:** Implement the Agenda track from the foundation spec §5 and Plan 3 design — a derived weekly task list with overdue/this-week/next-week sections, mark-done flow, and a next-task line on each bed card.

**Architecture:** One new pure module (`agenda.js`), one rebuilt view (`AgendaView.jsx`), one small edit (`BedsView.jsx`). No reducer or catalog changes.

**Tech Stack:** React 19, Vite 7, Tailwind 3, lucide-react, `node:test`.

**Spec:** [Plan 3 design](../specs/2026-05-29-willowbrook-almanac-plan-3-design.md)

**Marker:** All commits prefixed `WB-ARCH-0003:`.

---

## Task 1: agenda.js — date helpers + tests

**Files:**
- Create: `src/features/agenda/agenda.js`
- Create: `tests/agenda.test.js`

### Step 1: Write the failing tests for date helpers

```js
// tests/agenda.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoToday, addDays, daysBetween } from '../src/features/agenda/agenda.js';

test('isoToday returns YYYY-MM-DD in local time', () => {
    const fixed = new Date(2026, 4, 29, 10, 0, 0); // May 29 2026 10am local
    assert.equal(isoToday(fixed), '2026-05-29');
});

test('isoToday handles late-evening local time without UTC drift', () => {
    const lateNight = new Date(2026, 4, 29, 23, 30, 0);
    assert.equal(isoToday(lateNight), '2026-05-29');
});

test('addDays advances by N days, crossing month boundaries', () => {
    assert.equal(addDays('2026-01-30', 5), '2026-02-04');
});

test('addDays handles negative N (subtraction)', () => {
    assert.equal(addDays('2026-03-02', -5), '2026-02-25');
});

test('addDays handles leap-year February correctly', () => {
    assert.equal(addDays('2028-02-28', 1), '2028-02-29');
    assert.equal(addDays('2028-02-29', 1), '2028-03-01');
});

test('daysBetween returns signed integer (B − A)', () => {
    assert.equal(daysBetween('2026-05-29', '2026-06-05'), 7);
    assert.equal(daysBetween('2026-06-05', '2026-05-29'), -7);
    assert.equal(daysBetween('2026-05-29', '2026-05-29'), 0);
});
```

### Step 2: Run tests; verify they fail

```bash
npm test -- --test-name-pattern='isoToday|addDays|daysBetween'
```
Expected: failures (`agenda.js` does not exist).

### Step 3: Implement the helpers

```js
// src/features/agenda/agenda.js
export const AGENDA_WINDOW_DAYS = 14;
export const AGENDA_OVERDUE_GRACE_DAYS = 7;

function pad2(n) { return n < 10 ? `0${n}` : `${n}`; }

export function isoToday(now = new Date()) {
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function parseIsoLocal(iso) {
    const [y, m, d] = iso.split('-').map((s) => parseInt(s, 10));
    return new Date(y, m - 1, d);
}

export function addDays(iso, days) {
    const dt = parseIsoLocal(iso);
    dt.setDate(dt.getDate() + days);
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

export function daysBetween(isoA, isoB) {
    const a = parseIsoLocal(isoA); a.setHours(12, 0, 0, 0);
    const b = parseIsoLocal(isoB); b.setHours(12, 0, 0, 0);
    return Math.round((b.getTime() - a.getTime()) / 86400000);
}
```

### Step 4: Run tests; verify they pass

```bash
npm test -- --test-name-pattern='isoToday|addDays|daysBetween'
```
Expected: all 6 pass.

### Step 5: Commit

```bash
git add src/features/agenda/agenda.js tests/agenda.test.js
git commit -m "WB-ARCH-0003: agenda.js date helpers (isoToday, addDays, daysBetween) + tests"
```

---

## Task 2: agenda.js — task generation rules + tests

**Files:**
- Modify: `src/features/agenda/agenda.js`
- Modify: `tests/agenda.test.js`

### Step 1: Append failing tests for `computeTaskForPlanting`

```js
// tests/agenda.test.js — append
import { computeTaskForPlanting } from '../src/features/agenda/agenda.js';

const TOMATO = {
    id: 'tomato', name: 'Tomato', icon: '🍅',
    daysToMaturity: 75, startIndoorsWeeksBeforeLastFrost: 6,
    plantingWindow: { start: 3, end: 5 },
};
const CARROT = {
    id: 'carrot', name: 'Carrot', icon: '🥕',
    daysToMaturity: 70, startIndoorsWeeksBeforeLastFrost: 0,
    plantingWindow: { start: 2, end: 8 },
};
const LAST_FROST = '2026-04-15';

test('planned + indoor-start → start_indoors task at lastFrost − N weeks', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p1', plantId: 'tomato', status: 'planned', datePlanted: null },
        plant: TOMATO, lastFrostDate: LAST_FROST, zone: '7a', year: 2026,
    });
    assert.equal(task.action, 'start_indoors');
    assert.equal(task.nextStatus, 'sown_indoors');
    assert.equal(task.date, '2026-03-04'); // 6 × 7 = 42 days before 2026-04-15
    assert.match(task.reason, /6 weeks before last frost/);
});

test('planned + direct-sow → direct_sow task at first day of zone-shifted window', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p2', plantId: 'carrot', status: 'planned', datePlanted: null },
        plant: CARROT, lastFrostDate: LAST_FROST, zone: '7a', year: 2026,
    });
    assert.equal(task.action, 'direct_sow');
    assert.equal(task.nextStatus, 'direct_sown');
    assert.equal(task.date, '2026-03-01'); // month 2 (Mar), day 1
});

test('direct-sow date shifts with colder zone', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p3', plantId: 'carrot', status: 'planned', datePlanted: null },
        plant: CARROT, lastFrostDate: LAST_FROST, zone: '5a', year: 2026,
    });
    // zone 5a = +1 month shift → start month becomes April (index 3)
    assert.equal(task.date, '2026-04-01');
});

test('sown_indoors → transplant task at lastFrost + 7', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p4', plantId: 'tomato', status: 'sown_indoors', datePlanted: '2026-03-05' },
        plant: TOMATO, lastFrostDate: LAST_FROST, zone: '7a', year: 2026,
    });
    assert.equal(task.action, 'transplant');
    assert.equal(task.nextStatus, 'transplanted');
    assert.equal(task.date, '2026-04-22');
});

test('transplanted + datePlanted → harvest task at datePlanted + DTM', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p5', plantId: 'tomato', status: 'transplanted', datePlanted: '2026-04-22' },
        plant: TOMATO, lastFrostDate: LAST_FROST, zone: '7a', year: 2026,
    });
    assert.equal(task.action, 'harvest');
    assert.equal(task.nextStatus, 'harvested');
    assert.equal(task.date, '2026-07-06'); // 2026-04-22 + 75 days
});

test('direct_sown + datePlanted → harvest task at datePlanted + DTM', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p6', plantId: 'carrot', status: 'direct_sown', datePlanted: '2026-03-01' },
        plant: CARROT, lastFrostDate: LAST_FROST, zone: '7a', year: 2026,
    });
    assert.equal(task.action, 'harvest');
    assert.equal(task.date, '2026-05-10'); // +70 days
});

test('harvested → no task (terminal state)', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p7', plantId: 'tomato', status: 'harvested', datePlanted: '2026-04-22' },
        plant: TOMATO, lastFrostDate: LAST_FROST, zone: '7a', year: 2026,
    });
    assert.equal(task, null);
});

test('removed → no task (terminal state)', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p8', plantId: 'tomato', status: 'removed', datePlanted: null },
        plant: TOMATO, lastFrostDate: LAST_FROST, zone: '7a', year: 2026,
    });
    assert.equal(task, null);
});

test('transplanted but no datePlanted → no task (insufficient data)', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p9', plantId: 'tomato', status: 'transplanted', datePlanted: null },
        plant: TOMATO, lastFrostDate: LAST_FROST, zone: '7a', year: 2026,
    });
    assert.equal(task, null);
});
```

### Step 2: Run; verify failures

```bash
npm test -- --test-name-pattern='planned|sown_indoors|transplanted|direct_sown|harvested|removed'
```
Expected: 9 failures (function not exported).

### Step 3: Implement `computeTaskForPlanting`

Append to `src/features/agenda/agenda.js`:

```js
import { getPlantingWindow } from '../catalog/catalog.js';

const REASONS = {
    start_indoors: (weeks) => `Start indoors — ${weeks} weeks before last frost`,
    direct_sow: () => 'Direct-sow — planting window opens',
    transplant: () => 'Transplant out — last frost is past',
    harvest: (dtm) => `Harvest — ${dtm} days to maturity reached`,
};

export function computeTaskForPlanting({ planting, plant, lastFrostDate, zone, year }) {
    if (!plant || !planting) return null;
    const { status } = planting;

    if (status === 'harvested' || status === 'removed') return null;

    if (status === 'planned') {
        const weeks = plant.startIndoorsWeeksBeforeLastFrost;
        if (typeof weeks === 'number' && weeks > 0) {
            const date = addDays(lastFrostDate, -weeks * 7);
            return {
                date, action: 'start_indoors', nextStatus: 'sown_indoors',
                reason: REASONS.start_indoors(weeks),
            };
        }
        // direct-sow
        const window = getPlantingWindow(plant.id, zone);
        if (!window) return null;
        const month = window.start; // 0-indexed
        const date = `${year}-${month < 9 ? '0' : ''}${month + 1}-01`;
        return {
            date, action: 'direct_sow', nextStatus: 'direct_sown',
            reason: REASONS.direct_sow(),
        };
    }

    if (status === 'sown_indoors') {
        const date = addDays(lastFrostDate, 7);
        return {
            date, action: 'transplant', nextStatus: 'transplanted',
            reason: REASONS.transplant(),
        };
    }

    if (status === 'transplanted' || status === 'direct_sown') {
        if (!planting.datePlanted) return null;
        const dtm = plant.daysToMaturity;
        if (typeof dtm !== 'number' || dtm <= 0) return null;
        const date = addDays(planting.datePlanted, dtm);
        return {
            date, action: 'harvest', nextStatus: 'harvested',
            reason: REASONS.harvest(dtm),
        };
    }

    return null;
}
```

### Step 4: Run; verify passes

```bash
npm test
```
Expected: all agenda tests pass; existing tests still pass.

### Step 5: Commit

```bash
git add src/features/agenda/agenda.js tests/agenda.test.js
git commit -m "WB-ARCH-0003: agenda.js computeTaskForPlanting rules + tests for all status transitions"
```

---

## Task 3: agenda.js — computeAgenda windowing/sorting + tests

**Files:**
- Modify: `src/features/agenda/agenda.js`
- Modify: `tests/agenda.test.js`

### Step 1: Append failing tests

```js
// tests/agenda.test.js — append
import { computeAgenda, AGENDA_WINDOW_DAYS, AGENDA_OVERDUE_GRACE_DAYS } from '../src/features/agenda/agenda.js';

const BED_WEST = { id: 'bed-w', name: 'Backyard West', widthFt: 4, lengthFt: 8 };
const BED_STRIP = { id: 'bed-s', name: 'Salad Strip', widthFt: 2, lengthFt: 6 };

const PLANTS_BY_ID = { tomato: TOMATO, carrot: CARROT };

test('computeAgenda returns three buckets; overdue first', () => {
    const today = '2026-04-22'; // exactly the transplant date for tomato sown 03-05
    const plantings = [
        { id: 'pl-tom', bedId: 'bed-w', plantId: 'tomato', status: 'sown_indoors', datePlanted: '2026-03-05', quantity: 1, notes: '' },
    ];
    const r = computeAgenda({
        plantings, plantsById: PLANTS_BY_ID, beds: [BED_WEST, BED_STRIP],
        zone: '7a', lastFrostDate: LAST_FROST, today,
    });
    assert.equal(r.thisWeek.length, 1);
    assert.equal(r.thisWeek[0].action, 'transplant');
    assert.equal(r.thisWeek[0].plantName, 'Tomato');
    assert.equal(r.thisWeek[0].bedName, 'Backyard West');
    assert.equal(r.thisWeek[0].id, 'task-pl-tom-transplant');
});

test('computeAgenda puts a task dated 3 days ago in overdue', () => {
    const today = '2026-04-25'; // 3 days past 2026-04-22 transplant date
    const plantings = [
        { id: 'pl-tom', bedId: 'bed-w', plantId: 'tomato', status: 'sown_indoors', datePlanted: '2026-03-05', quantity: 1, notes: '' },
    ];
    const r = computeAgenda({
        plantings, plantsById: PLANTS_BY_ID, beds: [BED_WEST],
        zone: '7a', lastFrostDate: LAST_FROST, today,
    });
    assert.equal(r.overdue.length, 1);
    assert.equal(r.thisWeek.length, 0);
});

test('computeAgenda drops a task older than the overdue grace window', () => {
    const today = '2026-04-30'; // 8 days past, grace = 7
    const plantings = [
        { id: 'pl-tom', bedId: 'bed-w', plantId: 'tomato', status: 'sown_indoors', datePlanted: '2026-03-05', quantity: 1, notes: '' },
    ];
    const r = computeAgenda({
        plantings, plantsById: PLANTS_BY_ID, beds: [BED_WEST],
        zone: '7a', lastFrostDate: LAST_FROST, today,
    });
    assert.equal(r.overdue.length, 0);
    assert.equal(r.thisWeek.length, 0);
    assert.equal(r.nextWeek.length, 0);
});

test('computeAgenda puts a task 8 days from today in nextWeek', () => {
    const today = '2026-04-14'; // 8 days before 2026-04-22
    const plantings = [
        { id: 'pl-tom', bedId: 'bed-w', plantId: 'tomato', status: 'sown_indoors', datePlanted: '2026-03-05', quantity: 1, notes: '' },
    ];
    const r = computeAgenda({
        plantings, plantsById: PLANTS_BY_ID, beds: [BED_WEST],
        zone: '7a', lastFrostDate: LAST_FROST, today,
    });
    assert.equal(r.nextWeek.length, 1);
});

test('computeAgenda drops a task more than windowDays out', () => {
    const today = '2026-04-01'; // 21 days before 2026-04-22; outside 14d window
    const plantings = [
        { id: 'pl-tom', bedId: 'bed-w', plantId: 'tomato', status: 'sown_indoors', datePlanted: '2026-03-05', quantity: 1, notes: '' },
    ];
    const r = computeAgenda({
        plantings, plantsById: PLANTS_BY_ID, beds: [BED_WEST],
        zone: '7a', lastFrostDate: LAST_FROST, today,
    });
    assert.equal(r.overdue.length + r.thisWeek.length + r.nextWeek.length, 0);
});

test('computeAgenda sorts within bucket by date asc, then plantingId asc', () => {
    const today = '2026-04-22';
    const plantings = [
        { id: 'pl-b', bedId: 'bed-w', plantId: 'tomato', status: 'sown_indoors', datePlanted: '2026-03-05', quantity: 1, notes: '' },
        { id: 'pl-a', bedId: 'bed-w', plantId: 'tomato', status: 'sown_indoors', datePlanted: '2026-03-05', quantity: 1, notes: '' },
    ];
    const r = computeAgenda({
        plantings, plantsById: PLANTS_BY_ID, beds: [BED_WEST],
        zone: '7a', lastFrostDate: LAST_FROST, today,
    });
    assert.equal(r.thisWeek.length, 2);
    assert.equal(r.thisWeek[0].plantingId, 'pl-a');
    assert.equal(r.thisWeek[1].plantingId, 'pl-b');
});

test('computeAgenda handles missing bed gracefully ("(no bed)")', () => {
    const today = '2026-04-22';
    const plantings = [
        { id: 'pl-tom', bedId: 'bed-ghost', plantId: 'tomato', status: 'sown_indoors', datePlanted: '2026-03-05', quantity: 1, notes: '' },
    ];
    const r = computeAgenda({
        plantings, plantsById: PLANTS_BY_ID, beds: [BED_WEST],
        zone: '7a', lastFrostDate: LAST_FROST, today,
    });
    assert.equal(r.thisWeek[0].bedName, '(no bed)');
});

test('computeAgenda skips plantings whose plant cannot be resolved', () => {
    const today = '2026-04-22';
    const plantings = [
        { id: 'pl-ghost', bedId: 'bed-w', plantId: 'ghost-plant', status: 'planned', datePlanted: null, quantity: 1, notes: '' },
    ];
    const r = computeAgenda({
        plantings, plantsById: PLANTS_BY_ID, beds: [BED_WEST],
        zone: '7a', lastFrostDate: LAST_FROST, today,
    });
    assert.equal(r.overdue.length + r.thisWeek.length + r.nextWeek.length, 0);
});

test('AGENDA_WINDOW_DAYS and AGENDA_OVERDUE_GRACE_DAYS exported', () => {
    assert.equal(AGENDA_WINDOW_DAYS, 14);
    assert.equal(AGENDA_OVERDUE_GRACE_DAYS, 7);
});
```

### Step 2: Run; verify failures

```bash
npm test -- --test-name-pattern='computeAgenda|AGENDA_'
```
Expected: 9 failures.

### Step 3: Implement `computeAgenda`

Append to `src/features/agenda/agenda.js`:

```js
export function computeAgenda({
    plantings,
    plantsById,
    beds,
    zone,
    lastFrostDate,
    today = isoToday(),
    windowDays = AGENDA_WINDOW_DAYS,
}) {
    const bedsById = {};
    for (const b of beds || []) bedsById[b.id] = b;
    const year = parseInt(today.slice(0, 4), 10);

    const tasks = [];
    for (const planting of plantings || []) {
        const plant = plantsById[planting.plantId];
        if (!plant) continue;
        const t = computeTaskForPlanting({ planting, plant, lastFrostDate, zone, year });
        if (!t) continue;
        tasks.push({
            id: `task-${planting.id}-${t.action}`,
            date: t.date,
            action: t.action,
            nextStatus: t.nextStatus,
            reason: t.reason,
            plantingId: planting.id,
            plantName: plant.name,
            bedName: bedsById[planting.bedId]?.name ?? '(no bed)',
        });
    }

    const overdue = [];
    const thisWeek = [];
    const nextWeek = [];
    for (const t of tasks) {
        const delta = daysBetween(today, t.date);
        if (delta < -AGENDA_OVERDUE_GRACE_DAYS) continue;
        if (delta > windowDays) continue;
        if (delta < 0) overdue.push(t);
        else if (delta <= 6) thisWeek.push(t);
        else nextWeek.push(t);
    }

    const byDateThenId = (a, b) => a.date.localeCompare(b.date) || a.plantingId.localeCompare(b.plantingId);
    overdue.sort(byDateThenId);
    thisWeek.sort(byDateThenId);
    nextWeek.sort(byDateThenId);

    return { overdue, thisWeek, nextWeek };
}
```

### Step 4: Run all tests

```bash
npm test
```
Expected: every test green.

### Step 5: Commit

```bash
git add src/features/agenda/agenda.js tests/agenda.test.js
git commit -m "WB-ARCH-0003: agenda.js computeAgenda — windowing, bucketing, deterministic sort + tests"
```

---

## Task 4: AgendaView — sections + mark-done

**Files:**
- Modify: `src/features/agenda/AgendaView.jsx`
- Modify: `src/components/AlmanacShell.jsx`

### Step 1: Rewrite `AgendaView.jsx`

```jsx
import React from 'react';
import { CalendarDays, CheckCircle2 } from 'lucide-react';
import { computeAgenda, isoToday } from './agenda.js';
import { getPlantsById } from '../catalog/catalog.js';
import { actions } from '../plan/planReducer.js';

const DATE_FMT = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

function formatDate(iso) {
    const [y, m, d] = iso.split('-').map((s) => parseInt(s, 10));
    return DATE_FMT.format(new Date(y, m - 1, d));
}

const BUCKET_STYLES = {
    overdue:  { label: 'Overdue',   pill: 'bg-amber-100 text-amber-800' },
    thisWeek: { label: 'This week', pill: 'bg-green-100 text-green-800' },
    nextWeek: { label: 'Next week', pill: 'bg-gray-100 text-gray-700' },
};

export default function AgendaView({ plan, dispatch, onSwitchView }) {
    const plantsById = getPlantsById(plan);
    const { garden, plantings, beds } = plan;

    if (plantings.length === 0) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-center">
                <CalendarDays size={48} className="text-green-700 mb-4" />
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Agenda is empty</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Add a bed and at least one planting so we can compute what to do next.
                </p>
                {onSwitchView && (
                    <button onClick={() => onSwitchView('beds')}
                        className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800">
                        Go to Beds
                    </button>
                )}
            </div>
        );
    }

    const today = isoToday();
    const { overdue, thisWeek, nextWeek } = computeAgenda({
        plantings, plantsById, beds,
        zone: garden.zone, lastFrostDate: garden.lastFrostDate, today,
    });

    const total = overdue.length + thisWeek.length + nextWeek.length;

    if (total === 0) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-center">
                <CalendarDays size={48} className="text-green-700 mb-4" />
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Nothing on the agenda this fortnight</h2>
                <p className="text-sm text-gray-600">
                    Plantings will appear here as their dates approach.
                </p>
            </div>
        );
    }

    function handleMarkDone(task) {
        dispatch(actions.markTaskDone({
            plantingId: task.plantingId,
            nextStatus: task.nextStatus,
            date: today,
        }));
    }

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Agenda</h2>
            {[
                ['overdue', overdue],
                ['thisWeek', thisWeek],
                ['nextWeek', nextWeek],
            ].map(([key, tasks]) => tasks.length === 0 ? null : (
                <section key={key}>
                    <header className="mb-2 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${BUCKET_STYLES[key].pill}`}>
                            {BUCKET_STYLES[key].label}
                        </span>
                        <span className="text-xs text-gray-500">{tasks.length} task{tasks.length === 1 ? '' : 's'}</span>
                    </header>
                    <ul className="space-y-2">
                        {tasks.map((task) => (
                            <TaskRow key={task.id} task={task} plantsById={plantsById} onMarkDone={handleMarkDone} />
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}

function TaskRow({ task, plantsById, onMarkDone }) {
    const icon = plantsById[task.plantingId.split('-')[0]]?.icon; // fallback; the real lookup is via planting → plant
    // Note: we don't have direct access to plantId here, so look it up via plantName via plantsById entries
    const plant = Object.values(plantsById).find((p) => p.name === task.plantName);
    const displayIcon = plant?.icon ?? icon ?? '🌱';

    return (
        <li className="border rounded p-3 bg-white flex items-start gap-3">
            <div className="text-2xl leading-none mt-0.5">{displayIcon}</div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">{task.plantName} — {task.bedName}</div>
                <div className="text-xs text-gray-600 italic">{task.reason}</div>
                <div className="text-xs text-gray-500 mt-0.5">{formatDate(task.date)}</div>
            </div>
            <button onClick={() => onMarkDone(task)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-green-700 text-green-700 rounded hover:bg-green-50">
                <CheckCircle2 size={14} /> Mark done
            </button>
        </li>
    );
}
```

**Note (carry into implementation):** the icon lookup in `TaskRow` is awkward because the task carries `plantingId` and `plantName` but not `plantId`. Two cleaner options — pick the simpler at implementation time: (a) extend the Task shape with `plantId` in `computeAgenda` (one extra field, trivial), or (b) build a name→plant map in the view. Prefer (a). Adjust `agenda.js` and the spec's §4.1 Task shape note if (a) is taken; update tests in Task 3 accordingly (add a `plantId` field assertion to the "computeAgenda returns three buckets" test).

### Step 2: Update `AlmanacShell.jsx` to pass `onSwitchView`

Find the line:
```jsx
{view === 'agenda' && <AgendaView plan={state.plan} dispatch={dispatch} />}
```
Replace with:
```jsx
{view === 'agenda' && <AgendaView plan={state.plan} dispatch={dispatch} onSwitchView={setView} />}
```

### Step 3: Verify dev build compiles

```bash
npm run build
```
Expected: bundle ≤ 300 kB JS / ≤ 100 kB gzipped per Plan 2 spec §9.

### Step 4: Commit

```bash
git add src/features/agenda/AgendaView.jsx src/components/AlmanacShell.jsx
# also stage agenda.js + agenda.test.js if Task shape was extended
git commit -m "WB-ARCH-0003: AgendaView with overdue/this-week/next-week sections + mark-done"
```

---

## Task 5: BedsView next-task wiring

**Files:**
- Modify: `src/features/beds/BedsView.jsx`

### Step 1: Add the `computeAgenda` call + per-bed indexing

At the top of `BedsView`, after `const plantsById = getPlantsById(plan);`, insert:

```jsx
import { computeAgenda } from '../agenda/agenda.js';

// inside the component, after plantsById:
const { overdue, thisWeek, nextWeek } = computeAgenda({
    plantings: plan.plantings,
    plantsById,
    beds: plan.beds,
    zone: plan.garden.zone,
    lastFrostDate: plan.garden.lastFrostDate,
});
const allTasks = [...overdue, ...thisWeek, ...nextWeek];
// allTasks already sorted by date within each bucket; concat preserves overdue-first ordering
const nextTaskByBed = {};
for (const t of allTasks) {
    const planting = plan.plantings.find((p) => p.id === t.plantingId);
    if (!planting) continue;
    if (!nextTaskByBed[planting.bedId]) nextTaskByBed[planting.bedId] = t;
}
```

### Step 2: Render the line under the planting summary on each card

In the card JSX (`<button key={bed.id} ...>`), after the planting-summary `<div>`, add:

```jsx
<div className="text-xs text-gray-500 mt-1">
    {nextTaskByBed[bed.id]
        ? `Next: ${formatActionShort(nextTaskByBed[bed.id].action)} ${nextTaskByBed[bed.id].plantName} — ${formatDateShort(nextTaskByBed[bed.id].date)}`
        : 'Next: (nothing scheduled)'}
</div>
```

### Step 3: Add the two formatters at file top

```jsx
const ACTION_LABELS = {
    start_indoors: 'Start indoors',
    direct_sow: 'Direct-sow',
    transplant: 'Transplant',
    harvest: 'Harvest',
};
function formatActionShort(action) { return ACTION_LABELS[action] ?? action; }

const SHORT_DATE_FMT = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
function formatDateShort(iso) {
    const [y, m, d] = iso.split('-').map((s) => parseInt(s, 10));
    return SHORT_DATE_FMT.format(new Date(y, m - 1, d));
}
```

### Step 4: Verify build + lint

```bash
npm run build && npm run lint
```

### Step 5: Commit

```bash
git add src/features/beds/BedsView.jsx
git commit -m "WB-ARCH-0003: BedsView next-task line per card driven by computeAgenda"
```

---

## Task 6: Verification, docs, push

**Files:**
- Modify: `docs/work-index.md`
- Modify: `docs/session-log.md`

### Step 1: Run the full test + lint + build trifecta

```bash
npm test 2>&1 | tail -30
npm run lint 2>&1 | tail -20
npm run build 2>&1 | tail -20
```

Expected:
- node:test reports pass on all files
- ESLint clean
- Bundle ≤ 300 kB JS / ≤ 100 kB gzipped

### Step 2: Update `docs/work-index.md`

Bump the WB-ARCH-0003 row's `Updated` column to `2026-05-29 (Plan 3 shipped)`. Status remains IN_PROGRESS until Plan 1 follow-ups are reviewed (or move to DONE if all foundation goals met — discuss with user on return).

### Step 3: Append Session 11 to `docs/session-log.md`

Entry includes:
- Tasks T1–T5 with commit SHAs
- Verification evidence (test/lint/build output)
- Next action: user smoke test on return; Plan 1 success criteria audit
- Open items: none (Plan 3 fully shipped)

### Step 4: Commit docs

```bash
git add docs/work-index.md docs/session-log.md
git commit -m "WB-ARCH-0003: work-index + session log — Plan 3 shipped"
```

### Step 5: Bundle with the budget-revision branch and push

Current branch is `wb-arch-0003-bundle-budget-revision`. The first commit on it is `199f298` (budget revision). All Plan 3 commits land on the same branch. Push and open a PR:

```bash
git push -u origin wb-arch-0003-bundle-budget-revision
gh pr create --title "WB-ARCH-0003: Plan 3 (Agenda) + budget revision" --body "$(cat <<'EOF'
## Summary
- Plan 3 (Agenda) shipped end-to-end: pure `agenda.js` engine with full `node:test` coverage; `AgendaView` with overdue / this-week / next-week sections and mark-done dispatch; per-bed next-task line on bed cards
- Plan 2 spec §9 bundle budget revised to 300 kB JS / 100 kB gzipped (was 213 kB), with rationale documented inline

## Test plan
- [ ] `npm test` green
- [ ] `npm run lint` clean
- [ ] `npm run build` under budget
- [ ] Manual smoke: agenda renders three buckets correctly; mark-done advances status; bed cards show next-task line

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review

- **Spec coverage.** Every section of the Plan 3 spec maps to a task: §4 (agenda.js) → T1–T3; §5 (AgendaView) → T4; §6 (BedsView next-task) → T5; §10 verification → T6.
- **Placeholder scan.** No "TBD" anywhere. The one acknowledged design choice (Task shape `plantId` field) is called out inline in T4 with two concrete options and a preferred answer.
- **Type consistency.** `nextStatus` is used identically in agenda.js (`'sown_indoors'`, `'direct_sown'`, `'transplanted'`, `'harvested'`) and in MARK_TASK_DONE's payload (the reducer already accepts this shape — confirmed by reading `planReducer.js`). Date format is `YYYY-MM-DD` throughout.
