import { useEffect } from 'react';
import { plannerActionTypes } from './planReducer.js';

const CELL_SIZE = 15;
const CELLS_PER_FOOT = 2;
const FOOT_PX = CELL_SIZE * CELLS_PER_FOOT;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function getItemPixelSize(item, overrides = {}) {
    const nextType = overrides.type || item.type;
    if (nextType === 'structure') {
        const widthFeet = overrides.width ?? item.width ?? 1;
        const lengthFeet = overrides.length ?? item.length ?? 1;
        return {
            w: widthFeet * CELLS_PER_FOOT * CELL_SIZE,
            h: lengthFeet * CELLS_PER_FOOT * CELL_SIZE,
        };
    }
    return { w: CELL_SIZE, h: CELL_SIZE };
}

export function createKeyDownHandler({
    selectedTool, selectedItemId, selectedPlacedItem,
    mode, snapPx, worldWidth, worldHeight,
    applyItemPatch, clearSelection, handleUndo, handleRedo, handleTrash,
    dispatch, setSelectedItemId,
}) {
    return (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) handleRedo();
            else handleUndo();
            return;
        }

        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            handleRedo();
            return;
        }

        if (e.key === 'Escape') {
            if (selectedTool && !selectedTool.isNew) {
                dispatch({ type: plannerActionTypes.RESET_TO_COMMITTED });
            }
            clearSelection();
            setSelectedItemId(null);
            return;
        }

        const isDeleteKey = e.key === 'Delete'
            || e.key === 'Backspace'
            || e.code === 'Delete'
            || e.code === 'Backspace';
        if (isDeleteKey && (selectedTool || selectedItemId)) {
            const target = e.target;
            if (target instanceof HTMLElement) {
                const tag = target.tagName.toLowerCase();
                if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
                    return;
                }
            }
            e.preventDefault();
            handleTrash();
            return;
        }

        if (!selectedPlacedItem || selectedTool || mode === 'pan') {
            return;
        }

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            if (selectedPlacedItem.type === 'structure') {
                return;
            }
            const target = e.target;
            if (target instanceof HTMLElement) {
                const tag = target.tagName.toLowerCase();
                if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
                    return;
                }
            }

            e.preventDefault();
            const stepPx = snapPx || FOOT_PX / 2;
            const { w, h } = getItemPixelSize(selectedPlacedItem);
            const maxX = Math.max(0, worldWidth - w);
            const maxY = Math.max(0, worldHeight - h);
            let nextX = selectedPlacedItem.x;
            let nextY = selectedPlacedItem.y;

            if (e.key === 'ArrowLeft') nextX -= stepPx;
            if (e.key === 'ArrowRight') nextX += stepPx;
            if (e.key === 'ArrowUp') nextY -= stepPx;
            if (e.key === 'ArrowDown') nextY += stepPx;

            applyItemPatch(selectedPlacedItem.id, {
                x: clamp(nextX, 0, maxX),
                y: clamp(nextY, 0, maxY),
            });
        }
    };
}

export function useKeyboardShortcuts({
    selectedTool, selectedItemId, selectedPlacedItem,
    mode, snapPx, worldWidth, worldHeight,
    applyItemPatch, clearSelection, handleUndo, handleRedo, handleTrash,
    dispatch, setSelectedItemId,
}) {
    useEffect(() => {
        const handler = createKeyDownHandler({
            selectedTool, selectedItemId, selectedPlacedItem,
            mode, snapPx, worldWidth, worldHeight,
            applyItemPatch, clearSelection, handleUndo, handleRedo, handleTrash,
            dispatch, setSelectedItemId,
        });
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [
        selectedTool, selectedItemId, selectedPlacedItem,
        mode, snapPx, worldWidth, worldHeight,
        applyItemPatch, clearSelection, handleUndo, handleRedo, handleTrash,
        dispatch, setSelectedItemId,
    ]);
}
