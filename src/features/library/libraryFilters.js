/**
 * Pure search + category-filter helpers for LibraryView.
 * All functions are side-effect-free and operate on the merged plant list
 * produced by getAllPlants(plan).
 */

export function getCategories(plants) {
    return [...new Set(plants.map((p) => p.category).filter(Boolean))].sort();
}

/**
 * Filter a merged plant list by an optional text query and/or category.
 * @param {Array} plants - merged plant list from getAllPlants(plan)
 * @param {{ query?: string, category?: string|null }} opts
 * @returns {Array} filtered subset (order preserved)
 */
export function filterPlants(plants, { query = '', category = null } = {}) {
    const q = query.trim().toLowerCase();
    return plants.filter((plant) => {
        if (category && plant.category !== category) return false;
        if (!q) return true;
        return (
            plant.name.toLowerCase().includes(q) ||
            plant.id.toLowerCase().includes(q) ||
            (plant.notes || '').toLowerCase().includes(q)
        );
    });
}
