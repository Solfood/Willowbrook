export function filterPlants(plants, { search = '', category = null } = {}) {
    const needle = search.trim().toLowerCase();
    return plants.filter((p) => {
        if (category === 'yours') {
            if (!p.isUserAdded) return false;
        } else if (category) {
            if (p.category !== category) return false;
        }
        if (!needle) return true;
        const hay = `${p.name ?? ''} ${p.notes ?? ''}`.toLowerCase();
        return hay.includes(needle);
    });
}

export function deriveCategoryChips(plants) {
    const set = new Set();
    let hasUserAdded = false;
    for (const p of plants) {
        if (p.category) set.add(p.category);
        if (p.isUserAdded) hasUserAdded = true;
    }
    const chips = Array.from(set).sort();
    if (hasUserAdded) chips.push('yours');
    return chips;
}
