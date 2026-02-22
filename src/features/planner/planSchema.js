function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveFiniteNumber(value) {
    return isFiniteNumber(value) && value > 0;
}

function isValidId(value) {
    return (typeof value === 'number' && Number.isFinite(value)) || typeof value === 'string';
}

function validateItem(item, index) {
    if (!isPlainObject(item)) {
        return `Item at index ${index} must be an object.`;
    }

    if (!isValidId(item.id)) {
        return `Item at index ${index} is missing a valid id.`;
    }

    if (!isFiniteNumber(item.x) || !isFiniteNumber(item.y)) {
        return `Item at index ${index} must include numeric x and y coordinates.`;
    }

    if (item.type !== 'plant' && item.type !== 'structure') {
        return `Item at index ${index} must have type "plant" or "structure".`;
    }

    if (typeof item.name !== 'string' || item.name.trim().length === 0) {
        return `Item at index ${index} must include a name.`;
    }

    if (item.type === 'structure') {
        if (!isFiniteNumber(item.width) || item.width <= 0) {
            return `Structure at index ${index} must have a positive numeric width.`;
        }
        if (!isFiniteNumber(item.length) || item.length <= 0) {
            return `Structure at index ${index} must have a positive numeric length.`;
        }
    }

    if (item.itemId !== undefined && typeof item.itemId !== 'string') {
        return `Item at index ${index} has invalid itemId.`;
    }

    return null;
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

    for (let i = 0; i < parsed.items.length; i += 1) {
        const error = validateItem(parsed.items[i], i);
        if (error) {
            return {
                ok: false,
                error,
            };
        }
    }

    return {
        ok: true,
        plan: {
            schemaVersion: parsed.schemaVersion ?? 1,
            width: parsed.width,
            length: parsed.length,
            items: parsed.items,
        },
    };
}
