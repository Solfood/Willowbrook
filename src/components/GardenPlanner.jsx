import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
    Grip,
    Hand,
    LocateFixed,
    Minus,
    Plus,
    Redo,
    Save,
    Trash2,
    Undo,
    Upload,
    Menu,
} from 'lucide-react';
import Sidebar from './Sidebar';
import { createPlannerInitialState, plannerActionTypes, plannerReducer } from '../features/planner/planReducer';
import { parseGardenPlanText } from '../features/planner/planSchema';
import { getPlantImage } from '../features/catalog/catalog';

const CELL_SIZE = 15; // px
const CELLS_PER_FOOT = 2; // 0.5ft per cell
const GRID_SIZE = CELL_SIZE;
const MIN_SCALE = 0.35;
const MAX_SCALE = 3;
const TOUCH_TAP_MOVE_PX = 8;
const MOMENTUM_FRICTION = 0.92;
const MOMENTUM_STOP = 0.3;

const DIRT_PATTERN = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%235D4037' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E")`;

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function getDistance(a, b) {
    const dx = b.clientX - a.clientX;
    const dy = b.clientY - a.clientY;
    return Math.hypot(dx, dy);
}

function getMidpoint(a, b) {
    return {
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2,
    };
}

export default function GardenPlanner({ width, length, initialItems = [], onNewGarden, onLoadGarden }) {
    const worldWidth = width * CELLS_PER_FOOT * CELL_SIZE;
    const worldHeight = length * CELLS_PER_FOOT * CELL_SIZE;

    const [plannerState, dispatch] = useReducer(plannerReducer, initialItems, createPlannerInitialState);
    const { items, history, currentHistoryIndex } = plannerState;

    const [selectedTool, setSelectedTool] = useState(null);
    const [mode, setMode] = useState('pan'); // pan | place
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });
    const [cursorWorld, setCursorWorld] = useState({ x: worldWidth / 2, y: worldHeight / 2 });

    const viewportRef = useRef(null);
    const mouseDragRef = useRef({
        active: false,
        moved: false,
        startX: 0,
        startY: 0,
        originX: 0,
        originY: 0,
    });
    const touchRef = useRef({
        mode: null, // pan | pinch | place
        moved: false,
        lastPan: null,
        lastDistance: 0,
        lastMidpoint: null,
        velocity: { x: 0, y: 0 },
        momentumFrame: null,
    });

    const commitItems = useCallback((nextItems) => {
        dispatch({ type: plannerActionTypes.COMMIT_ITEMS, payload: nextItems });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedTool(null);
    }, []);

    const toWorld = useCallback((clientX, clientY, activeCamera = camera) => {
        if (!viewportRef.current) return { x: 0, y: 0 };
        const rect = viewportRef.current.getBoundingClientRect();
        return {
            x: (clientX - rect.left - activeCamera.x) / activeCamera.scale,
            y: (clientY - rect.top - activeCamera.y) / activeCamera.scale,
        };
    }, [camera]);

    const fitToView = useCallback(() => {
        if (!viewportRef.current) return;
        const rect = viewportRef.current.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const scale = clamp(
            Math.min((rect.width - 32) / worldWidth, (rect.height - 32) / worldHeight),
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

    const stopMomentum = useCallback(() => {
        if (touchRef.current.momentumFrame) {
            cancelAnimationFrame(touchRef.current.momentumFrame);
            touchRef.current.momentumFrame = null;
        }
        touchRef.current.velocity = { x: 0, y: 0 };
    }, []);

    const zoomFromViewportCenter = useCallback((nextScale) => {
        if (!viewportRef.current) return;
        const rect = viewportRef.current.getBoundingClientRect();
        zoomAt(nextScale, rect.left + rect.width / 2, rect.top + rect.height / 2);
    }, [zoomAt]);

    const setCursorFromClient = useCallback((clientX, clientY) => {
        setCursorWorld(toWorld(clientX, clientY));
    }, [toWorld]);

    const pickUpItem = useCallback((item) => {
        dispatch({ type: plannerActionTypes.PICKUP_ITEM, payload: item.id });
        setSelectedTool({
            ...item,
            itemId: item.itemId || item.id,
            isNew: false,
            id: item.id,
        });
        setMode('place');
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

    const ghostPos = useMemo(() => {
        if (!selectedTool) return null;
        const x = Math.round((cursorWorld.x - toolPixelSize.w / 2) / GRID_SIZE) * GRID_SIZE;
        const y = Math.round((cursorWorld.y - toolPixelSize.h / 2) / GRID_SIZE) * GRID_SIZE;
        return { x, y };
    }, [selectedTool, cursorWorld, toolPixelSize]);

    const placeSelectedAt = useCallback((worldPoint) => {
        if (!selectedTool) return false;
        const w = toolPixelSize.w;
        const h = toolPixelSize.h;

        const snappedX = Math.round((worldPoint.x - w / 2) / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round((worldPoint.y - h / 2) / GRID_SIZE) * GRID_SIZE;

        if (snappedX < 0 || snappedY < 0 || snappedX + w > worldWidth || snappedY + h > worldHeight) {
            return false;
        }

        const nextItem = {
            ...selectedTool,
            x: snappedX,
            y: snappedY,
            id: selectedTool.isNew ? Date.now() : selectedTool.id,
        };

        commitItems([...items, nextItem]);
        clearSelection();
        return true;
    }, [selectedTool, toolPixelSize, worldWidth, worldHeight, commitItems, items, clearSelection]);

    const handleSidebarSelect = useCallback((item) => {
        setSelectedTool({
            ...item,
            itemId: item.id,
            isNew: true,
            id: Date.now(),
        });
        setMode('place');
        setIsSidebarOpen(false);
    }, []);

    const handleUndo = useCallback(() => {
        if (currentHistoryIndex <= 0) return;
        dispatch({ type: plannerActionTypes.UNDO });
        clearSelection();
    }, [currentHistoryIndex, clearSelection]);

    const handleRedo = useCallback(() => {
        if (currentHistoryIndex >= history.length - 1) return;
        dispatch({ type: plannerActionTypes.REDO });
        clearSelection();
    }, [currentHistoryIndex, history.length, clearSelection]);

    const handleTrash = useCallback(() => {
        if (selectedTool && !selectedTool.isNew) {
            commitItems(items);
        }
        clearSelection();
    }, [selectedTool, commitItems, items, clearSelection]);

    const handleSave = useCallback(async () => {
        const data = { schemaVersion: 1, width, length, items };
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
            console.error('Save picker failed, using download fallback:', err);
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
    }, [width, length, items]);

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

            if (result.plan.width !== width || result.plan.length !== length) {
                if (typeof onLoadGarden === 'function') {
                    onLoadGarden({
                        width: result.plan.width,
                        length: result.plan.length,
                        items: result.plan.items,
                    });
                    return;
                }
                alert('Loaded plan dimensions do not match the current garden.');
                return;
            }

            dispatch({ type: plannerActionTypes.LOAD_ITEMS, payload: result.plan.items });
            clearSelection();
        };

        reader.readAsText(file);
        e.target.value = '';
    }, [width, length, onLoadGarden, clearSelection]);

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
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedTool, clearSelection, handleUndo, handleRedo]);

    useEffect(() => {
        fitToView();
    }, [fitToView]);

    useEffect(() => {
        const onResize = () => fitToView();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [fitToView]);

    const onMouseDown = (e) => {
        if (e.button !== 0) return;
        stopMomentum();
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
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            drag.moved = true;
        }

        setCamera((prev) => ({
            ...prev,
            x: drag.originX + dx,
            y: drag.originY + dy,
        }));
    };

    const onMouseUp = (e) => {
        const drag = mouseDragRef.current;
        const wasDrag = drag.active && drag.moved;
        mouseDragRef.current.active = false;

        setCursorFromClient(e.clientX, e.clientY);

        if (!wasDrag && mode === 'place' && selectedTool) {
            const world = toWorld(e.clientX, e.clientY);
            placeSelectedAt(world);
        }
    };

    const onTouchStart = (e) => {
        if (!viewportRef.current) return;

        if (e.touches.length === 2) {
            touchRef.current = {
                mode: 'pinch',
                moved: true,
                lastPan: null,
                lastDistance: getDistance(e.touches[0], e.touches[1]),
                lastMidpoint: getMidpoint(e.touches[0], e.touches[1]),
                velocity: { x: 0, y: 0 },
                momentumFrame: null,
            };
            e.preventDefault();
            return;
        }

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            setCursorFromClient(touch.clientX, touch.clientY);

            const shouldPan = mode === 'pan' || !selectedTool;
            touchRef.current = {
                mode: shouldPan ? 'pan' : 'place',
                moved: false,
                lastPan: { x: touch.clientX, y: touch.clientY, t: performance.now() },
                lastDistance: 0,
                lastMidpoint: null,
                velocity: { x: 0, y: 0 },
                momentumFrame: null,
            };
            stopMomentum();
            e.preventDefault();
        }
    };

    const onTouchMove = (e) => {
        if (!viewportRef.current) return;

        if (e.touches.length === 2) {
            const distance = getDistance(e.touches[0], e.touches[1]);
            const midpoint = getMidpoint(e.touches[0], e.touches[1]);
            const prev = touchRef.current;

            setCamera((current) => {
                const baseScale = prev.lastDistance > 0 ? current.scale * (distance / prev.lastDistance) : current.scale;
                const scale = clamp(baseScale, MIN_SCALE, MAX_SCALE);
                const world = toWorld(midpoint.x, midpoint.y, current);
                const rect = viewportRef.current.getBoundingClientRect();
                const localX = midpoint.x - rect.left;
                const localY = midpoint.y - rect.top;

                return {
                    scale,
                    x: localX - world.x * scale,
                    y: localY - world.y * scale,
                };
            });

            touchRef.current = {
                mode: 'pinch',
                moved: true,
                lastPan: null,
                lastDistance: distance,
                lastMidpoint: midpoint,
            };
            e.preventDefault();
            return;
        }

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            setCursorFromClient(touch.clientX, touch.clientY);

            if (touchRef.current.mode === 'pan' && touchRef.current.lastPan) {
                const dx = touch.clientX - touchRef.current.lastPan.x;
                const dy = touch.clientY - touchRef.current.lastPan.y;
                if (Math.abs(dx) > TOUCH_TAP_MOVE_PX || Math.abs(dy) > TOUCH_TAP_MOVE_PX) {
                    touchRef.current.moved = true;
                }
                const now = performance.now();
                const dt = Math.max(1, now - touchRef.current.lastPan.t);
                touchRef.current.velocity = { x: dx / dt, y: dy / dt };
                setCamera((current) => ({
                    ...current,
                    x: current.x + dx,
                    y: current.y + dy,
                }));
                touchRef.current.lastPan = { x: touch.clientX, y: touch.clientY, t: now };
                e.preventDefault();
            }

            if (touchRef.current.mode === 'place' && touchRef.current.lastPan) {
                const dx = touch.clientX - touchRef.current.lastPan.x;
                const dy = touch.clientY - touchRef.current.lastPan.y;
                if (Math.abs(dx) > TOUCH_TAP_MOVE_PX || Math.abs(dy) > TOUCH_TAP_MOVE_PX) {
                    touchRef.current.moved = true;
                }
                e.preventDefault();
            }
        }
    };

    const onTouchEnd = (e) => {
        if (touchRef.current.mode === 'place' && !touchRef.current.moved && selectedTool && e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            const world = toWorld(touch.clientX, touch.clientY);
            placeSelectedAt(world);
        }

        if (e.touches.length === 0) {
            if (touchRef.current.mode === 'pan' && touchRef.current.moved) {
                const step = () => {
                    const v = touchRef.current.velocity;
                    if (Math.abs(v.x) < MOMENTUM_STOP && Math.abs(v.y) < MOMENTUM_STOP) {
                        touchRef.current.momentumFrame = null;
                        touchRef.current.velocity = { x: 0, y: 0 };
                        return;
                    }

                    setCamera((current) => ({
                        ...current,
                        x: current.x + v.x * 16,
                        y: current.y + v.y * 16,
                    }));

                    touchRef.current.velocity = {
                        x: v.x * MOMENTUM_FRICTION,
                        y: v.y * MOMENTUM_FRICTION,
                    };
                    touchRef.current.momentumFrame = requestAnimationFrame(step);
                };
                touchRef.current.momentumFrame = requestAnimationFrame(step);
            }

            touchRef.current = {
                mode: null,
                moved: false,
                lastPan: null,
                lastDistance: 0,
                lastMidpoint: null,
                velocity: touchRef.current.velocity,
                momentumFrame: touchRef.current.momentumFrame,
            };
        }
    };

    const onWheel = (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.08 : 0.92;
        zoomAt(camera.scale * factor, e.clientX, e.clientY);
    };

    useEffect(() => {
        return () => stopMomentum();
    }, [stopMomentum]);

    const orderedItems = useMemo(() => {
        return [...items].sort((a, b) => {
            if (a.type === b.type) return 0;
            return a.type === 'structure' ? -1 : 1;
        });
    }, [items]);

    return (
        <div className="flex h-screen flex-col">
            <style>{`
                @media print {
                    @page { size: landscape; margin: 0.5cm; }
                    header, aside, .mobile-controls, .floating-trash { display: none !important; }
                    body { background: white; }
                    main { box-shadow: none; margin: 0; padding: 0; overflow: visible; }
                }
            `}</style>

            <header className="bg-white shadow p-3 z-40 flex justify-between items-center px-3 md:px-8 print:hidden gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-gray-600" title="Catalog">
                        <Menu size={22} />
                    </button>
                    <h1 className="text-lg md:text-xl font-bold text-green-800 whitespace-nowrap">Willowbrook</h1>
                    <div className="hidden md:flex gap-1 ml-3 border-l pl-3 border-gray-300">
                        <button onClick={handleUndo} disabled={currentHistoryIndex <= 0} className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 rounded hover:bg-gray-100"><Undo size={19} /></button>
                        <button onClick={handleRedo} disabled={currentHistoryIndex >= history.length - 1} className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 rounded hover:bg-gray-100"><Redo size={19} /></button>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-2">
                    <button onClick={() => setMode('pan')} className={`px-3 py-1 text-sm rounded border ${mode === 'pan' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-gray-700 border-gray-300'}`}><Hand size={14} className="inline mr-1" />Pan</button>
                    <button onClick={() => setMode('place')} className={`px-3 py-1 text-sm rounded border ${mode === 'place' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}><Grip size={14} className="inline mr-1" />Place</button>
                    <button onClick={() => zoomFromViewportCenter(camera.scale * 0.9)} className="p-2 border rounded border-gray-300 text-gray-700 hover:bg-gray-100" title="Zoom out"><Minus size={16} /></button>
                    <span className="text-xs w-14 text-center text-gray-600">{Math.round(camera.scale * 100)}%</span>
                    <button onClick={() => zoomFromViewportCenter(camera.scale * 1.1)} className="p-2 border rounded border-gray-300 text-gray-700 hover:bg-gray-100" title="Zoom in"><Plus size={16} /></button>
                </div>

                <div className={`text-xs md:text-sm font-medium px-2 md:px-3 py-1 rounded-full border truncate max-w-[130px] md:max-w-none ${selectedTool ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {selectedTool ? (selectedTool.isNew ? 'Placing' : 'Moving') : `${width}ft x ${length}ft`}
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                    <button onClick={fitToView} className="text-gray-600 hover:text-gray-900 p-2 md:px-3 md:py-1 border border-gray-300 rounded hover:bg-gray-100" title="Fit">
                        <LocateFixed size={17} className="md:hidden" />
                        <span className="hidden md:inline text-sm font-medium">Fit</span>
                    </button>
                    <button onClick={handleSave} className="text-blue-600 hover:text-blue-800 p-2 md:px-3 md:py-1 border border-blue-200 rounded hover:bg-blue-50" title="Save">
                        <Save size={17} className="md:hidden" />
                        <span className="hidden md:inline text-sm font-medium">Save</span>
                    </button>
                    <label className="text-blue-600 hover:text-blue-800 p-2 md:px-3 md:py-1 border border-blue-200 rounded hover:bg-blue-50 cursor-pointer" title="Load">
                        <Upload size={17} className="md:hidden" />
                        <span className="hidden md:inline text-sm font-medium">Load</span>
                        <input type="file" onChange={handleLoad} accept=".json" className="hidden" />
                    </label>
                    <button onClick={onNewGarden} className="text-red-500 hover:text-red-700 p-2 md:px-3 md:py-1 border border-red-200 rounded hover:bg-red-50" title="New Garden">
                        <Plus size={17} className="md:hidden" />
                        <span className="hidden md:inline text-sm font-medium">New</span>
                    </button>
                    <button onClick={() => window.print()} className="hidden md:block text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1 border border-gray-300 rounded hover:bg-gray-100">Print</button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <Sidebar
                    onItemSelect={handleSidebarSelect}
                    items={items}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />

                <main className="flex-1 overflow-hidden bg-stone-100 p-2 md:p-6 flex shadow-inner relative">
                    <div
                        ref={viewportRef}
                        className="relative w-full h-full touch-none rounded-lg"
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                        onTouchStart={onTouchStart}
                        onTouchMove={onTouchMove}
                        onTouchEnd={onTouchEnd}
                        onWheel={onWheel}
                    >
                        <div
                            className="absolute left-0 top-0"
                            style={{
                                width: worldWidth,
                                height: worldHeight,
                                transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
                                transformOrigin: 'top left',
                            }}
                        >
                            <div
                                className="bg-white shadow-2xl border border-gray-200 relative overflow-hidden print:border-4 print:border-black"
                                style={{
                                    width: worldWidth,
                                    height: worldHeight,
                                    minWidth: worldWidth,
                                    minHeight: worldHeight,
                                    backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                                    backgroundImage: 'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)',
                                }}
                            >
                                {orderedItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`group/item ${selectedTool ? 'pointer-events-none' : ''}`}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            if (mode === 'place' && !selectedTool) {
                                                pickUpItem(item);
                                            }
                                        }}
                                        onTouchStart={(e) => {
                                            e.stopPropagation();
                                            if (mode === 'place' && !selectedTool) {
                                                pickUpItem(item);
                                            }
                                        }}
                                        style={{
                                            position: 'absolute',
                                            left: item.x,
                                            top: item.y,
                                            zIndex: item.type === 'plant' ? 10 : 1,
                                            cursor: mode === 'place' ? 'grab' : 'default',
                                        }}
                                    >
                                        <RenderItemContent item={item} />
                                        {!selectedTool && mode === 'place' && (
                                            <div className="absolute inset-0 border-2 border-blue-400 opacity-0 group-hover/item:opacity-100 rounded pointer-events-none transition-opacity print:hidden" />
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
                                        {selectedTool.type === 'plant' && (
                                            <div
                                                className="absolute -inset-2 border border-green-400/50 rounded-full border-dashed pointer-events-none"
                                                style={{
                                                    width: CELL_SIZE * 2,
                                                    height: CELL_SIZE * 2,
                                                    left: -((CELL_SIZE * 2 - CELL_SIZE) / 2),
                                                    top: -((CELL_SIZE * 2 - CELL_SIZE) / 2),
                                                }}
                                            />
                                        )}
                                        <RenderItemContent item={selectedTool} isGhost />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="absolute left-3 bottom-3 text-[11px] bg-white/95 border border-gray-300 rounded px-2 py-1 text-gray-700 shadow-sm print:hidden">
                            {`Mode: ${mode.toUpperCase()}  |  Zoom: ${Math.round(camera.scale * 100)}%`}
                        </div>

                        <div className="absolute right-3 bottom-3 text-[11px] bg-white/95 border border-gray-300 rounded px-2 py-1 text-gray-700 shadow-sm print:hidden">
                            {`${(cursorWorld.x / (CELL_SIZE * CELLS_PER_FOOT)).toFixed(1)}ft, ${(cursorWorld.y / (CELL_SIZE * CELLS_PER_FOOT)).toFixed(1)}ft`}
                        </div>
                    </div>

                    <button
                        onClick={handleTrash}
                        className={`floating-trash fixed bottom-24 md:bottom-8 right-6 md:right-8 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg border-2 cursor-pointer print:hidden
                        ${selectedTool ? 'bg-red-50 border-red-400 text-red-500 scale-110 hover:bg-red-100' : 'bg-white border-gray-200 text-gray-400'}`}
                        title="Cancel / Trash"
                    >
                        <Trash2 size={28} />
                    </button>
                </main>
            </div>

            <div className="mobile-controls md:hidden border-t bg-white px-3 py-2 flex items-center justify-between gap-2 print:hidden">
                <button onClick={handleUndo} disabled={currentHistoryIndex <= 0} className="p-3 rounded border border-gray-300 disabled:opacity-30 text-gray-700"><Undo size={18} /></button>
                <button onClick={handleRedo} disabled={currentHistoryIndex >= history.length - 1} className="p-3 rounded border border-gray-300 disabled:opacity-30 text-gray-700"><Redo size={18} /></button>
                <button onClick={() => setMode('pan')} className={`px-3 py-3 rounded border text-sm ${mode === 'pan' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white border-gray-300 text-gray-700'}`}><Hand size={14} className="inline mr-1" />Pan</button>
                <button onClick={() => setMode('place')} className={`px-3 py-3 rounded border text-sm ${mode === 'place' ? 'bg-green-700 text-white border-green-700' : 'bg-white border-gray-300 text-gray-700'}`}><Grip size={14} className="inline mr-1" />Place</button>
                <button onClick={fitToView} className="p-3 rounded border border-gray-300 text-gray-700"><LocateFixed size={18} /></button>
            </div>
        </div>
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
        <img
            src={getPlantImage(item.itemId || item.id)}
            alt={item.name}
            className="object-contain pointer-events-none"
            style={{ width: CELL_SIZE, height: CELL_SIZE }}
        />
    );
}
