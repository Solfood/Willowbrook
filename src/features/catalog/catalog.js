import { PLANT_DATABASE } from './plantDatabase.js';

export const PLANT_CATEGORIES = PLANT_DATABASE.reduce((acc, plant) => {
    const next = acc;
    if (!next[plant.category]) next[plant.category] = [];
    next[plant.category].push(plant);
    return next;
}, {});

export const STRUCTURES = [
    { id: 'raised-bed', name: 'Raised Bed', type: 'structure', width: 4, length: 4, subType: 'raised-bed' },
    { id: 'raised-bed-rect', name: 'Raised Bed (Long)', type: 'structure', width: 2, length: 8, subType: 'raised-bed' },
    { id: 'raised-bed-round', name: 'Round Raised Bed', type: 'structure', width: 4, length: 4, subType: 'raised-bed-round' },
    { id: 'garden-plot', name: 'Garden Plot', type: 'structure', width: 10, length: 10, subType: 'garden-plot' },
    { id: 'garden-plot-small', name: 'Small Plot', type: 'structure', width: 4, length: 8, subType: 'garden-plot' },
];

const PLANT_BY_ID = PLANT_DATABASE.reduce((acc, plant) => {
    acc[plant.id] = plant;
    return acc;
}, {});

export function validatePlantNeighborIds() {
    const unknown = [];
    for (const plant of PLANT_DATABASE) {
        for (const id of (plant.goodNeighbors || [])) {
            if (!PLANT_BY_ID[id]) unknown.push({ plantId: plant.id, unknownId: id });
        }
        for (const id of (plant.avoidNeighbors || [])) {
            if (!PLANT_BY_ID[id]) unknown.push({ plantId: plant.id, unknownId: id });
        }
    }
    return unknown;
}

if (import.meta.env?.DEV) {
    for (const { plantId, unknownId } of validatePlantNeighborIds()) {
        console.error(`[catalog] Unknown neighbor ID "${unknownId}" on plant "${plantId}"`);
    }
}

export function getPlantById(id) {
    return PLANT_BY_ID[id] || null;
}

export function getPlantSpacingInches(id) {
    return getPlantById(id)?.spacingInches ?? 12;
}

function clampMonth(month) {
    return Math.max(0, Math.min(11, month));
}

// Month shift relative to zone 7a baseline. Colder zones plant later (+), warmer earlier (−).
const ZONE_MONTH_SHIFT = {
    '1a':  3, '1b':  3,
    '2a':  3, '2b':  2,
    '3a':  2, '3b':  2,
    '4a':  2, '4b':  1,
    '5a':  1, '5b':  1,
    '6a':  1, '6b':  0,
    '7a':  0, '7b':  0,
    '8a':  0, '8b': -1,
    '9a': -1, '9b': -1,
    '10a': -2, '10b': -2,
    '11a': -2, '11b': -3,
    '12a': -3, '12b': -3,
    '13a': -3, '13b': -3,
};

function getZoneMonthShift(zone) {
    const key = String(zone || '').trim().toLowerCase();
    return ZONE_MONTH_SHIFT[key] ?? 0;
}

export function getPlantingWindow(id, zone = '7a') {
    const base = getPlantById(id)?.plantingWindow ?? null;
    if (!base) return null;
    const monthShift = getZoneMonthShift(zone);
    return {
        start: clampMonth(base.start + monthShift),
        end: clampMonth(base.end + monthShift),
    };
}

export function getPlantCompanions(id) {
    const plant = getPlantById(id);
    return {
        good: plant?.goodNeighbors || [],
        avoid: plant?.avoidNeighbors || [],
    };
}

export function getPlantRelationship(basePlantId, neighborPlantId) {
    if (!basePlantId || !neighborPlantId) return 'neutral';
    if (basePlantId === neighborPlantId) return 'neutral';
    const plant = getPlantById(basePlantId);
    if (!plant) return 'neutral';
    if (plant.avoidNeighbors.includes(neighborPlantId)) return 'avoid';
    if (plant.goodNeighbors.includes(neighborPlantId)) return 'good';
    return 'neutral';
}

export const getPlantImage = (id) => {
    const foundPlant = getPlantById(id);
    if (foundPlant) {
        return `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${foundPlant.icon}</text></svg>`;
    }
    return '';
};
