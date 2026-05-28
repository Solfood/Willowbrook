export const SCHEMA_VERSION = 2;

const PLANTING_STATUSES = new Set([
    'planned',
    'sown_indoors',
    'direct_sown',
    'transplanted',
    'harvested',
    'removed',
]);

export function createEmptyPlan({ name, zone, zip, lastFrostDate, firstFrostDate }) {
    return {
        schemaVersion: SCHEMA_VERSION,
        garden: {
            name: name || 'My Garden',
            zone,
            zip: zip || null,
            lastFrostDate,
            firstFrostDate,
        },
        beds: [],
        plantings: [],
        journal: [],
        customPlants: [],
    };
}

function isObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validatePlanFile(value) {
    if (!isObject(value)) {
        return { ok: false, error: 'Plan file must be a JSON object.' };
    }
    if (value.schemaVersion !== SCHEMA_VERSION) {
        if (value.schemaVersion === undefined || value.schemaVersion < SCHEMA_VERSION) {
            return {
                ok: false,
                error: 'This file is from an older version of Willowbrook. The app has been rewritten around beds and a weekly agenda; v1 layouts are no longer supported. Start a new plan to continue.',
            };
        }
        return { ok: false, error: `Unknown plan schema version ${value.schemaVersion}.` };
    }
    if (!isObject(value.garden)) return { ok: false, error: 'Missing garden block.' };
    if (typeof value.garden.zone !== 'string') return { ok: false, error: 'garden.zone must be a string.' };
    if (!Array.isArray(value.beds)) return { ok: false, error: 'beds must be an array.' };
    if (!Array.isArray(value.plantings)) return { ok: false, error: 'plantings must be an array.' };
    if (!Array.isArray(value.journal)) return { ok: false, error: 'journal must be an array.' };
    if (!Array.isArray(value.customPlants)) return { ok: false, error: 'customPlants must be an array.' };

    for (const planting of value.plantings) {
        if (!PLANTING_STATUSES.has(planting.status)) {
            return { ok: false, error: `Unknown planting status: ${planting.status}` };
        }
    }
    return { ok: true };
}

export const PLANTING_STATUS_VALUES = Array.from(PLANTING_STATUSES);
