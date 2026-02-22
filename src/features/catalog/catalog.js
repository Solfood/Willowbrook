import { PLANT_DATABASE } from './plantDatabase';

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

export function getPlantById(id) {
    return PLANT_BY_ID[id] || null;
}

export function getPlantSpacingInches(id) {
    return getPlantById(id)?.spacingInches ?? 12;
}

export function getPlantingWindow(id) {
    return getPlantById(id)?.plantingWindow ?? null;
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
