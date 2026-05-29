import { getPlantingWindow } from '../catalog/catalog.js';

export const AGENDA_WINDOW_DAYS = 14;
export const AGENDA_OVERDUE_GRACE_DAYS = 7;

function pad2(n) {
    return n < 10 ? `0${n}` : `${n}`;
}

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
    const a = parseIsoLocal(isoA);
    a.setHours(12, 0, 0, 0);
    const b = parseIsoLocal(isoB);
    b.setHours(12, 0, 0, 0);
    return Math.round((b.getTime() - a.getTime()) / 86400000);
}

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
            return {
                date: addDays(lastFrostDate, -weeks * 7),
                action: 'start_indoors',
                nextStatus: 'sown_indoors',
                reason: REASONS.start_indoors(weeks),
            };
        }
        const window = getPlantingWindow(plant.id, zone);
        if (!window) return null;
        const month = window.start;
        return {
            date: `${year}-${pad2(month + 1)}-01`,
            action: 'direct_sow',
            nextStatus: 'direct_sown',
            reason: REASONS.direct_sow(),
        };
    }

    if (status === 'sown_indoors') {
        return {
            date: addDays(lastFrostDate, 7),
            action: 'transplant',
            nextStatus: 'transplanted',
            reason: REASONS.transplant(),
        };
    }

    if (status === 'transplanted' || status === 'direct_sown') {
        if (!planting.datePlanted) return null;
        const dtm = plant.daysToMaturity;
        if (typeof dtm !== 'number' || dtm <= 0) return null;
        return {
            date: addDays(planting.datePlanted, dtm),
            action: 'harvest',
            nextStatus: 'harvested',
            reason: REASONS.harvest(dtm),
        };
    }

    return null;
}
