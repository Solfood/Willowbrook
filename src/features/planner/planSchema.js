function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveFiniteNumber(value) {
    return isFiniteNumber(value) && value > 0;
}

function isValidZone(value) {
    if (typeof value !== 'string') return false;
    return /^[1-9][0-9]?[ab]$/i.test(value.trim());
}

function isValidId(value) {
    return (typeof value === 'number' && Number.isFinite(value)) || typeof value === 'string';
}

const CELL_SIZE = 15;
const CELLS_PER_FOOT = 2;

function normalizeItem(item, index) {
    if (!isPlainObject(item)) {
        return { ok: false, error: `Item at index ${index} must be an object.` };
    }

    if (!isValidId(item.id)) {
        return { ok: false, error: `Item at index ${index} is missing a valid id.` };
    }

    if (!isFiniteNumber(item.x) || !isFiniteNumber(item.y)) {
        return { ok: false, error: `Item at index ${index} must include numeric x and y coordinates.` };
    }

    if (item.type !== 'plant' && item.type !== 'structure') {
        return { ok: false, error: `Item at index ${index} must have type "plant" or "structure".` };
    }

    if (typeof item.name !== 'string' || item.name.trim().length === 0) {
        return { ok: false, error: `Item at index ${index} must include a name.` };
    }

    if (item.type === 'structure') {
        if (!isFiniteNumber(item.width) || item.width <= 0) {
            return { ok: false, error: `Structure at index ${index} must have a positive numeric width.` };
        }
        if (!isFiniteNumber(item.length) || item.length <= 0) {
            return { ok: false, error: `Structure at index ${index} must have a positive numeric length.` };
        }
    }

    if (item.itemId !== undefined && typeof item.itemId !== 'string') {
        return { ok: false, error: `Item at index ${index} has invalid itemId.` };
    }

    const normalized = {
        id: item.id,
        x: item.x,
        y: item.y,
        type: item.type,
        name: item.name.trim(),
    };

    if (typeof item.itemId === 'string') {
        normalized.itemId = item.itemId;
    }

    if (item.type === 'structure') {
        normalized.width = item.width;
        normalized.length = item.length;
        if (typeof item.subType === 'string') normalized.subType = item.subType;
        if (typeof item.shape === 'string') normalized.shape = item.shape;
        if (typeof item.itemType === 'string') normalized.itemType = item.itemType;
    }

    return { ok: true, item: normalized };
}

export function sanitizeGardenItems(items) {
    if (!Array.isArray(items)) {
        return { ok: false, error: 'Plan items must be an array.' };
    }

    const normalizedItems = [];
    for (let i = 0; i < items.length; i += 1) {
        const normalized = normalizeItem(items[i], i);
        if (!normalized.ok) {
            return normalized;
        }
        normalizedItems.push(normalized.item);
    }

    return {
        ok: true,
        items: normalizedItems,
    };
}

export function clampPlanItemsToBounds(items, widthFeet, lengthFeet) {
    const sanitized = sanitizeGardenItems(items);
    if (!sanitized.ok) {
        return sanitized;
    }

    if (!isPositiveFiniteNumber(widthFeet) || !isPositiveFiniteNumber(lengthFeet)) {
        return { ok: false, error: 'Plan dimensions must be positive numbers.' };
    }

    const worldWidth = widthFeet * CELLS_PER_FOOT * CELL_SIZE;
    const worldHeight = lengthFeet * CELLS_PER_FOOT * CELL_SIZE;

    const clampedItems = sanitized.items.map((item) => {
        const itemWidth = item.type === 'structure' ? item.width * CELLS_PER_FOOT * CELL_SIZE : CELL_SIZE;
        const itemHeight = item.type === 'structure' ? item.length * CELLS_PER_FOOT * CELL_SIZE : CELL_SIZE;
        const maxX = Math.max(0, worldWidth - itemWidth);
        const maxY = Math.max(0, worldHeight - itemHeight);

        return {
            ...item,
            x: Math.min(maxX, Math.max(0, item.x)),
            y: Math.min(maxY, Math.max(0, item.y)),
        };
    });

    return {
        ok: true,
        items: clampedItems,
    };
}

export function parseGardenPlanText(jsonText) {
    let parsed;

    try {
        parsed = JSON.parse(jsonText);
    } catch {
        return {
            ok: false,
            error: 'Invalid JSON file.',
        };
    }

    if (!isPlainObject(parsed)) {
        return {
            ok: false,
            error: 'Plan file must contain a JSON object.',
        };
    }

    if (!Array.isArray(parsed.items)) {
        return {
            ok: false,
            error: 'Plan file is missing an items array.',
        };
    }

    if (!isPositiveFiniteNumber(parsed.width) || !isPositiveFiniteNumber(parsed.length)) {
        return {
            ok: false,
            error: 'Plan file must include positive numeric width and length values.',
        };
    }

    if (parsed.zone !== undefined && !isValidZone(parsed.zone)) {
        return {
            ok: false,
            error: 'Plan zone must be a USDA-style value like "7a" or "8b".',
        };
    }

    const clamped = clampPlanItemsToBounds(parsed.items, parsed.width, parsed.length);
    if (!clamped.ok) {
        return {
            ok: false,
            error: clamped.error,
        };
    }

    return {
        ok: true,
        plan: {
            schemaVersion: parsed.schemaVersion ?? 1,
            width: parsed.width,
            length: parsed.length,
            zone: parsed.zone ? parsed.zone.toLowerCase() : '7a',
            items: clamped.items,
        },
    };
}
