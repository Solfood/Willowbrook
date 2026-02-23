import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
    Grip,
    Hand,
    LocateFixed,
    Minus,
    Plus,
    Redo,
    Save,
    Undo,
    Upload,
    BookOpen,
    Sprout,
    Wrench,
} from 'lucide-react';
import Sidebar from './Sidebar';
import { createPlannerInitialState, plannerActionTypes, plannerReducer } from '../features/planner/planReducer';
import { parseGardenPlanText } from '../features/planner/planSchema';
import {
    getPlantById,
    getPlantCompanions,
    getPlantImage,
    getPlantingWindow,
    getPlantRelationship,
    getPlantSpacingInches,
} from '../features/catalog/catalog';

const CELL_SIZE = 15;
const CELLS_PER_FOOT = 2;
const FOOT_PX = CELL_SIZE * CELLS_PER_FOOT;
const MIN_SCALE = 0.35;
const MAX_SCALE = 3;
const INCHES_PER_FOOT = 12;

const DIRT_PATTERN = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%235D4037' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E")`;
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

function distancePx(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt((dx * dx) + (dy * dy));
}

function centerOfPlant(item) {
    return { x: item.x + (CELL_SIZE / 2), y: item.y + (CELL_SIZE / 2) };
}

function spacingPxFromPlantId(plantId) {
    return (getPlantSpacingInches(plantId) / INCHES_PER_FOOT) * FOOT_PX;
}

