export const CELL_INCHES = 6;
export const EMPTY_CELL = '·';

function cellsPerPlantFor(plant) {
    const span = Math.max(1, Math.round((plant?.spacingInches ?? CELL_INCHES) / CELL_INCHES));
    return span * span;
}

export function computeFootprint({ bed, plantings, plantsById }) {
    const gridCols = Math.floor((bed.widthFt * 12) / CELL_INCHES);
    const gridRows = Math.floor((bed.lengthFt * 12) / CELL_INCHES);
    const totalCells = gridCols * gridRows;

    const cells = Array.from({ length: gridRows }, () => Array.from({ length: gridCols }, () => EMPTY_CELL));

    const enriched = plantings
        .map((p) => ({ planting: p, plant: plantsById[p.plantId] }))
        .filter((e) => e.plant);

    enriched.sort((a, b) => {
        const da = b.plant.spacingInches - a.plant.spacingInches;
        if (da !== 0) return da;
        return a.planting.plantId.localeCompare(b.planting.plantId);
    });

    const legend = [];
    const overflow = [];
    let cursor = 0;

    for (const { planting, plant } of enriched) {
        const cpp = cellsPerPlantFor(plant);
        const requested = Math.max(0, Number(planting.quantity) || 0);
        let placedPlants = 0;

        outer: while (placedPlants < requested) {
            for (let i = 0; i < cpp; i++) {
                if (cursor >= totalCells) break outer;
                const row = Math.floor(cursor / gridCols);
                const col = cursor % gridCols;
                cells[row][col] = plant.icon;
                cursor++;
            }
            placedPlants++;
        }

        legend.push({
            plantId: planting.plantId,
            name: plant.name,
            icon: plant.icon,
            requested,
            placed: placedPlants,
        });
        if (placedPlants < requested) {
            overflow.push({
                plantId: planting.plantId,
                name: plant.name,
                missing: requested - placedPlants,
            });
        }
    }

    return { gridCols, gridRows, cells, legend, overflow };
}
