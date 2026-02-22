import React, { useState, useCallback, useRef, useEffect, useReducer } from 'react';
import { Undo, Redo, Trash2, Menu, Save, Upload, Plus, LocateFixed } from 'lucide-react';
import Sidebar from './Sidebar';
import { createPlannerInitialState, plannerActionTypes, plannerReducer } from '../features/planner/planReducer';
import { parseGardenPlanText } from '../features/planner/planSchema';
import { getPlantImage } from '../features/catalog/catalog';

const CELL_SIZE = 15; // px
const CELLS_PER_FOOT = 2; // 0.5 ft per cell
const GRID_SIZE = CELL_SIZE; // Grid snap size
const MIN_SCALE = 0.35;
const MAX_SCALE = 3;

// Dirt pattern
const DIRT_PATTERN = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%235D4037' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E")`;

export default function GardenPlanner({ width, length, initialItems = [], onNewGarden, onLoadGarden }) {
    const gridWidthPx = width * CELLS_PER_FOOT * CELL_SIZE;
    const gridHeightPx = length * CELLS_PER_FOOT * CELL_SIZE;

    const [plannerState, dispatch] = useReducer(plannerReducer, initialItems, createPlannerInitialState);
    const { items, history, currentHistoryIndex } = plannerState;
    // ghostItem: { type, subType, itemId, width, length, ... } - item currently "held" by cursor
    const [ghostItem, setGhostItem] = useState(null);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 }); // Grid-space cursor position
    const [isTouch, setIsTouch] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [camera, setCamera] = useState({ x: 0, y: 0, scale: 1 });

    const gridRef = useRef(null);
    const viewportRef = useRef(null);
    const touchStateRef = useRef({
        mode: null,
        lastPan: null,
        lastDistance: 0,
        lastMidpoint: null,
    });

    // History Management
    const pushToHistory = useCallback((newItems) => {
        dispatch({ type: plannerActionTypes.COMMIT_ITEMS, payload: newItems });
    }, []);

    const undo = () => {
        if (currentHistoryIndex > 0) {
            dispatch({ type: plannerActionTypes.UNDO });
            setGhostItem(null); // Cancel any active action
        }
    };

    const redo = () => {
        if (currentHistoryIndex < history.length - 1) {
            dispatch({ type: plannerActionTypes.REDO });
            setGhostItem(null);
        }
    };

    // Convert Sidebar selection to Ghost Item
    const handleSidebarSelect = (item) => {
        setGhostItem({
            ...item,
            itemId: item.id, // Preserve original ID (e.g. 'beet') before overwriting with timestamp
            isNew: true, // Marker to know this is a fresh item
            id: Date.now() // Temp ID, will be finalized on placement
        });
        setIsSidebarOpen(false);
    };

    const clampScale = useCallback((value) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value)), []);

    const fitToView = useCallback(() => {
        if (!viewportRef.current) return;

        const rect = viewportRef.current.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const horizontalPadding = 32;
        const verticalPadding = 32;
        const targetScale = clampScale(
            Math.min(
                (rect.width - horizontalPadding) / gridWidthPx,
                (rect.height - verticalPadding) / gridHeightPx
            )
        );

        setCamera({
            scale: targetScale,
            x: (rect.width - (gridWidthPx * targetScale)) / 2,
            y: (rect.height - (gridHeightPx * targetScale)) / 2,
        });
    }, [clampScale, gridWidthPx, gridHeightPx]);

    const clientToGrid = useCallback((clientX, clientY, activeCamera = camera) => {
        if (!viewportRef.current) return { x: 0, y: 0 };
        const rect = viewportRef.current.getBoundingClientRect();
        return {
            x: (clientX - rect.left - activeCamera.x) / activeCamera.scale,
            y: (clientY - rect.top - activeCamera.y) / activeCamera.scale,
        };
    }, [camera]);

    const zoomAtPoint = useCallback((nextScale, clientX, clientY) => {
        setCamera(prev => {
            const scale = clampScale(nextScale);
            const world = clientToGrid(clientX, clientY, prev);
            if (!viewportRef.current) return prev;
            const rect = viewportRef.current.getBoundingClientRect();
            const localX = clientX - rect.left;
            const localY = clientY - rect.top;

            return {
                scale,
                x: localX - (world.x * scale),
                y: localY - (world.y * scale),
            };
        });
    }, [clampScale, clientToGrid]);

    // Global mouse tracker for ghost positioning relative to grid
    const handleMouseMove = (e) => {
        if (!viewportRef.current) return;
        setIsTouch(false);
        setCursorPos(clientToGrid(e.clientX, e.clientY));
    };

    const getGhostPosition = () => {
        if (!ghostItem) return { x: 0, y: 0 };
        const itemW = ghostItem.type === 'structure' ? ghostItem.width * CELLS_PER_FOOT * CELL_SIZE : CELL_SIZE;
        const itemH = ghostItem.type === 'structure' ? ghostItem.length * CELLS_PER_FOOT * CELL_SIZE : CELL_SIZE;
        const yOffset = isTouch ? -(60 / camera.scale) : 0;
        const targetX = cursorPos.x - (itemW / 2);
        const targetY = cursorPos.y - (itemH / 2) + yOffset;
        return { x: Math.round(targetX / GRID_SIZE) * GRID_SIZE, y: Math.round(targetY / GRID_SIZE) * GRID_SIZE };
    };

    const ghostPos = getGhostPosition();

    const handleGridClick = () => {
        if (!ghostItem) return;

        const { x, y } = ghostPos;

        // Basic bounds check (top/left only, could extend to width/height)
        if (x < -CELL_SIZE || y < -CELL_SIZE || x >= gridWidthPx || y >= gridHeightPx) return;

        // PLACE THE ITEM
        const newItem = {
            ...ghostItem,
            x,
            y,
            id: ghostItem.isNew ? Date.now() : ghostItem.id // Preserve ID if moving, new if new
        };

        const newItems = [...items, newItem];
        pushToHistory(newItems);
        setGhostItem(null); // Clear hand
    };

    const handleItemClick = (e, item) => {
        e.stopPropagation(); // Don't trigger grid click
        if (ghostItem) return; // If holding something, maybe we want to swap? For now just return.

        // Pick up item
        dispatch({ type: plannerActionTypes.PICKUP_ITEM, payload: item.id }); // Visual remove from grid immediately
        setGhostItem({ ...item, isNew: false }); // Add to hand
    };

    const handleTrashClick = () => {
        if (ghostItem && !ghostItem.isNew) {
            pushToHistory(items);
            setGhostItem(null);
        } else {
            setGhostItem(null);
        }
    };

    const handleSave = async () => {
        const data = { schemaVersion: 1, width, length, items };
        const jsonString = JSON.stringify(data, null, 2);

        try {
            // Try the modern File System Access API if available
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
            if (err.name === 'AbortError') return; // User cancelled
            console.error('File Picker failed, falling back:', err);
        }

        // Fallback: Prompt for name
        const filename = prompt('Enter a name for your garden plan:', 'willowbrook-garden');
        if (!filename) return; // Cancelled

        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleLoad = (e) => {
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
            setGhostItem(null);
        };
        reader.readAsText(file);
    };

    useEffect(() => {
        // Global key listener for Cancel (Esc)
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (ghostItem && !ghostItem.isNew) {
                    dispatch({ type: plannerActionTypes.RESET_TO_COMMITTED }); // Revert to last committed state
                }
                setGhostItem(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [ghostItem, history, currentHistoryIndex]);

    useEffect(() => {
        fitToView();
    }, [fitToView]);

    useEffect(() => {
        const handleResize = () => fitToView();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [fitToView]);

    const getDistance = (touchA, touchB) => {
        const dx = touchB.clientX - touchA.clientX;
        const dy = touchB.clientY - touchA.clientY;
        return Math.hypot(dx, dy);
    };

    const getMidpoint = (touchA, touchB) => ({
        x: (touchA.clientX + touchB.clientX) / 2,
        y: (touchA.clientY + touchB.clientY) / 2,
    });

    const handleTouchStart = (e) => {
        if (!viewportRef.current) return;
        setIsTouch(true);

        if (e.touches.length === 2) {
            const midpoint = getMidpoint(e.touches[0], e.touches[1]);
            touchStateRef.current = {
                mode: 'pinch',
                lastPan: null,
                lastDistance: getDistance(e.touches[0], e.touches[1]),
                lastMidpoint: midpoint,
            };
            e.preventDefault();
            return;
        }

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            if (ghostItem) {
                setCursorPos(clientToGrid(touch.clientX, touch.clientY));
                touchStateRef.current = { mode: 'place', lastPan: null, lastDistance: 0, lastMidpoint: null };
            } else {
                touchStateRef.current = {
                    mode: 'pan',
                    lastPan: { x: touch.clientX, y: touch.clientY },
                    lastDistance: 0,
                    lastMidpoint: null,
                };
            }
            e.preventDefault();
        }
    };

    // Touch Support
    const handleTouchMove = (e) => {
        if (!viewportRef.current) return;
        setIsTouch(true);

        if (e.touches.length === 2) {
            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            const currentMidpoint = getMidpoint(e.touches[0], e.touches[1]);
            const { lastDistance, lastMidpoint } = touchStateRef.current;

            if (lastDistance > 0) {
                setCamera(prev => {
                    const scale = clampScale(prev.scale * (currentDistance / lastDistance));
                    const world = clientToGrid(currentMidpoint.x, currentMidpoint.y, prev);
                    const rect = viewportRef.current.getBoundingClientRect();
                    const localX = currentMidpoint.x - rect.left;
                    const localY = currentMidpoint.y - rect.top;

                    return {
                        scale,
                        x: localX - (world.x * scale) + (currentMidpoint.x - (lastMidpoint?.x ?? currentMidpoint.x)),
                        y: localY - (world.y * scale) + (currentMidpoint.y - (lastMidpoint?.y ?? currentMidpoint.y)),
                    };
                });
            }

            touchStateRef.current = {
                mode: 'pinch',
                lastPan: null,
                lastDistance: currentDistance,
                lastMidpoint: currentMidpoint,
            };
            e.preventDefault();
            return;
        }

        if (ghostItem && e.touches.length === 1) {
            const touch = e.touches[0];
            setCursorPos(clientToGrid(touch.clientX, touch.clientY));
            e.preventDefault();
            return;
        }

        if (touchStateRef.current.mode === 'pan' && e.touches.length === 1) {
            const touch = e.touches[0];
            const last = touchStateRef.current.lastPan;
            if (last) {
                const dx = touch.clientX - last.x;
                const dy = touch.clientY - last.y;
                setCamera(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
            }
            touchStateRef.current.lastPan = { x: touch.clientX, y: touch.clientY };
            e.preventDefault();
        }
    };

    const handleTouchEnd = (e) => {
        if (ghostItem) {
            handleGridClick(e);
        }
        if (e.touches.length === 0) {
            touchStateRef.current = { mode: null, lastPan: null, lastDistance: 0, lastMidpoint: null };
        }
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        zoomAtPoint(camera.scale * zoomFactor, e.clientX, e.clientY);
    };

    const orderedItems = [...items].sort((a, b) => {
        if (a.type === b.type) return 0;
        return a.type === 'structure' ? -1 : 1;
    });

    return (
        <div className="flex h-screen flex-col">
            {/* Print Styles */}
            <style>{`
                @media print {
                    @page { size: landscape; margin: 0.5cm; }
                    header, aside, .fixed.bottom-8 { display: none !important; }
                    .print-hidden { display: none !important; }
                    body { background: white; }
                    main { box-shadow: none; margin: 0; padding: 0; overflow: visible; }
                    /* Make grid fill page */
                    .group { transform: scale(0.8) translate(0, 0); transform-origin: top left; }
                }
            `}</style>

            <header className="bg-white shadow p-3 z-40 flex justify-between items-center px-4 md:px-8 print:hidden">
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-gray-600">
                        <Menu size={24} />
                    </button>
                    <h1 className="text-lg md:text-xl font-bold text-green-800 whitespace-nowrap">
                        <span className="hidden sm:inline">Willowbrook Planner</span>
                        <span className="sm:hidden">Willowbrook</span>
                    </h1>
                    <div className="flex gap-1 ml-2 md:ml-4 border-l pl-2 md:pl-4 border-gray-300">
                        <button onClick={undo} disabled={currentHistoryIndex <= 0} className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 rounded hover:bg-gray-100"><Undo size={20} /></button>
                        <button onClick={redo} disabled={currentHistoryIndex >= history.length - 1} className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 rounded hover:bg-gray-100"><Redo size={20} /></button>
                    </div>
                </div>
                <div className={`text-xs md:text-sm font-medium px-3 py-1 rounded-full border truncate max-w-[120px] md:max-w-none ${ghostItem ? 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {ghostItem ? (ghostItem.isNew ? 'Place' : 'Move') : `${width}ft x ${length}ft`}
                </div>
                <div className="flex gap-2">
                    <button onClick={fitToView} className="text-gray-600 hover:text-gray-900 p-2 md:px-3 md:py-1 border border-gray-300 rounded hover:bg-gray-100" title="Fit">
                        <LocateFixed size={18} className="md:hidden" />
                        <span className="hidden md:inline text-sm font-medium">Fit</span>
                    </button>
                    <button onClick={handleSave} className="text-blue-600 hover:text-blue-800 p-2 md:px-3 md:py-1 border border-blue-200 rounded hover:bg-blue-50" title="Save">
                        <Save size={18} className="md:hidden" />
                        <span className="hidden md:inline text-sm font-medium">Save</span>
                    </button>
                    <label className="text-blue-600 hover:text-blue-800 p-2 md:px-3 md:py-1 border border-blue-200 rounded hover:bg-blue-50 cursor-pointer" title="Load">
                        <Upload size={18} className="md:hidden" />
                        <span className="hidden md:inline text-sm font-medium">Load</span>
                        <input type="file" onChange={handleLoad} accept=".json" className="hidden" />
                    </label>
                    <button onClick={onNewGarden} className="text-red-500 hover:text-red-700 p-2 md:px-3 md:py-1 border border-red-200 rounded hover:bg-red-50 ml-2" title="New Garden">
                        <Plus size={18} className="md:hidden" />
                        <span className="hidden md:inline text-sm font-medium">New</span>
                    </button>
                    <button onClick={() => window.print()} className="hidden md:block text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 ml-2">Print</button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Pass items to Sidebar for Shopping List */}
                <Sidebar
                    onItemSelect={handleSidebarSelect}
                    items={items}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />

                <main className="flex-1 overflow-hidden bg-stone-100 p-2 md:p-8 flex shadow-inner relative cursor-crosshair">
                    <div
                        ref={viewportRef}
                        className="relative w-full h-full touch-none"
                        onMouseMove={handleMouseMove}
                        onWheel={handleWheel}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <div
                            className="absolute left-0 top-0"
                            style={{
                                width: gridWidthPx,
                                height: gridHeightPx,
                                transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
                                transformOrigin: 'top left'
                            }}
                        >
                            {/* Main Grid Area */}
                            <div
                                ref={gridRef}
                                onClick={handleGridClick}
                                className="bg-white shadow-2xl border border-gray-200 relative overflow-hidden print:border-4 print:border-black touch-none"
                                style={{
                                    width: gridWidthPx,
                                    height: gridHeightPx,
                                    minWidth: gridWidthPx,
                                    minHeight: gridHeightPx,
                                    backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                                    backgroundImage: 'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)'
                                }}
                            >
                                {/* Placed Items */}
                                {orderedItems.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={(e) => handleItemClick(e, item)}
                                        // Fix: pointer-events-none when ghostItem exists allows clicking 'through' structure to grid
                                        className={`group/item ${ghostItem ? 'pointer-events-none' : ''}`}
                                        style={{ position: 'absolute', left: item.x, top: item.y, zIndex: item.type === 'plant' ? 10 : 1, cursor: ghostItem ? 'grabbing' : 'grab' }}
                                    >
                                        <RenderItemContent item={item} />
                                        {/* Hover Outline for Interaction */}
                                        {!ghostItem && (
                                            <div className="absolute inset-0 border-2 border-blue-400 opacity-0 group-hover/item:opacity-100 rounded pointer-events-none transition-opacity print:hidden" />
                                        )}
                                    </div>
                                ))}

                                {/* Ghost Item */}
                                {ghostItem && (
                                    <div
                                        style={{ position: 'absolute', left: ghostPos.x, top: ghostPos.y, opacity: 0.6, pointerEvents: 'none', zIndex: 50 }}
                                    >
                                        {/* Spacing Guide Ring (1sq ft = 2x2 cells = 30px) */}
                                        {ghostItem.type === 'plant' && (
                                            <div className="absolute -inset-2 border border-green-400/50 rounded-full border-dashed animate-spin-slow pointer-events-none" style={{ width: CELL_SIZE * 2, height: CELL_SIZE * 2, left: -((CELL_SIZE * 2 - CELL_SIZE) / 2), top: -((CELL_SIZE * 2 - CELL_SIZE) / 2) }} />
                                        )}
                                        <RenderItemContent item={ghostItem} isGhost={true} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Trash Zone */}
                        <div
                            onClick={handleTrashClick}
                            className={`fixed bottom-8 right-8 z-50 w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg border-2 cursor-pointer print:hidden
                            ${ghostItem ? 'bg-red-50 border-red-400 text-red-500 scale-110 hover:bg-red-100 hover:scale-125' : 'bg-white border-gray-200 text-gray-400'}`}
                        >
                            <Trash2 size={32} />
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

function RenderItemContent({ item, isGhost }) {
    if (item.type === 'structure' || item.itemType === 'structure') {
        const w = item.width * CELLS_PER_FOOT * CELL_SIZE;
        const h = item.length * CELLS_PER_FOOT * CELL_SIZE;
        const isPlot = item.subType === 'garden-plot';
        const isRound = item.subType === 'raised-bed-round' || item.shape === 'circle';

        // Visual Swaps:
        // Raised Bed & Round Bed = Teal Border, Brown Dirt
        // Garden Plot = Dark Green Border, Brown Dirt
        const borderClass = isPlot ? 'border-green-800' : 'border-teal-400';

        const style = {
            width: w,
            height: h,
            backgroundImage: DIRT_PATTERN,
            backgroundSize: '20px 20px',
            backgroundColor: 'rgba(93, 64, 55, 0.4)' // Semi-transparent brown
        };

        return (
            <div
                style={style}
                className={`border-2 shadow-sm ${borderClass} opacity-90 ${isRound ? 'rounded-full' : 'rounded'} flex items-center justify-center`}
            >
                {/* Structure Label (Dimensions) */}
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