export default function GardenPlanner({ width, length, zone = '7a', initialItems = [], onNewGarden, onLoadGarden }) {
    const worldWidth = width * CELLS_PER_FOOT * CELL_SIZE;
    const worldHeight = length * CELLS_PER_FOOT * CELL_SIZE;

    const [plannerState, dispatch] = useReducer(plannerReducer, initialItems, createPlannerInitialState);
    const { items, history, currentHistoryIndex } = plannerState;

    const [selectedTool, setSelectedTool] = useState(null);
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [armedStructureMoveId, setArmedStructureMoveId] = useState(null);
    const [activeSection, setActiveSection] = useState('plan'); // plan | plant-list | parts-list | shopping | notes
    const [mode, setMode] = useState('pan'); // pan | place | move
    const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
    const [cursorWorld, setCursorWorld] = useState({ x: worldWidth / 2, y: worldHeight / 2 });
    const [rightTab, setRightTab] = useState('learn'); // learn | layers | timeline
    const [layers, setLayers] = useState({
        grid: true,
        structures: true,
        plants: true,
        guides: true,
    });
    const [snapFeet, setSnapFeet] = useState(0.5);
    const [timelineMonth, setTimelineMonth] = useState(new Date().getMonth());
    const [notesText, setNotesText] = useState(() => {
        if (typeof window === 'undefined') return '';
        return window.localStorage.getItem('willowbrook_notes') || '';
    });
    const [isDesktopReady, setIsDesktopReady] = useState(() => {
        if (typeof window === 'undefined') return true;
        return window.innerWidth >= 1100 && !window.matchMedia('(pointer: coarse)').matches;
    });

    const viewportRef = useRef(null);
    const mouseDragRef = useRef({
        active: false,
        moved: false,
        startX: 0,
        startY: 0,
        originX: 0,
        originY: 0,
    });

    const clearSelection = useCallback(() => {
        setSelectedTool(null);
        setArmedStructureMoveId(null);
    }, []);

    const commitItems = useCallback((nextItems) => {
        dispatch({ type: plannerActionTypes.COMMIT_ITEMS, payload: nextItems });
    }, []);

    const toWorld = useCallback((clientX, clientY, activeCamera = camera) => {
        if (!viewportRef.current) return { x: 0, y: 0 };
        const rect = viewportRef.current.getBoundingClientRect();
        return {
            x: (clientX - rect.left - activeCamera.x) / activeCamera.scale,
            y: (clientY - rect.top - activeCamera.y) / activeCamera.scale,
        };
    }, [camera]);

    const setCursorFromClient = useCallback((clientX, clientY) => {
        setCursorWorld(toWorld(clientX, clientY));
    }, [toWorld]);

    const fitToView = useCallback(() => {
        if (!viewportRef.current) return;
        const rect = viewportRef.current.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const scale = clamp(
            Math.min((rect.width - 48) / worldWidth, (rect.height - 48) / worldHeight),
            MIN_SCALE,
            MAX_SCALE
        );

        setCamera({
            scale,
            x: (rect.width - (worldWidth * scale)) / 2,
            y: (rect.height - (worldHeight * scale)) / 2,
        });
    }, [worldWidth, worldHeight]);

    const zoomAt = useCallback((nextScale, clientX, clientY) => {
        setCamera((prev) => {
            if (!viewportRef.current) return prev;
            const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
            const world = toWorld(clientX, clientY, prev);
            const rect = viewportRef.current.getBoundingClientRect();
            const lx = clientX - rect.left;
            const ly = clientY - rect.top;
            return {
                scale,
                x: lx - (world.x * scale),
                y: ly - (world.y * scale),
            };
        });
    }, [toWorld]);

    const zoomFromViewportCenter = useCallback((nextScale) => {
        if (!viewportRef.current) return;
        const rect = viewportRef.current.getBoundingClientRect();
        zoomAt(nextScale, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }, [zoomAt]);

    const pickUpItem = useCallback((item) => {
        dispatch({ type: plannerActionTypes.PICKUP_ITEM, payload: item.id });
        setSelectedItemId(item.id);
        setArmedStructureMoveId(null);
        setSelectedTool({
            ...item,
            itemId: item.itemId || item.id,
            isNew: false,
            id: item.id,
        });
        setMode('move');
    }, []);

    const toolPixelSize = useMemo(() => {
        if (!selectedTool) return { w: CELL_SIZE, h: CELL_SIZE };
        if (selectedTool.type === 'structure') {
            return {
                w: selectedTool.width * CELLS_PER_FOOT * CELL_SIZE,
                h: selectedTool.length * CELLS_PER_FOOT * CELL_SIZE,
            };
        }
        return { w: CELL_SIZE, h: CELL_SIZE };
    }, [selectedTool]);

    const snapPx = useMemo(() => {
        if (snapFeet === 0) return null;
        return snapFeet * FOOT_PX;
    }, [snapFeet]);

    const ghostPos = useMemo(() => {
        if (!selectedTool) return null;
        if (!snapPx) {
            return { x: cursorWorld.x - toolPixelSize.w / 2, y: cursorWorld.y - toolPixelSize.h / 2 };
        }
        return {
            x: Math.round((cursorWorld.x - toolPixelSize.w / 2) / snapPx) * snapPx,
            y: Math.round((cursorWorld.y - toolPixelSize.h / 2) / snapPx) * snapPx,
        };
    }, [selectedTool, cursorWorld, toolPixelSize, snapPx]);

    const plantItems = useMemo(
        () => items.filter((item) => item.type === 'plant'),
        [items]
    );

    const placementInsights = useMemo(() => {
        if (!selectedTool || selectedTool.type !== 'plant' || !ghostPos) {
            return null;
        }

        const basePlantId = selectedTool.itemId || selectedTool.id;
        const baseSpacingPx = spacingPxFromPlantId(basePlantId);
        const baseCenter = { x: ghostPos.x + (CELL_SIZE / 2), y: ghostPos.y + (CELL_SIZE / 2) };
        const neighbors = plantItems
            .map((neighbor) => {
                const neighborId = neighbor.itemId || neighbor.id;
                const neighborSpacingPx = spacingPxFromPlantId(neighborId);
                const distance = distancePx(baseCenter, centerOfPlant(neighbor));
                const required = Math.max(baseSpacingPx, neighborSpacingPx);
                return {
                    id: neighbor.id,
                    name: neighbor.name,
                    relation: getPlantRelationship(basePlantId, neighborId),
                    distancePx: distance,
                    requiredPx: required,
                    tooClose: distance < required,
                };
            })
            .sort((a, b) => a.distancePx - b.distancePx);

        const spacingViolations = neighbors.filter((neighbor) => neighbor.tooClose);
        const avoidNeighbors = neighbors.filter(
            (neighbor) => neighbor.relation === 'avoid' && neighbor.distancePx <= (3 * FOOT_PX)
        );
        const goodNeighbors = neighbors.filter(
            (neighbor) => neighbor.relation === 'good' && neighbor.distancePx <= (3 * FOOT_PX)
        );

        return {
            basePlantId,
            baseSpacingPx,
            spacingViolations,
            nearby: neighbors.slice(0, 4),
            status: spacingViolations.length > 0 || avoidNeighbors.length > 0
                ? 'warning'
                : goodNeighbors.length > 0
                    ? 'good'
                    : 'neutral',
        };
    }, [selectedTool, ghostPos, plantItems]);

    const placeSelectedAt = useCallback((worldPoint) => {
        if (!selectedTool) return false;

        const snappedX = snapPx
            ? Math.round((worldPoint.x - toolPixelSize.w / 2) / snapPx) * snapPx
            : worldPoint.x - toolPixelSize.w / 2;
        const snappedY = snapPx
            ? Math.round((worldPoint.y - toolPixelSize.h / 2) / snapPx) * snapPx
            : worldPoint.y - toolPixelSize.h / 2;

        if (snappedX < 0 || snappedY < 0 || snappedX + toolPixelSize.w > worldWidth || snappedY + toolPixelSize.h > worldHeight) {
            return false;
        }

        const nextItem = {
            ...selectedTool,
            x: snappedX,
            y: snappedY,
            id: selectedTool.isNew ? Date.now() : selectedTool.id,
        };

        commitItems([...items, nextItem]);

        if (selectedTool.isNew && selectedTool.type === 'plant') {
            setSelectedTool((prev) => (prev ? { ...prev, id: Date.now() } : prev));
        } else {
            clearSelection();
        }
        return true;
    }, [selectedTool, toolPixelSize, worldWidth, worldHeight, commitItems, items, clearSelection, snapPx]);

    const handleSidebarSelect = useCallback((item) => {
        setSelectedItemId(null);
        setSelectedTool({
            ...item,
            itemId: item.id,
            isNew: true,
            id: Date.now(),
        });
        setMode('place');
    }, []);

    const handleUndo = useCallback(() => {
        if (currentHistoryIndex <= 0) return;
        dispatch({ type: plannerActionTypes.UNDO });
        clearSelection();
        setSelectedItemId(null);
    }, [currentHistoryIndex, clearSelection]);

    const handleRedo = useCallback(() => {
        if (currentHistoryIndex >= history.length - 1) return;
        dispatch({ type: plannerActionTypes.REDO });
        clearSelection();
        setSelectedItemId(null);
    }, [currentHistoryIndex, history.length, clearSelection]);

    const handleTrash = useCallback(() => {
        if (selectedTool && !selectedTool.isNew) {
            commitItems(items);
            setSelectedItemId(null);
            clearSelection();
            return;
        }
        if (selectedItemId) {
            commitItems(items.filter((item) => item.id !== selectedItemId));
            setSelectedItemId(null);
            return;
        }
        clearSelection();
    }, [selectedTool, selectedItemId, commitItems, items, clearSelection]);

    const selectedPlacedItem = useMemo(
        () => items.find((item) => item.id === selectedItemId) || null,
        [items, selectedItemId]
    );

    const focusedPlantContext = useMemo(() => {
        const activeFromTool = selectedTool?.type === 'plant' ? selectedTool : null;
        const activeFromSelection = selectedPlacedItem?.type === 'plant' ? selectedPlacedItem : null;
        const activePlant = activeFromTool || activeFromSelection;
        if (!activePlant) return null;

        const plantId = activePlant.itemId || activePlant.id;
        const plantMeta = getPlantById(plantId);
        if (!plantMeta) return null;
        const companions = getPlantCompanions(plantId);

        const center = activeFromTool && ghostPos
            ? { x: ghostPos.x + (CELL_SIZE / 2), y: ghostPos.y + (CELL_SIZE / 2) }
            : centerOfPlant(activePlant);

        const spacingPx = spacingPxFromPlantId(plantId);
        const nearby = plantItems
            .filter((item) => !activeFromSelection || item.id !== activeFromSelection.id)
            .map((item) => {
                const neighborId = item.itemId || item.id;
                const neighborSpacingPx = spacingPxFromPlantId(neighborId);
                const distance = distancePx(center, centerOfPlant(item));
                return {
                    id: item.id,
                    name: item.name,
                    relation: getPlantRelationship(plantId, neighborId),
                    distanceInches: Math.round((distance / FOOT_PX) * INCHES_PER_FOOT),
                    tooClose: distance < Math.max(spacingPx, neighborSpacingPx),
                };
            })
            .sort((a, b) => a.distanceInches - b.distanceInches)
            .slice(0, 4);

        return {
            id: plantId,
            name: plantMeta.name,
            spacingInches: plantMeta.spacingInches,
            goodNeighbors: companions.good,
            avoidNeighbors: companions.avoid,
            notes: plantMeta.notes,
            sourceRefs: plantMeta.sourceRefs || [],
            lastReviewed: plantMeta.lastReviewed,
            regionScope: plantMeta.regionScope || 'US-general',
            evidence: plantMeta.evidence || { spacing: 'low', neighbors: 'low', window: 'low' },
            nearby,
        };
    }, [selectedTool, selectedPlacedItem, ghostPos, plantItems]);

    const applyItemPatch = useCallback((itemId, patch) => {
        const nextItems = items.map((item) => {
            if (item.id !== itemId) return item;
            return { ...item, ...patch };
        });
        commitItems(nextItems);
    }, [items, commitItems]);

    const handleEnterMoveMode = useCallback(() => {
        setMode('move');
        setArmedStructureMoveId(null);
        // If a brand-new placement tool is active, clear it so move mode does not place items.
        if (selectedTool?.isNew) {
            clearSelection();
        }
    }, [selectedTool, clearSelection]);

    const plantSummary = useMemo(() => {
        const byName = {};
        items
            .filter((item) => item.type === 'plant')
            .forEach((item) => {
                const key = item.name;
                if (!byName[key]) byName[key] = { id: item.itemId || item.id, name: item.name, count: 0 };
                byName[key].count += 1;
            });
        return Object.values(byName).sort((a, b) => a.name.localeCompare(b.name));
    }, [items]);

    const partsSummary = useMemo(() => {
        const byName = {};
        items
            .filter((item) => item.type === 'structure')
            .forEach((item) => {
                const key = `${item.name}:${item.width}x${item.length}`;
                if (!byName[key]) byName[key] = { name: item.name, width: item.width, length: item.length, count: 0 };
                byName[key].count += 1;
            });
        return Object.values(byName).sort((a, b) => a.name.localeCompare(b.name));
    }, [items]);

    const shoppingSummary = useMemo(() => {
        const list = [
            ...plantSummary.map((item) => ({ label: `${item.name} seed/starts`, qty: item.count })),
            ...partsSummary.map((item) => ({ label: `${item.name} (${item.width}'x${item.length}')`, qty: item.count })),
        ];
        return list.sort((a, b) => a.label.localeCompare(b.label));
    }, [plantSummary, partsSummary]);

    const timelineRows = useMemo(() => {
        return plantSummary.map((item) => {
            const window = getPlantingWindow(item.id, zone);
            const inWindow = window ? timelineMonth >= window.start && timelineMonth <= window.end : false;
            return {
                ...item,
                window,
                inWindow,
            };
        });
    }, [plantSummary, timelineMonth, zone]);

    const handleSave = useCallback(async () => {
        const data = { schemaVersion: 1, width, length, zone, items };
        const jsonString = JSON.stringify(data, null, 2);

        try {
            if (typeof window.showSaveFilePicker === 'function') {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'willowbrook-garden.json',
                    types: [{
                        description: 'JSON/Garden Plan',
                        accept: { 'application/json': ['.json'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(jsonString);
                await writable.close();
                return;
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('Save picker failed, using fallback:', err);
        }

        const filename = prompt('Enter a name for your garden plan:', 'willowbrook-garden');
        if (!filename) return;

        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }, [width, length, zone, items]);

    const handleLoad = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = typeof event.target?.result === 'string' ? event.target.result : '';
            const result = parseGardenPlanText(content);

            if (!result.ok) {
                alert(`Failed to load: ${result.error}`);
                return;
            }

            if (result.plan.width !== width || result.plan.length !== length || result.plan.zone !== zone) {
                if (typeof onLoadGarden === 'function') {
                    onLoadGarden({
                        width: result.plan.width,
                        length: result.plan.length,
                        zone: result.plan.zone,
                        items: result.plan.items,
                    });
                    return;
                }
                alert('Loaded plan settings do not match current garden.');
                return;
            }

            dispatch({ type: plannerActionTypes.LOAD_ITEMS, payload: result.plan.items });
            clearSelection();
        };

        reader.readAsText(file);
        e.target.value = '';
    }, [width, length, zone, onLoadGarden, clearSelection]);

    useEffect(() => {
        const onKeyDown = (e) => {
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

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedTool, selectedItemId, selectedPlacedItem, mode, snapPx, worldWidth, worldHeight, applyItemPatch, clearSelection, handleUndo, handleRedo, handleTrash]);

    useEffect(() => {
        fitToView();
    }, [fitToView]);

    useEffect(() => {
        const onResize = () => {
            setIsDesktopReady(window.innerWidth >= 1100 && !window.matchMedia('(pointer: coarse)').matches);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        window.localStorage.setItem('willowbrook_notes', notesText);
    }, [notesText]);

    const onMouseDown = (e) => {
        if (e.button === 2) {
            // Right-click acts as deselect/cancel.
            clearSelection();
            setSelectedItemId(null);
            return;
        }
        if (e.button !== 0) return;
        setCursorFromClient(e.clientX, e.clientY);

        const shouldPan = mode === 'pan' || !selectedTool;
        if (shouldPan) {
            mouseDragRef.current = {
                active: true,
                moved: false,
                startX: e.clientX,
                startY: e.clientY,
                originX: camera.x,
                originY: camera.y,
            };
        }
    };

    const onMouseMove = (e) => {
        setCursorFromClient(e.clientX, e.clientY);

        const drag = mouseDragRef.current;
        if (!drag.active) return;

        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) drag.moved = true;

        setCamera((prev) => ({ ...prev, x: drag.originX + dx, y: drag.originY + dy }));
    };

    const onMouseUp = (e) => {
        if (e.button !== 0) return;
        const drag = mouseDragRef.current;
        const wasDrag = drag.active && drag.moved;
        mouseDragRef.current.active = false;

        setCursorFromClient(e.clientX, e.clientY);

        if (!wasDrag && mode !== 'pan' && selectedTool) {
            placeSelectedAt(toWorld(e.clientX, e.clientY));
            return;
        }

        if (!wasDrag && !selectedTool) {
            setSelectedItemId(null);
        }
    };

    const onMouseLeaveViewport = () => {
        // Stop active drag when leaving canvas, but do not clear selection or place items.
        mouseDragRef.current.active = false;
    };

    const onWheel = (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        zoomAt(camera.scale * factor, e.clientX, e.clientY);
    };

    const orderedItems = useMemo(() => {
        return [...items]
            .filter((item) => {
                if (item.type === 'structure' && !layers.structures) return false;
                if (item.type === 'plant' && !layers.plants) return false;
                return true;
            })
            .sort((a, b) => {
            if (a.type === b.type) return 0;
            return a.type === 'structure' ? -1 : 1;
        });
    }, [items, layers]);

    const rulerTopTicks = useMemo(() => {
        return Array.from({ length: width + 1 }, (_, i) => i);
    }, [width]);

    const rulerLeftTicks = useMemo(() => {
        return Array.from({ length: length + 1 }, (_, i) => i);
    }, [length]);

    if (!isDesktopReady) {
        return (
            <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
                <div className="max-w-lg bg-white border border-amber-200 rounded-xl shadow-sm p-6">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Desktop Required</h1>
                    <p className="text-sm text-gray-600 mb-4">
                        Willowbrook Planner is currently optimized for desktop editing. Please use a larger screen with a mouse/trackpad for the full experience.
                    </p>
                    <p className="text-sm text-gray-600">
                        Your plan files still work normally. Open this same URL on desktop to continue.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#f2f2f2]">
            <style>{`
                @media print {
                    @page { size: landscape; margin: 0.5cm; }
                    header, aside, .left-rail, .right-panel, .toolbar-row { display: none !important; }
                    main { box-shadow: none; margin: 0; padding: 0; overflow: visible; }
                }
            `}</style>

            <header className="bg-white border-b border-gray-300 print:hidden">
                <div className="h-12 px-3 flex items-center gap-3 text-sm">
                    <button onClick={() => setActiveSection('plan')} className={activeSection === 'plan' ? 'font-semibold text-gray-800' : 'text-gray-500 hover:text-gray-700'}>Plan</button>
                    <button onClick={() => setActiveSection('plant-list')} className={activeSection === 'plant-list' ? 'font-semibold text-gray-800' : 'text-gray-500 hover:text-gray-700'}>Plant List</button>
                    <button onClick={() => setActiveSection('parts-list')} className={activeSection === 'parts-list' ? 'font-semibold text-gray-800' : 'text-gray-500 hover:text-gray-700'}>Parts List</button>
                    <button onClick={() => setActiveSection('shopping')} className={activeSection === 'shopping' ? 'font-semibold text-gray-800' : 'text-gray-500 hover:text-gray-700'}>Shopping</button>
                    <button onClick={() => setActiveSection('notes')} className={activeSection === 'notes' ? 'font-semibold text-gray-800' : 'text-gray-500 hover:text-gray-700'}>Notes</button>
                    <div className="ml-auto flex items-center gap-2">
                        <button onClick={handleSave} className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 inline-flex items-center gap-1"><Save size={14} />Save</button>
                        <label className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 cursor-pointer inline-flex items-center gap-1">
                            <Upload size={14} />Load
                            <input type="file" onChange={handleLoad} accept=".json" className="hidden" />
                        </label>
                    </div>
                </div>

                <div className="toolbar-row h-12 px-3 border-t border-gray-200 flex items-center gap-2">
                    <button onClick={handleUndo} disabled={currentHistoryIndex <= 0} className="p-2 border rounded border-gray-300 disabled:opacity-30"><Undo size={16} /></button>
                    <button onClick={handleRedo} disabled={currentHistoryIndex >= history.length - 1} className="p-2 border rounded border-gray-300 disabled:opacity-30"><Redo size={16} /></button>
                    <span className="w-px h-6 bg-gray-300 mx-1" />
                    <button onClick={() => setMode('pan')} className={`px-3 py-1.5 text-sm rounded border ${mode === 'pan' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-gray-700 border-gray-300'}`}><Hand size={14} className="inline mr-1" />Pan</button>
                    <button onClick={() => setMode('place')} className={`px-3 py-1.5 text-sm rounded border ${mode === 'place' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}><Grip size={14} className="inline mr-1" />Place</button>
                    <button onClick={handleEnterMoveMode} className={`px-3 py-1.5 text-sm rounded border ${mode === 'move' ? 'bg-amber-700 text-white border-amber-700' : 'bg-white text-gray-700 border-gray-300'}`}>Move</button>
                    <span className="w-px h-6 bg-gray-300 mx-1" />
                    <label className="text-xs text-gray-600">Snap</label>
                    <select
                        value={snapFeet}
                        onChange={(e) => setSnapFeet(Number(e.target.value))}
                        className="px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                    >
                        <option value={0}>Off</option>
                        <option value={0.5}>0.5 ft</option>
                        <option value={1}>1 ft</option>
                    </select>
                    <span className="text-[11px] text-gray-500">Aligns placement and arrow-key nudges to this grid size.</span>
                    <span className="w-px h-6 bg-gray-300 mx-1" />
                    <button onClick={() => zoomFromViewportCenter(camera.scale * 0.9)} className="p-2 border rounded border-gray-300"><Minus size={16} /></button>
                    <span className="text-xs w-14 text-center text-gray-600">{Math.round(camera.scale * 100)}%</span>
                    <button onClick={() => zoomFromViewportCenter(camera.scale * 1.1)} className="p-2 border rounded border-gray-300"><Plus size={16} /></button>
                    <button onClick={fitToView} className="p-2 border rounded border-gray-300"><LocateFixed size={16} /></button>
                    <span className="ml-auto text-xs text-gray-600 px-3 py-1 rounded-full border border-gray-300 bg-gray-50">
                        {selectedTool ? (selectedTool.isNew ? 'Placing' : 'Moving') : `${width}ft x ${length}ft`}
                    </span>
                    <button onClick={onNewGarden} className="px-3 py-1.5 border border-red-300 rounded text-red-600 hover:bg-red-50">New</button>
                    <button onClick={() => window.print()} className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-100">Print</button>
                </div>
            </header>

            <div className="flex flex-1 min-h-0">
                <div className="left-rail w-12 bg-green-700 border-r border-green-900 text-white flex flex-col items-center py-3 gap-3 print:hidden">
                    <button
                        onClick={() => {
                            setActiveSection('plan');
                            setRightTab('learn');
                        }}
                        className={`p-2 rounded ${rightTab === 'learn' ? 'bg-green-800' : 'hover:bg-green-800'}`}
                        title="Learn"
                    >
                        <Sprout size={16} />
                    </button>
                    <button
                        onClick={() => {
                            setActiveSection('plan');
                            setRightTab('layers');
                        }}
                        className={`p-2 rounded ${rightTab === 'layers' ? 'bg-green-800' : 'hover:bg-green-800'}`}
                        title="Layers"
                    >
                        <Wrench size={16} />
                    </button>
                    <button
                        onClick={() => {
                            setActiveSection('plan');
                            setRightTab('timeline');
                        }}
                        className={`p-2 rounded ${rightTab === 'timeline' ? 'bg-green-800' : 'hover:bg-green-800'}`}
                        title="Timeline"
                    >
                        <BookOpen size={16} />
                    </button>
                </div>

                {activeSection === 'plan' ? (
                    <Sidebar onItemSelect={handleSidebarSelect} items={items} />
                ) : (
                    <aside className="w-[320px] bg-white border-r border-gray-200 shadow-sm flex flex-col print:hidden">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <h2 className="text-sm font-semibold text-gray-800">Overview</h2>
                            <p className="text-xs text-gray-500 mt-1">Project summaries by section.</p>
                        </div>
                        <div className="p-4 text-sm text-gray-700 space-y-2">
                            <div>Plants: <strong>{items.filter((item) => item.type === 'plant').length}</strong></div>
                            <div>Structures: <strong>{items.filter((item) => item.type === 'structure').length}</strong></div>
                            <div>Total items: <strong>{items.length}</strong></div>
                        </div>
                    </aside>
                )}

                <main className="flex-1 overflow-hidden bg-[#e8e8e8] p-4 flex relative border-r border-gray-300">
                    {activeSection !== 'plan' ? (
                        <div className="w-full h-full rounded border border-gray-300 bg-white p-4 overflow-auto">
                            {activeSection === 'plant-list' && (
                                <SimpleTable
                                    title="Plant List"
                                    columns={['Plant', 'Count']}
                                    rows={plantSummary.map((item) => [
                                        <span key={`${item.name}-label`} className="inline-flex items-center gap-2">
                                            <img src={getPlantImage(item.id)} alt="" className="w-5 h-5 object-contain" />
                                            {item.name}
                                        </span>,
                                        item.count,
                                    ])}
                                    emptyMessage="No plants in the current plan."
                                />
                            )}
                            {activeSection === 'parts-list' && (
                                <SimpleTable
                                    title="Parts List"
                                    columns={['Part', 'Size', 'Count']}
                                    rows={partsSummary.map((item) => [item.name, `${item.width}' x ${item.length}'`, item.count])}
                                    emptyMessage="No structures in the current plan."
                                />
                            )}
                            {activeSection === 'shopping' && (
                                <SimpleTable
                                    title="Shopping"
                                    columns={['Item', 'Qty']}
                                    rows={shoppingSummary.map((item) => [item.label, item.qty])}
                                    emptyMessage="Shopping list is empty."
                                />
                            )}
                            {activeSection === 'notes' && (
                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-2">Notes</h3>
                                    <p className="text-xs text-gray-600 mb-3">Saved locally in this browser.</p>
                                    <textarea
                                        value={notesText}
                                        onChange={(e) => setNotesText(e.target.value)}
                                        className="w-full h-[420px] border border-gray-300 rounded p-3 text-sm"
                                        placeholder="Add project notes, reminders, and tasks..."
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                    <div
                        ref={viewportRef}
                        className="relative w-full h-full rounded border border-gray-300 bg-[#d9d9d9]"
                        onContextMenu={(e) => e.preventDefault()}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseLeaveViewport}
                        onWheel={onWheel}
                        style={{ userSelect: 'none', cursor: selectedTool ? 'none' : undefined }}
                    >
                        <div className="absolute left-8 top-0 right-0 h-8 border-b border-gray-300 bg-gray-100 z-20 overflow-hidden pointer-events-none">
                            <div
                                className="absolute left-0 top-0 h-full"
                                style={{
                                    width: worldWidth * camera.scale,
                                    transform: `translateX(${camera.x}px)`,
                                }}
                            >
                                {rulerTopTicks.map((tick) => (
                                    <div
                                        key={`top-${tick}`}
                                        className="absolute top-0 h-full border-l border-gray-400/60 text-[10px] text-gray-700"
                                        style={{ left: tick * FOOT_PX * camera.scale }}
                                    >
                                        <span className="absolute top-1 left-1">{tick}'</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="absolute left-0 top-8 bottom-0 w-8 border-r border-gray-300 bg-gray-100 z-20 overflow-hidden pointer-events-none">
                            <div
                                className="absolute left-0 top-0 w-full"
                                style={{
                                    height: worldHeight * camera.scale,
                                    transform: `translateY(${camera.y}px)`,
                                }}
                            >
                                {rulerLeftTicks.map((tick) => (
                                    <div
                                        key={`left-${tick}`}
                                        className="absolute left-0 w-full border-t border-gray-400/60 text-[10px] text-gray-700"
                                        style={{ top: tick * FOOT_PX * camera.scale }}
                                    >
                                        <span className="absolute left-1 top-0.5 -rotate-90 origin-top-left">{tick}'</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div
                            className="absolute left-8 top-8"
                            style={{
                                width: worldWidth,
                                height: worldHeight,
                                transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
                                transformOrigin: 'top left',
                            }}
                        >
                            <div
                                className="bg-white shadow-2xl border border-gray-300 relative overflow-hidden print:border-4 print:border-black"
                                style={{
                                    width: worldWidth,
                                    height: worldHeight,
                                    backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                                    backgroundImage: layers.grid
                                        ? 'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)'
                                        : 'none',
                                }}
                            >
                                {orderedItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`group/item ${selectedTool ? 'pointer-events-none' : ''}`}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setArmedStructureMoveId(null);
                                            setSelectedItemId(item.id);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            left: item.x,
                                            top: item.y,
                                            zIndex: item.type === 'plant' ? 10 : 1,
                                            cursor: mode === 'move' ? 'pointer' : 'default',
                                        }}
                                    >
                                        <RenderItemContent item={item} />
                                        {!selectedTool && mode === 'move' && layers.guides && (
                                            <div className="absolute inset-0 border-2 border-blue-400 opacity-0 group-hover/item:opacity-100 rounded pointer-events-none transition-opacity" />
                                        )}
                                        {selectedItemId === item.id && (
                                            <div className="absolute inset-[-2px] border-2 border-amber-500 rounded pointer-events-none" />
                                        )}
                                    </div>
                                ))}

                                {selectedTool && ghostPos && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: ghostPos.x,
                                            top: ghostPos.y,
                                            opacity: 0.65,
                                            pointerEvents: 'none',
                                            zIndex: 50,
                                        }}
                                    >
                                        {mode === 'move' && (
                                            <div
                                                className="absolute text-gray-700/90"
                                                style={{
                                                    left: toolPixelSize.w / 2,
                                                    top: toolPixelSize.h / 2,
                                                    transform: 'translate(-50%, -50%)',
                                                }}
                                            >
                                                <Hand size={14} />
                                            </div>
                                        )}
                                        {selectedTool.type === 'plant' && layers.guides && (
                                            <div
                                                className={`absolute rounded-full border-dashed ${
                                                    placementInsights?.status === 'warning'
                                                        ? 'border border-red-500/80 bg-red-200/20'
                                                        : placementInsights?.status === 'good'
                                                            ? 'border border-emerald-500/80 bg-emerald-200/20'
                                                            : 'border border-green-400/50'
                                                }`}
                                                style={{
                                                    width: clamp((placementInsights?.baseSpacingPx || (CELL_SIZE * 1.2)) * 2, CELL_SIZE * 2, FOOT_PX * 8),
                                                    height: clamp((placementInsights?.baseSpacingPx || (CELL_SIZE * 1.2)) * 2, CELL_SIZE * 2, FOOT_PX * 8),
                                                    left: -(clamp((placementInsights?.baseSpacingPx || (CELL_SIZE * 1.2)) * 2, CELL_SIZE * 2, FOOT_PX * 8) - CELL_SIZE) / 2,
                                                    top: -(clamp((placementInsights?.baseSpacingPx || (CELL_SIZE * 1.2)) * 2, CELL_SIZE * 2, FOOT_PX * 8) - CELL_SIZE) / 2,
                                                }}
                                            />
                                        )}
                                        <RenderItemContent item={selectedTool} isGhost />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="absolute left-10 bottom-2 z-30 text-[11px] bg-white/95 border border-gray-300 rounded px-2 py-1 text-gray-700 shadow-sm pointer-events-none">
                            {`Mode: ${mode.toUpperCase()}  |  Zoom: ${Math.round(camera.scale * 100)}%`}
                        </div>
                        <div className="absolute right-10 bottom-2 z-30 text-[11px] bg-white/95 border border-gray-300 rounded px-2 py-1 text-gray-700 shadow-sm pointer-events-none">
                            {`${clamp(cursorWorld.x / (CELL_SIZE * CELLS_PER_FOOT), 0, width).toFixed(1)}ft, ${clamp(cursorWorld.y / (CELL_SIZE * CELLS_PER_FOOT), 0, length).toFixed(1)}ft`}
                        </div>
                    </div>
                    )}

                </main>

                <aside className="right-panel w-[300px] bg-white border-l border-gray-200 p-4 overflow-y-auto print:hidden">
                    <div className="mb-3 p-3 rounded border border-gray-200 bg-gray-50">
                        <h3 className="font-semibold text-gray-800 mb-2">Selected Item</h3>
                        {!selectedPlacedItem ? (
                            <p className="text-xs text-gray-600">Click an item on the canvas to inspect and edit it.</p>
                        ) : (
                            <form
                                key={selectedPlacedItem.id}
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const form = new FormData(e.currentTarget);
                                    const nextWidth = selectedPlacedItem.type === 'structure'
                                        ? Math.max(1, Math.min(50, Number(form.get('width')) || 1))
                                        : undefined;
                                    const nextLength = selectedPlacedItem.type === 'structure'
                                        ? Math.max(1, Math.min(50, Number(form.get('length')) || 1))
                                        : undefined;
                                    const { w, h } = getItemPixelSize(selectedPlacedItem, {
                                        width: nextWidth,
                                        length: nextLength,
                                    });
                                    const maxX = Math.max(0, worldWidth - w);
                                    const maxY = Math.max(0, worldHeight - h);
                                    const patch = {
                                        x: clamp(Number(form.get('xFeet')) * FOOT_PX, 0, maxX),
                                        y: clamp(Number(form.get('yFeet')) * FOOT_PX, 0, maxY),
                                    };
                                    if (selectedPlacedItem.type === 'structure') {
                                        patch.width = nextWidth;
                                        patch.length = nextLength;
                                    }
                                    applyItemPatch(selectedPlacedItem.id, patch);
                                }}
                            >
                                <div className="text-xs text-gray-600 mb-2">
                                    {selectedPlacedItem.name} ({selectedPlacedItem.type})
                                </div>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <label className="text-xs text-gray-600">
                                        X (ft)
                                        <input
                                            name="xFeet"
                                            type="number"
                                            step="0.5"
                                            min={0}
                                            defaultValue={Number((selectedPlacedItem.x / FOOT_PX).toFixed(1))}
                                            className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                        />
                                    </label>
                                    <label className="text-xs text-gray-600">
                                        Y (ft)
                                        <input
                                            name="yFeet"
                                            type="number"
                                            step="0.5"
                                            min={0}
                                            defaultValue={Number((selectedPlacedItem.y / FOOT_PX).toFixed(1))}
                                            className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                        />
                                    </label>
                                </div>
                                {selectedPlacedItem.type === 'structure' && (
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <label className="text-xs text-gray-600">
                                            W (ft)
                                            <input
                                                name="width"
                                                type="number"
                                                min={1}
                                                max={50}
                                                defaultValue={selectedPlacedItem.width || 1}
                                                className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                            />
                                        </label>
                                        <label className="text-xs text-gray-600">
                                            L (ft)
                                            <input
                                                name="length"
                                                type="number"
                                                min={1}
                                                max={50}
                                                defaultValue={selectedPlacedItem.length || 1}
                                                className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                            />
                                        </label>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        className="flex-1 px-2 py-1.5 text-xs rounded border border-blue-600 text-blue-700 bg-white hover:bg-blue-50"
                                    >
                                        Apply
                                    </button>
                                    {mode === 'move' && !selectedTool && selectedPlacedItem.type !== 'structure' && (
                                        <button
                                            type="button"
                                            onClick={() => pickUpItem(selectedPlacedItem)}
                                            className="flex-1 px-2 py-1.5 text-xs rounded border border-amber-600 text-amber-700 bg-white hover:bg-amber-50"
                                        >
                                            Move This Item
                                        </button>
                                    )}
                                    {mode === 'move' && !selectedTool && selectedPlacedItem.type === 'structure' && armedStructureMoveId !== selectedPlacedItem.id && (
                                        <button
                                            type="button"
                                            onClick={() => setArmedStructureMoveId(selectedPlacedItem.id)}
                                            className="flex-1 px-2 py-1.5 text-xs rounded border border-amber-700 text-amber-800 bg-amber-50 hover:bg-amber-100"
                                        >
                                            Unlock Structure Move
                                        </button>
                                    )}
                                    {mode === 'move' && !selectedTool && selectedPlacedItem.type === 'structure' && armedStructureMoveId === selectedPlacedItem.id && (
                                        <button
                                            type="button"
                                            onClick={() => pickUpItem(selectedPlacedItem)}
                                            className="flex-1 px-2 py-1.5 text-xs rounded border border-amber-600 text-amber-700 bg-white hover:bg-amber-50"
                                        >
                                            Move This Item
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleTrash}
                                        className="flex-1 px-2 py-1.5 text-xs rounded border border-red-600 text-red-700 bg-white hover:bg-red-50"
                                    >
                                        Delete
                                    </button>
                                </div>
                                {mode === 'move' && selectedPlacedItem.type === 'structure' && !selectedTool && (
                                    <p className="text-[11px] text-gray-500 mt-2">
                                        Structures are move-locked by default. Use "Unlock Structure Move" before repositioning.
                                    </p>
                                )}
                            </form>
                        )}
                    </div>

                    <div className="flex border-b border-gray-200 mb-3">
                        <button onClick={() => setRightTab('learn')} className={`flex-1 py-2 text-xs font-semibold ${rightTab === 'learn' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-500'}`}>Learn</button>
                        <button onClick={() => setRightTab('layers')} className={`flex-1 py-2 text-xs font-semibold ${rightTab === 'layers' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-500'}`}>Layers</button>
                        <button onClick={() => setRightTab('timeline')} className={`flex-1 py-2 text-xs font-semibold ${rightTab === 'timeline' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-500'}`}>Timeline</button>
                    </div>

                    {rightTab === 'learn' && (
                        <>
                            <h3 className="font-semibold text-gray-800 mb-2">Learn to Use</h3>
                            <p className="text-xs text-gray-600 mb-4">Desktop-first planner workflow guidance with live plant intelligence.</p>
                            <HelpCard title="1. Place Plants" body="Choose a plant in the left panel, then click on the canvas to place." />
                            <HelpCard title="2. Resize Structures" body="Set width/length in Structures tab, then place on the canvas." />
                            <HelpCard title="3. Spacing Ring" body="Plant placement ring turns red when spacing or poor-neighbor guidance is violated." />
                            <HelpCard title="4. Move Items" body="Switch to Move mode, then click an item to pick it up and reposition." />
                            <HelpCard title="5. Save & Print" body="Use Save for JSON export and Print for plan output." />

                            {focusedPlantContext && (
                                <div className="mt-4 border border-gray-200 rounded p-3 bg-gray-50">
                                    <h4 className="text-sm font-semibold text-gray-800 mb-2">
                                        Plant Guidance: {focusedPlantContext.name}
                                    </h4>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700">
                                            Spacing: {focusedPlantContext.spacingInches}"
                                        </span>
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700">
                                            Scope: {focusedPlantContext.regionScope}
                                        </span>
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700">
                                            Zone: {String(zone).toUpperCase()}
                                        </span>
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700">
                                            Confidence S/N/W: {focusedPlantContext.evidence.spacing}/{focusedPlantContext.evidence.neighbors}/{focusedPlantContext.evidence.window}
                                        </span>
                                    </div>
                                    <details className="text-[11px] text-gray-600 mb-2">
                                        <summary className="cursor-pointer select-none">Confidence key</summary>
                                        <div className="mt-1">
                                            <strong>S</strong> = spacing, <strong>N</strong> = neighbors, <strong>W</strong> = planting window.
                                            <span className="ml-1">Each value is high/medium/low confidence.</span>
                                        </div>
                                    </details>
                                    <div className="text-[11px] text-gray-600 mb-2">Last reviewed: {focusedPlantContext.lastReviewed || 'Not reviewed yet'}</div>
                                    <p className="text-xs text-gray-600 mb-2">{focusedPlantContext.notes}</p>
                                    <div className="text-xs text-gray-700">
                                        Good neighbors: {focusedPlantContext.goodNeighbors.length > 0 ? focusedPlantContext.goodNeighbors.join(', ') : 'none listed'}
                                    </div>
                                    <div className="text-xs text-gray-700 mb-2">
                                        Avoid near: {focusedPlantContext.avoidNeighbors.length > 0 ? focusedPlantContext.avoidNeighbors.join(', ') : 'none listed'}
                                    </div>
                                    <details className="text-xs text-gray-600">
                                        <summary className="cursor-pointer select-none">Sources ({focusedPlantContext.sourceRefs.length})</summary>
                                        {focusedPlantContext.sourceRefs.length === 0 ? (
                                            <div className="mt-1">Not populated yet.</div>
                                        ) : (
                                            <ul className="mt-1 mb-2 space-y-1">
                                                {focusedPlantContext.sourceRefs.map((ref, idx) => (
                                                    <li key={`${focusedPlantContext.id}-src-${idx}`}>
                                                        <a href={ref.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                                                            {ref.title || ref.url}
                                                        </a>
                                                        <span className="text-gray-500"> ({ref.publisher || 'source'})</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </details>
                                    <details className="text-xs text-gray-600 mt-1">
                                        <summary className="cursor-pointer select-none">Nearby plants ({focusedPlantContext.nearby.length})</summary>
                                        {focusedPlantContext.nearby.length === 0 ? (
                                            <div className="mt-1">No nearby plants.</div>
                                        ) : (
                                            <ul className="mt-1 space-y-1">
                                                {focusedPlantContext.nearby.map((neighbor) => (
                                                    <li key={neighbor.id} className="flex justify-between">
                                                        <span>
                                                            {neighbor.name}
                                                            {neighbor.relation === 'good' ? ' (good)' : ''}
                                                            {neighbor.relation === 'avoid' ? ' (avoid)' : ''}
                                                            {neighbor.tooClose ? ' - too close' : ''}
                                                        </span>
                                                        <span>{neighbor.distanceInches}"</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </details>
                                </div>
                            )}

                            {placementInsights?.status === 'warning' && (
                                <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                                    Placement warning: the current ghost location violates spacing or companion guidance.
                                </div>
                            )}
                        </>
                    )}

                    {rightTab === 'layers' && (
                        <>
                            <h3 className="font-semibold text-gray-800 mb-2">Layers</h3>
                            <p className="text-xs text-gray-600 mb-3">Control visibility and editability.</p>
                            <LayerRow
                                name="Grid"
                                checked={layers.grid}
                                onChange={(checked) => setLayers((prev) => ({ ...prev, grid: checked }))}
                            />
                            <LayerRow
                                name="Structures"
                                checked={layers.structures}
                                onChange={(checked) => setLayers((prev) => ({ ...prev, structures: checked }))}
                            />
                            <LayerRow
                                name="Plants"
                                checked={layers.plants}
                                onChange={(checked) => setLayers((prev) => ({ ...prev, plants: checked }))}
                            />
                            <LayerRow
                                name="Selection Guides"
                                checked={layers.guides}
                                onChange={(checked) => setLayers((prev) => ({ ...prev, guides: checked }))}
                            />
                            {selectedTool && (
                                <div className="mt-4 p-3 rounded border border-gray-200 bg-gray-50 text-xs">
                                    <div className="font-semibold text-gray-700 mb-1">Inspector</div>
                                    <div className="text-gray-600">Name: {selectedTool.name}</div>
                                    <div className="text-gray-600">Type: {selectedTool.type}</div>
                                    {selectedTool.type === 'structure' && (
                                        <div className="text-gray-600">Size: {selectedTool.width}' x {selectedTool.length}'</div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {rightTab === 'timeline' && (
                        <>
                            <h3 className="font-semibold text-gray-800 mb-2">Timeline</h3>
                            <p className="text-xs text-gray-600 mb-3">Compare your current plants against suggested planting windows.</p>
                            <div className="text-[11px] text-gray-600 mb-2">USDA zone context: {String(zone).toUpperCase()}</div>
                            <label className="text-xs text-gray-600 block mb-2">
                                Month
                                <select
                                    value={timelineMonth}
                                    onChange={(e) => setTimelineMonth(Number(e.target.value))}
                                    className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                                >
                                    {MONTH_LABELS.map((label, idx) => (
                                        <option key={label} value={idx}>{label}</option>
                                    ))}
                                </select>
                            </label>
                            <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                                {timelineRows.length === 0 ? (
                                    <p className="text-xs text-gray-500">Add plants to see timeline guidance.</p>
                                ) : timelineRows.map((row) => (
                                    <div key={row.name} className="border border-gray-200 rounded p-2 bg-gray-50">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="font-medium text-gray-800">{row.name}</span>
                                            <span className="text-gray-600">x{row.count}</span>
                                        </div>
                                        {row.window ? (
                                            <div>
                                                <div className={`text-[11px] mb-1 ${row.inWindow ? 'text-green-700' : 'text-amber-700'}`}>
                                                    Suggested: {MONTH_LABELS[row.window.start]}-{MONTH_LABELS[row.window.end]} {row.inWindow ? '(in window)' : '(outside window)'}
                                                </div>
                                                <div className="grid grid-cols-12 gap-0.5">
                                                    {MONTH_LABELS.map((month, idx) => {
                                                        const inSuggested = idx >= row.window.start && idx <= row.window.end;
                                                        const isActive = idx === timelineMonth;
                                                        return (
                                                            <div
                                                                key={`${row.name}-${month}`}
                                                                className={`h-2 rounded-sm ${inSuggested ? 'bg-green-300' : 'bg-gray-200'} ${isActive ? 'ring-1 ring-gray-700' : ''}`}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-[11px] text-gray-500">No planting window defined yet.</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
}

function HelpCard({ title, body }) {
    return (
        <div className="mb-3 border border-gray-200 rounded p-3 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-800 mb-1">{title}</h4>
            <p className="text-xs text-gray-600">{body}</p>
        </div>
    );
}

function SimpleTable({ title, columns, rows, emptyMessage }) {
    return (
        <div>
            <h3 className="font-semibold text-gray-800 mb-3">{title}</h3>
            {rows.length === 0 ? (
                <p className="text-sm text-gray-500">{emptyMessage}</p>
            ) : (
                <div className="border border-gray-200 rounded overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                {columns.map((column) => (
                                    <th key={column} className="text-left px-3 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                        {column}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, rowIndex) => (
                                <tr key={`row-${rowIndex}`} className="border-t border-gray-100">
                                    {row.map((cell, cellIndex) => (
                                        <td key={`row-${rowIndex}-cell-${cellIndex}`} className="px-3 py-2 text-gray-700">
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function LayerRow({ name, checked, onChange }) {
    return (
        <label className="flex items-center justify-between text-sm text-gray-700 py-2 border-b border-gray-100">
            <span>{name}</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange?.(e.target.checked)}
            />
        </label>
    );
}

function RenderItemContent({ item, isGhost = false }) {
    if (item.type === 'structure' || item.itemType === 'structure') {
        const w = item.width * CELLS_PER_FOOT * CELL_SIZE;
        const h = item.length * CELLS_PER_FOOT * CELL_SIZE;
        const isPlot = item.subType === 'garden-plot';
        const isRound = item.subType === 'raised-bed-round' || item.shape === 'circle';
        const borderClass = isPlot ? 'border-green-800' : 'border-teal-400';

        const style = {
            width: w,
            height: h,
            backgroundImage: DIRT_PATTERN,
            backgroundSize: '20px 20px',
            backgroundColor: 'rgba(93, 64, 55, 0.4)',
        };

        return (
            <div
                style={style}
                className={`border-2 shadow-sm ${borderClass} opacity-90 ${isRound ? 'rounded-full' : 'rounded'} flex items-center justify-center`}
            >
                {!isGhost && (
                    <div className="text-[10px] sm:text-xs font-mono text-white/70 bg-black/20 px-1 rounded pointer-events-none select-none">
                        {item.width}'x{item.length}'
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            className="pointer-events-none select-none flex items-center justify-center"
            style={{ width: CELL_SIZE, height: CELL_SIZE, lineHeight: 1 }}
            aria-label={item.name}
        >
            <span style={{ fontSize: CELL_SIZE * 0.95 }}>
                {getPlantById(item.itemId || item.id)?.icon || '🌱'}
            </span>
        </div>
    );
}
