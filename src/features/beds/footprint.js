/**
 * Row-major packing algorithm for the bed footprint grid.
 *
 * Each grid cell represents 1 square foot. Larger plants (>12" spacing) skip
 * additional cells so the icon lands at the centre of the plant's real footprint.
 * Plants with spacing < 12" get 1 cell each (multiple fit per sq ft, but the
 * grid stays readable).
 *
 * @param {{ widthFt: number, lengthFt: number }} bed
 * @param {Array<{ plantId: string, quantity: number }>} plantings - plantings for this bed only
 * @param {Record<string, { icon?: string, spacingInches?: number, name: string }>} plantsById - from getPlantsById(plan)
 * @returns {{ grid: Array<Array<{icon:string,plantId:string}|null>>, rows:number, cols:number, overflow:boolean }}
 */
export function computeFootprint(bed, plantings, plantsById) {
    const cols = Math.max(1, Math.round(bed.widthFt || 4));
    const rows = Math.max(1, Math.round(bed.lengthFt || 8));
    const totalCells = rows * cols;

    const cells = new Array(totalCells).fill(null);
    let overflow = false;
    let cursor = 0;

    for (const planting of plantings) {
        if (overflow) break;
        const plant = plantsById[planting.plantId];
        const spacing = plant?.spacingInches ?? 12;
        const cellsPerPlant = Math.max(1, Math.round((spacing / 12) ** 2));
        const icon = plant?.icon ?? '🌿';
        const qty = Math.max(0, planting.quantity || 0);

        for (let i = 0; i < qty; i++) {
            if (cursor >= totalCells) { overflow = true; break; }
            cells[cursor] = { icon, plantId: planting.plantId };
            cursor += cellsPerPlant;
        }
    }

    const grid = [];
    for (let r = 0; r < rows; r++) {
        grid.push(cells.slice(r * cols, (r + 1) * cols));
    }

    return { grid, rows, cols, overflow };
}

/**
 * Derive a legend from the grid: unique plants present with their icon and name.
 * @param {Array<Array<{icon:string,plantId:string}|null>>} grid
 * @param {Record<string, { name: string }>} plantsById
 * @returns {Array<{ icon: string, name: string, plantId: string }>}
 */
export function buildLegend(grid, plantsById) {
    const seen = new Map();
    for (const row of grid) {
        for (const cell of row) {
            if (cell && !seen.has(cell.plantId)) {
                seen.set(cell.plantId, {
                    icon: cell.icon,
                    name: plantsById[cell.plantId]?.name ?? cell.plantId,
                    plantId: cell.plantId,
                });
            }
        }
    }
    return [...seen.values()];
}
