import React, { useState, useMemo } from 'react';
import { Leaf, Box, ClipboardList, X } from 'lucide-react';
import { getPlantImage, PLANT_CATEGORIES, STRUCTURES } from '../features/catalog/catalog';


export default function Sidebar({ onItemSelect, items = [], isOpen, onClose }) {
    const [tab, setTab] = useState('plants'); // 'plants' | 'structures' | 'list'
    const [subCat, setSubCat] = useState('vegetables');
    const [structureSizes, setStructureSizes] = useState(() => {
        const byId = {};
        STRUCTURES.forEach((structure) => {
            byId[structure.id] = { width: structure.width, length: structure.length };
        });
        return byId;
    });

    // Calculate Shopping List
    const shoppingList = useMemo(() => {
        const list = {};
        items.forEach(item => {
            const name = item.name;
            if (!list[name]) {
                list[name] = { ...item, count: 0 };
            }
            list[name].count += 1;
        });
        return Object.values(list).sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
    }, [items]);

    const updateStructureSize = (id, key, delta) => {
        setStructureSizes((prev) => {
            const current = prev[id] || { width: 1, length: 1 };
            const next = {
                ...current,
                [key]: Math.max(1, Math.min(50, current[key] + delta)),
            };
            return { ...prev, [id]: next };
        });
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/45 z-20 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                bg-white shadow-lg flex flex-col z-30 print:hidden
                fixed md:static transition-transform duration-300 ease-in-out
                md:inset-y-0 md:left-0 md:w-64
                inset-x-0 bottom-0 top-24 rounded-t-2xl md:rounded-none
                ${isOpen ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:-translate-x-full md:translate-y-0'}
            `}>
                <div className="flex md:hidden items-center justify-between px-4 pt-3 pb-2 border-b">
                    <h2 className="text-sm font-semibold text-gray-800">Catalog</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 rounded hover:bg-gray-100"
                        aria-label="Close catalog"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex border-b">
                    <button
                        onClick={() => setTab('plants')}
                        className={`flex-1 py-3 text-xs md:text-sm font-medium flex items-center justify-center gap-1 ${tab === 'plants' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Leaf size={16} /> Plants
                    </button>
                    <button
                        onClick={() => setTab('structures')}
                        className={`flex-1 py-3 text-xs md:text-sm font-medium flex items-center justify-center gap-1 ${tab === 'structures' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Box size={16} /> Structures
                    </button>
                    <button
                        onClick={() => setTab('list')}
                        className={`flex-1 py-3 text-xs md:text-sm font-medium flex items-center justify-center gap-1 ${tab === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <ClipboardList size={16} /> List
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 pb-28 md:pb-4">
                    {tab === 'plants' && (
                        <>
                            {/* Categories */}
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                {Object.keys(PLANT_CATEGORIES).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSubCat(cat)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap capitalize ${subCat === cat ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                                {PLANT_CATEGORIES[subCat].map(plant => (
                                    <div
                                        key={plant.id}
                                        draggable
                                        className="flex flex-col items-center p-2 rounded border border-gray-100 hover:border-green-300 hover:bg-green-50 cursor-grab active:cursor-grabbing transition-colors"
                                        onClick={() => { onItemSelect({ ...plant, type: 'plant' }); onClose(); }} // Close sidebar on mobile select
                                    >
                                        <div className="w-8 h-8 flex items-center justify-center text-2xl mb-1 select-none">
                                            {plant.icon}
                                        </div>
                                        <span className="text-xs font-medium text-gray-700">{plant.name}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {tab === 'structures' && (
                        <div className="space-y-3">
                            {STRUCTURES.map(item => (
                                (() => {
                                    const size = structureSizes[item.id] || { width: item.width, length: item.length };
                                    return (
                                <div
                                    key={item.id}
                                    className="p-3 rounded border border-gray-200 hover:border-amber-300 hover:bg-amber-50 cursor-pointer"
                                    onClick={() => { onItemSelect({ ...item, width: size.width, length: size.length }); onClose(); }}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium text-gray-800 text-sm">{item.name}</span>
                                        <Box size={14} className="text-amber-600" />
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-2 text-xs">
                                        <div className="flex items-center gap-1">
                                            <span className="text-gray-500">W</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); updateStructureSize(item.id, 'width', -1); }}
                                                className="px-2 py-1 border rounded text-gray-700 bg-white"
                                            >
                                                -
                                            </button>
                                            <span className="min-w-[28px] text-center font-semibold text-gray-700">{size.width}'</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); updateStructureSize(item.id, 'width', 1); }}
                                                className="px-2 py-1 border rounded text-gray-700 bg-white"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-gray-500">L</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); updateStructureSize(item.id, 'length', -1); }}
                                                className="px-2 py-1 border rounded text-gray-700 bg-white"
                                            >
                                                -
                                            </button>
                                            <span className="min-w-[28px] text-center font-semibold text-gray-700">{size.length}'</span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); updateStructureSize(item.id, 'length', 1); }}
                                                className="px-2 py-1 border rounded text-gray-700 bg-white"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2">
                                        Tap card to place ({size.width}' x {size.length}')
                                    </div>
                                </div>
                                    );
                                })()
                            ))}
                        </div>
                    )}

                    {tab === 'list' && (
                        <div className="space-y-4">
                            <h3 className="font-bold text-gray-800 border-b pb-2">Shopping List</h3>
                            {shoppingList.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">Your garden is empty.</p>
                            ) : (
                                <div className="space-y-2">
                                    {shoppingList.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded border border-gray-100">
                                            <div className="flex items-center gap-2">
                                                {item.type === 'structure' ? (
                                                    <div className={`w-4 h-4 rounded-sm ${item.subType === 'garden-plot' ? 'bg-green-800' : 'bg-teal-400'}`}></div>
                                                ) : (
                                                    <img src={getPlantImage(item.itemId || item.id)} alt="" className="w-5 h-5 object-contain" />
                                                )}
                                                <span className="font-medium text-gray-700">
                                                    {item.name}
                                                    {item.type === 'structure' && <span className="text-xs text-gray-500 ml-1">({item.width}'x{item.length}')</span>}
                                                </span>
                                            </div>
                                            <span className="font-bold text-gray-900">x{item.count}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="mt-8 p-3 bg-blue-50 rounded text-xs text-blue-700">
                                <strong>Tip:</strong> Use the browser's <em>Print</em> feature (Cmd/Ctrl+P) to print this plan or save as PDF!
                            </div>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
