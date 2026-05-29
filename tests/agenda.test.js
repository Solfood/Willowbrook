import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    isoToday,
    addDays,
    daysBetween,
    computeTaskForPlanting,
    computeAgenda,
    AGENDA_WINDOW_DAYS,
    AGENDA_OVERDUE_GRACE_DAYS,
} from '../src/features/agenda/agenda.js';

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

test('isoToday returns YYYY-MM-DD in local time', () => {
    const fixed = new Date(2026, 4, 29, 10, 0, 0);
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

test('daysBetween returns signed integer (B - A)', () => {
    assert.equal(daysBetween('2026-05-29', '2026-06-05'), 7);
    assert.equal(daysBetween('2026-06-05', '2026-05-29'), -7);
    assert.equal(daysBetween('2026-05-29', '2026-05-29'), 0);
});

test('planned + indoor-start -> start_indoors task at lastFrost - N weeks', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p1', plantId: 'tomato', status: 'planned', datePlanted: null },
        plant: TOMATO, lastFrostDate: LAST_FROST, zone: '7a', year: 2026,
    });
    assert.equal(task.action, 'start_indoors');
    assert.equal(task.nextStatus, 'sown_indoors');
    assert.equal(task.date, '2026-03-04');
    assert.match(task.reason, /6 weeks before last frost/);
});

test('planned + direct-sow -> direct_sow task at first day of zone-shifted window', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p2', plantId: 'carrot', status: 'planned', datePlanted: null },
        plant: CARROT, lastFrostDate: LAST_FROST, zone: '7a', year: 2026,
    });
    assert.equal(task.action, 'direct_sow');
    assert.equal(task.nextStatus, 'direct_sown');
    assert.equal(task.date, '2026-03-01');
});

test('direct-sow date shifts with colder zone', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p3', plantId: 'carrot', status: 'planned', datePlanted: null },
        plant: CARROT, lastFrostDate: LAST_FROST, zone: '5a', year: 2026,
    });
    assert.equal(task.date, '2026-04-01');
});

test('sown_indoors -> transplant task at lastFrost + 7', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p4', plantId: 'tomato', status: 'sown_indoors', datePlanted: '2026-03-05' },
        plant: TOMATO, lastFrostDate: LAST_FROST, zone: '7a', year: 2026,
    });
    assert.equal(task.action, 'transplant');
    assert.equal(task.nextStatus, 'transplanted');
    assert.equal(task.date, '2026-04-22');
});

test('transplanted + datePlanted -> harvest task at datePlanted + DTM', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p5', plantId: 'tomato', status: 'transplanted', datePlanted: '2026-04-22' },
        plant: TOMATO, lastFrostDate: LAST_FROST, zone: '7a', year: 2026,
    });
    assert.equal(task.action, 'harvest');
    assert.equal(task.nextStatus, 'harvested');
    assert.equal(task.date, '2026-07-06');
});

test('direct_sown + datePlanted -> harvest task at datePlanted + DTM', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p6', plantId: 'carrot', status: 'direct_sown', datePlanted: '2026-03-01' },
        plant: CARROT, lastFrostDate: LAST_FROST, zone: '7a', year: 2026,
    });
    assert.equal(task.action, 'harvest');
    assert.equal(task.date, '2026-05-10');
});

test('harvested -> no task (terminal state)', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p7', plantId: 'tomato', status: 'harvested', datePlanted: '2026-04-22' },
        plant: TOMATO, lastFrostDate: LAST_FROST, zone: '7a', year: 2026,
    });
    assert.equal(task, null);
});

test('removed -> no task (terminal state)', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p8', plantId: 'tomato', status: 'removed', datePlanted: null },
        plant: TOMATO, lastFrostDate: LAST_FROST, zone: '7a', year: 2026,
    });
    assert.equal(task, null);
});

test('transplanted but no datePlanted -> no task (insufficient data)', () => {
    const task = computeTaskForPlanting({
        planting: { id: 'p9', plantId: 'tomato', status: 'transplanted', datePlanted: null },
        plant: TOMATO, lastFrostDate: LAST_FROST, zone: '7a', year: 2026,
    });
    assert.equal(task, null);
});

const BED_WEST = { id: 'bed-w', name: 'Backyard West', widthFt: 4, lengthFt: 8 };
const BED_STRIP = { id: 'bed-s', name: 'Salad Strip', widthFt: 2, lengthFt: 6 };
const PLANTS_BY_ID = { tomato: TOMATO, carrot: CARROT };

test('computeAgenda returns three buckets; task carries plantId + bedName', () => {
    const today = '2026-04-22';
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
    assert.equal(r.thisWeek[0].plantId, 'tomato');
    assert.equal(r.thisWeek[0].bedName, 'Backyard West');
    assert.equal(r.thisWeek[0].id, 'task-pl-tom-transplant');
});

test('computeAgenda puts a task dated 3 days ago in overdue', () => {
    const today = '2026-04-25';
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
    const today = '2026-04-30';
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
    const today = '2026-04-14';
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
    const today = '2026-04-01';
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
