import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    isoToday,
    addDays,
    daysBetween,
    computeTaskForPlanting,
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
