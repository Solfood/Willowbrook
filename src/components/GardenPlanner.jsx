import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Undo, Redo, Trash2, MousePointer2, Crosshair, Menu, Save, Upload, Plus } from 'lucide-react';
import Sidebar, { getPlantImage } from './Sidebar';

const CELL_SIZE = 15; // px
const CELLS_PER_FOOT = 2; // 0.5 ft per cell
const GRID_SIZE = CELL_SIZE; // Grid snap size

// Dirt pattern
const DIRT_PATTERN = `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%235D4037' fill-opacity='0.1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E")`;

// Structure Internal Grid Pattern (0.5ft lines)
const STRUCTURE_GRID_PATTERN = `linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)`;

export default function GardenPlanner({ width, length, onNewGarden }) {
    const [items, setItems] = useState([]);
    // ghostItem: { type, subType, itemId, width, length, ... } - item currently "held" by cursor
    const [ghostItem, setGhostItem] = useState(null);
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 }); // Raw cursor position
    const [isTouch, setIsTouch] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const gridRef = useRef(null);

    // History Management
    const [history, setHistory] = useState([[]]);
    const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);

    const pushToHistory = useCallback((newItems) => {
        const newHistory = history.slice(0, currentHistoryIndex + 1);
        newHistory.push(newItems);
        setHistory(newHistory);
        setCurrentHistoryIndex(newHistory.length - 1);
        setItems(newItems);
    }, [history, currentHistoryIndex]);

    const undo = () => {
        if (currentHistoryIndex > 0) {
            const prevIndex = currentHistoryIndex - 1;
            setCurrentHistoryIndex(prevIndex);
            setItems(history[prevIndex]);
            setGhostItem(null); // Cancel any active action
        }
    };

    const redo = () => {
        if (currentHistoryIndex < history.length - 1) {
            const nextIndex = currentHistoryIndex + 1;
            setCurrentHistoryIndex(nextIndex);
            setItems(history[nextIndex]);
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

    // Global mouse tracker for ghost positioning relative to grid
    const handleMouseMove = (e) => {
        if (!gridRef.current) return;
        setIsTouch(false);
        const rect = gridRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setCursorPos({ x, y });
    };

    const getGhostPosition = () => {
        if (!ghostItem) return { x: 0, y: 0 };
        const itemW = ghostItem.type === 'structure' ? ghostItem.width * CELLS_PER_FOOT * CELL_SIZE : CELL_SIZE;
        const itemH = ghostItem.type === 'structure' ? ghostItem.length * CELLS_PER_FOOT * CELL_SIZE : CELL_SIZE;
        const yOffset = isTouch ? -60 : 0;
        const targetX = cursorPos.x - (itemW / 2);
        const targetY = cursorPos.y - (itemH / 2) + yOffset;
        return { x: Math.round(targetX / GRID_SIZE) * GRID_SIZE, y: Math.round(targetY / GRID_SIZE) * GRID_SIZE };
    };

    const ghostPos = getGhostPosition();

    const handleGridClick = (e) => {
        if (!ghostItem) return;

        // Check bounds
        const gridWidthPx = width * CELLS_PER_FOOT * CELL_SIZE;
        const gridHeightPx = length * CELLS_PER_FOOT * CELL_SIZE;

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
        const remainingItems = items.filter(i => i.id !== item.id);
        setItems(remainingItems); // Visual remove from grid immediately
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
        const data = { width, length, items };
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
        const filename = prompt("Enter a name for your garden plan:", "willowbrook-garden");
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
            try {
                const data = JSON.parse(event.target.result);
                if (data.items) pushToHistory(data.items);
            } catch (err) { alert("Failed to load."); }
        };
        reader.readAsText(file);
    };

    useEffect(() => {
        // Global key listener for Cancel (Esc)
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (ghostItem && !ghostItem.isNew) {
                    setItems(history[currentHistoryIndex]); // Revert to last committed state
                }
                setGhostItem(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [ghostItem, history, currentHistoryIndex, items]);

    // Touch Support
    const handleTouchMove = (e) => {
        if (!gridRef.current) return;
        setIsTouch(true);
        const touch = e.touches[0];
        const rect = gridRef.current.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        setCursorPos({ x, y });

        // Prevent scrolling while dragging ghost
        if (ghostItem) e.preventDefault();
    };

    const handleTouchEnd = (e) => {
        if (ghostItem) {
            handleGridClick(e);
        }
    };

    const gridWidthPx = width * CELLS_PER_FOOT * CELL_SIZE;
    const gridHeightPx = length * CELLS_PER_FOOT * CELL_SIZE;

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

            <div className="flex flex-1 overflow-hidden"
                onMouseMove={handleMouseMove}
                onTouchMove={handleTouchMove}
            >
                {/* Pass items to Sidebar for Shopping List */}
                <Sidebar
                    onItemSelect={handleSidebarSelect}
                    items={items}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />

                <main className="flex-1 overflow-auto bg-stone-100 p-4 md:p-8 flex shadow-inner relative cursor-crosshair">
                    <div className="m-auto relative group">
                        {/* Main Grid Area */}
                        <div
                            ref={gridRef}
                            onClick={handleGridClick}
                            onTouchEnd={handleTouchEnd}
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
                            {items.sort((a, b) => (a.type === 'structure' ? -1 : 1)).map(item => (
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

        // Visual Refinement:
        // 1. Remove STRUCTURE_GRID_PATTERN
        // 2. Use rgba opacity for background so main grid shows through
        const style = {
            width: w,
            height: h,
            backgroundImage: DIRT_PATTERN,
            backgroundSize: `20px 20px`,
            backgroundColor: 'rgba(93, 64, 55, 0.4)' // Semi-transparent brown
        };

        return (
            <div
                style={style}
                // Reduced border thickness to border-2 (approx 2px)
                // Apply rounded-full if round, otherwise rounded
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
