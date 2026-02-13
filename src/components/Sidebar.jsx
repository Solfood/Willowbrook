import React, { useState, useMemo } from 'react';
import { Leaf, Box, PencilRuler, ClipboardList } from 'lucide-react';

// Import SVG assets (reusing imports from previous file pattern)
import beet from '../assets/beet.svg';
import broccoli from '../assets/broccoli.svg';
import carrot from '../assets/carrot.svg';
import cucumber from '../assets/cucumber.svg';
import garlic from '../assets/garlic.svg';
import leek from '../assets/leek.svg';
import lettuce from '../assets/lettuce.svg';
import onion from '../assets/onion.svg';
import peas from '../assets/peas.svg';
import pepper from '../assets/pepper.svg';
import radish from '../assets/radish.svg';
import spinach from '../assets/spinach.svg';
import strawberry from '../assets/strawberry.svg';
import tomato from '../assets/tomato.svg';

const PLANT_TYPES = [
    { id: 'beet', name: 'Beet', src: beet },
    { id: 'broccoli', name: 'Broccoli', src: broccoli },
    { id: 'carrot', name: 'Carrot', src: carrot },
    { id: 'cucumber', name: 'Cucumber', src: cucumber },
    { id: 'garlic', name: 'Garlic', src: garlic },
    { id: 'leek', name: 'Leek', src: leek },
    { id: 'lettuce', name: 'Lettuce', src: lettuce },
    { id: 'onion', name: 'Onion', src: onion },
    { id: 'peas', name: 'Peas', src: peas },
    { id: 'pepper', name: 'Pepper', src: pepper },
    { id: 'radish', name: 'Radish', src: radish },
    { id: 'spinach', name: 'Spinach', src: spinach },
    { id: 'strawberry', name: 'Strawberry', src: strawberry },
    { id: 'tomato', name: 'Tomato', src: tomato },
];

const STRUCTURE_TYPES = [
    { id: 'raised-bed', name: 'Raised Bed', type: 'structure', subType: 'raised-bed' },
    { id: 'raised-bed-round', name: 'Round Raised Bed', type: 'structure', subType: 'raised-bed-round', shape: 'circle' },
    { id: 'garden-plot', name: 'Garden Plot', type: 'structure', subType: 'garden-plot' },
];

export function getPlantImage(id) {
    return PLANT_TYPES.find(p => p.id === id)?.src;
}

export default function Sidebar({ onItemSelect, items = [] }) {
    const [tab, setTab] = useState('plants'); // 'plants' | 'structures' | 'list'
    const [structureWidth, setStructureWidth] = useState(2);
    const [structureLength, setStructureLength] = useState(4);

    const handleDimensionChange = (setter) => (e) => {
        const val = e.target.value;
        if (val === '') {
            setter('');
            return;
        }
        const num = parseInt(val, 10);
        if (!isNaN(num)) {
            setter(num);
        }
    };

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

    return (
        <aside className="w-64 bg-white shadow-lg flex flex-col z-20 print:hidden">
            <div className="flex border-b">
                <button
                    onClick={() => setTab('plants')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1 ${tab === 'plants' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Leaf size={16} /> Plants
                </button>
                <button
                    onClick={() => setTab('structures')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1 ${tab === 'structures' ? 'text-amber-800 border-b-2 border-amber-800' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Box size={16} /> Structures
                </button>
                <button
                    onClick={() => setTab('list')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1 ${tab === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <ClipboardList size={16} /> List
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {tab === 'plants' && (
                    <div className="grid grid-cols-2 gap-3">
                        {PLANT_TYPES.map(plant => (
                            <SidebarItem
                                key={plant.id}
                                item={plant}
                                type="plant"
                                onClick={() => onItemSelect({ type: 'plant', ...plant })}
                            />
                        ))}
                    </div>
                )}

                {tab === 'structures' && (
                    <div className="space-y-6">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <PencilRuler size={16} /> Dimensions
                            </h3>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Width (ft)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={structureWidth}
                                        onChange={handleDimensionChange(setStructureWidth)}
                                        className="w-full px-2 py-1 text-sm border rounded"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">Length (ft)</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={structureLength}
                                        onChange={handleDimensionChange(setStructureLength)}
                                        className="w-full px-2 py-1 text-sm border rounded"
                                    />
                                </div>
                            </div>
                        </div>

                        {STRUCTURE_TYPES.map(struct => (
                            <div key={struct.id}>
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{struct.name}</h3>
                                <SidebarItem
                                    item={{ ...struct, width: Number(structureWidth) || 1, length: Number(structureLength) || 1 }}
                                    type="structure"
                                    subType={struct.subType}
                                    shape={struct.shape}
                                    onClick={() => onItemSelect({
                                        type: 'structure',
                                        subType: struct.subType,
                                        width: Number(structureWidth) || 1,
                                        length: Number(structureLength) || 1,
                                        shape: struct.shape
                                    })}
                                />
                            </div>
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
    );
}

function SidebarItem({ item, type, subType, shape, onClick }) {
    if (type === 'structure') {
        const isPlot = subType === 'garden-plot';
        const isRound = subType === 'raised-bed-round' || shape === 'circle';

        // Sidebar preview small boxes
        const borderColor = isPlot ? 'border-green-800' : 'border-teal-400';
        const bgColor = 'bg-[#5D4037]';

        return (
            <div
                onClick={onClick}
                className="p-3 border rounded-lg cursor-pointer hover:bg-green-50 hover:border-green-200 flex items-center gap-3 transition-colors bg-white shadow-sm"
            >
                <div className={`w-8 h-8 border-4 ${borderColor} ${bgColor} opacity-80 ${isRound ? 'rounded-full' : 'rounded'}`} />
                <div>
                    <div className="font-medium text-sm text-gray-800">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.width}ft x {item.length}ft</div>
                </div>
            </div>
        )
    }

    return (
        <div
            onClick={onClick}
            className="p-2 rounded cursor-pointer flex flex-col items-center border border-transparent transition-colors hover:bg-green-50 hover:border-green-200 hover:shadow-sm"
        >
            <img src={item.src} alt={item.name} className="w-10 h-10 mb-1 object-contain pointer-events-none" />
            <span className="text-xs font-medium text-gray-600">{item.name}</span>
        </div>
    );
}
