import React, { useMemo, useState } from 'react';
import { Leaf, Box, ClipboardList } from 'lucide-react';
import { getPlantImage, PLANT_CATEGORIES, STRUCTURES } from '../features/catalog/catalog';

export default function Sidebar({ onItemSelect, items = [] }) {
    const [tab, setTab] = useState('plants');
    const [subCat, setSubCat] = useState('vegetables');
    const [plantQuery, setPlantQuery] = useState('');
    const [structureSizes, setStructureSizes] = useState(() => {
        const byId = {};
        STRUCTURES.forEach((structure) => {
            byId[structure.id] = { width: structure.width, length: structure.length };
        });
        return byId;
    });

    const shoppingList = useMemo(() => {
        const list = {};
        items.forEach((item) => {
            const key = `${item.type}:${item.name}:${item.width || ''}:${item.length || ''}`;
            if (!list[key]) {
                list[key] = { ...item, count: 0 };
            }
            list[key].count += 1;
        });
        return Object.values(list).sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));
    }, [items]);

    const filteredPlants = useMemo(() => {
        const query = plantQuery.trim().toLowerCase();
        const plants = PLANT_CATEGORIES[subCat] || [];
        if (!query) return plants;
        return plants.filter((plant) => plant.name.toLowerCase().includes(query));
    }, [subCat, plantQuery]);

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
        <aside className="w-[320px] bg-white border-r border-gray-200 shadow-sm flex flex-col print:hidden">
            <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-800">Drawing Tools</h2>
                <p className="text-xs text-gray-500 mt-1">Select plants or structures, then place on the canvas.</p>
            </div>

            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setTab('plants')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1 ${tab === 'plants' ? 'text-green-700 border-b-2 border-green-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Leaf size={16} /> Plants
                </button>
                <button
                    onClick={() => setTab('structures')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1 ${tab === 'structures' ? 'text-amber-700 border-b-2 border-amber-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Box size={16} /> Structures
                </button>
                <button
                    onClick={() => setTab('list')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1 ${tab === 'list' ? 'text-blue-700 border-b-2 border-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <ClipboardList size={16} /> List
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {tab === 'plants' && (
                    <>
                        <div className="mb-3">
                            <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
                                Name Filter
                            </label>
                            <input
                                value={plantQuery}
                                onChange={(e) => setPlantQuery(e.target.value)}
                                placeholder="Search plants..."
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                            />
                        </div>

                        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                            {Object.keys(PLANT_CATEGORIES).map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSubCat(cat)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap capitalize ${subCat === cat ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {filteredPlants.map((plant) => (
                                <button
                                    key={plant.id}
                                    type="button"
                                    className="flex flex-col items-center p-2 rounded border border-gray-100 hover:border-green-300 hover:bg-green-50 transition-colors"
                                    onClick={() => onItemSelect({ ...plant, type: 'plant' })}
                                >
                                    <div className="w-8 h-8 flex items-center justify-center text-2xl mb-1">{plant.icon}</div>
                                    <span className="text-xs font-medium text-gray-700">{plant.name}</span>
                                    <span className="text-[10px] text-gray-500 mt-0.5">Spacing {plant.spacingInches}"</span>
                                </button>
                            ))}
                        </div>
                        {filteredPlants.length === 0 && (
                            <p className="text-xs text-gray-500 mt-3 italic">No plants match that filter.</p>
                        )}
                    </>
                )}

                {tab === 'structures' && (
                    <div className="space-y-3">
                        {STRUCTURES.map((item) => {
                            const size = structureSizes[item.id] || { width: item.width, length: item.length };
                            return (
                                <div
                                    key={item.id}
                                    className="p-3 rounded border border-gray-200 hover:border-amber-300 hover:bg-amber-50 cursor-pointer"
                                    onClick={() => onItemSelect({ ...item, width: size.width, length: size.length })}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium text-gray-800 text-sm">{item.name}</span>
                                        <Box size={14} className="text-amber-600" />
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mt-2 text-xs">
                                        <SizeStepper
                                            label="W"
                                            value={size.width}
                                            onDec={(e) => { e.stopPropagation(); updateStructureSize(item.id, 'width', -1); }}
                                            onInc={(e) => { e.stopPropagation(); updateStructureSize(item.id, 'width', 1); }}
                                        />
                                        <SizeStepper
                                            label="L"
                                            value={size.length}
                                            onDec={(e) => { e.stopPropagation(); updateStructureSize(item.id, 'length', -1); }}
                                            onInc={(e) => { e.stopPropagation(); updateStructureSize(item.id, 'length', 1); }}
                                        />
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2">Click to place ({size.width}' x {size.length}')</div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {tab === 'list' && (
                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-800 border-b pb-2">Plant List</h3>
                        {shoppingList.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">Your plan is empty.</p>
                        ) : (
                            shoppingList.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded border border-gray-100">
                                    <div className="flex items-center gap-2">
                                        {item.type === 'structure' ? (
                                            <div className={`w-4 h-4 rounded-sm ${item.subType === 'garden-plot' ? 'bg-green-800' : 'bg-teal-400'}`} />
                                        ) : (
                                            <img src={getPlantImage(item.itemId || item.id)} alt="" className="w-5 h-5 object-contain" />
                                        )}
                                        <span className="font-medium text-gray-700">
                                            {item.name}
                                            {item.type === 'structure' && (
                                                <span className="text-xs text-gray-500 ml-1">({item.width}'x{item.length}')</span>
                                            )}
                                        </span>
                                    </div>
                                    <span className="font-bold text-gray-900">x{item.count}</span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}

function SizeStepper({ label, value, onDec, onInc }) {
    return (
        <div className="flex items-center gap-1">
            <span className="text-gray-500">{label}</span>
            <button onClick={onDec} className="px-2 py-1 border rounded text-gray-700 bg-white">-</button>
            <span className="min-w-[28px] text-center font-semibold text-gray-700">{value}'</span>
            <button onClick={onInc} className="px-2 py-1 border rounded text-gray-700 bg-white">+</button>
        </div>
    );
}
