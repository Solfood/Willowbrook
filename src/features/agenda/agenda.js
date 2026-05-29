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
