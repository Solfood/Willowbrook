import React, { useState, useMemo } from 'react';
import { Leaf, Box, PencilRuler, ClipboardList, X } from 'lucide-react';

const PLANT_CATEGORIES = {
    'vegetables': [
        { id: 'tomato', name: 'Tomato', icon: '🍅', color: 'bg-red-500' },
        { id: 'carrot', name: 'Carrot', icon: '🥕', color: 'bg-orange-500' },
        { id: 'lettuce', name: 'Lettuce', icon: '🥬', color: 'bg-green-400' },
        { id: 'pepper', name: 'Pepper', icon: '🫑', color: 'bg-green-600' },
        { id: 'onion', name: 'Onion', icon: '🧅', color: 'bg-yellow-600' },
        { id: 'broccoli', name: 'Broccoli', icon: '🥦', color: 'bg-green-700' },
        { id: 'potato', name: 'Potato', icon: '🥔', color: 'bg-yellow-700' },
        { id: 'bean', name: 'Bean', icon: '🫘', color: 'bg-emerald-600' },
        { id: 'radish', name: 'Radish', icon: '🔴', color: 'bg-pink-500' },
        { id: 'spinach', name: 'Spinach', icon: '🍃', color: 'bg-green-800' },
        { id: 'zucchini', name: 'Zucchini', icon: '🥒', color: 'bg-green-500' },
        { id: 'corn', name: 'Corn', icon: '🌽', color: 'bg-yellow-400' },
        { id: 'eggplant', name: 'Eggplant', icon: '🍆', color: 'bg-purple-700' },
        { id: 'beet', name: 'Beet', icon: '🍠', color: 'bg-rose-800' },
        { id: 'garlic', name: 'Garlic', icon: '🧄', color: 'bg-stone-200' },
    ],
    'herbs': [
        { id: 'basil', name: 'Basil', icon: '🌿', color: 'bg-green-500' },
        { id: 'parsley', name: 'Parsley', icon: '🌿', color: 'bg-green-600' },
        { id: 'mint', name: 'Mint', icon: '🍃', color: 'bg-emerald-400' },
        { id: 'rosemary', name: 'Rosemary', icon: '🌲', color: 'bg-green-800' },
        { id: 'thyme', name: 'Thyme', icon: '🌿', color: 'bg-stone-500' },
        { id: 'lavender', name: 'Lavender', icon: '🪻', color: 'bg-purple-400' },
    ],
    'flowers': [
        { id: 'sunflower', name: 'Sunflower', icon: '🌻', color: 'bg-yellow-500' },
        { id: 'marigold', name: 'Marigold', icon: '🌼', color: 'bg-orange-400' },
        { id: 'daisy', name: 'Daisy', icon: '🌼', color: 'bg-white' },
        { id: 'tulip', name: 'Tulip', icon: '🌷', color: 'bg-pink-400' },
    ],
    'fruits': [
        { id: 'strawberry', name: 'Strawberry', icon: '🍓', color: 'bg-red-600' },
        { id: 'blueberry', name: 'Blueberry', icon: '🫐', color: 'bg-blue-600' },
        { id: 'raspberry', name: 'Raspberry', icon: '🍇', color: 'bg-rose-500' },
    ]
};

const STRUCTURES = [
    { id: 'raised-bed', name: 'Raised Bed', type: 'structure', width: 4, length: 4, subType: 'raised-bed' },
    { id: 'raised-bed-rect', name: 'Raised Bed (Long)', type: 'structure', width: 2, length: 8, subType: 'raised-bed' },
    { id: 'raised-bed-round', name: 'Round Raised Bed', type: 'structure', width: 4, length: 4, subType: 'raised-bed-round' },
    { id: 'garden-plot', name: 'Garden Plot', type: 'structure', width: 10, length: 10, subType: 'garden-plot' },
    { id: 'garden-plot-small', name: 'Small Plot', type: 'structure', width: 4, length: 8, subType: 'garden-plot' },
];

export const getPlantImage = (id) => {
    // Helper to find icon
    for (const cat in PLANT_CATEGORIES) {
        const found = PLANT_CATEGORIES[cat].find(p => p.id === id);
        if (found) return `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${found.icon}</text></svg>`;
    }
    return '';
};


export default function Sidebar({ onItemSelect, items = [], isOpen, onClose }) {
    const [tab, setTab] = useState('plants'); // 'plants' | 'structures' | 'list'
    const [subCat, setSubCat] = useState('vegetables');

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
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                bg-white shadow-lg flex flex-col z-30 print:hidden
                fixed md:static inset-y-0 left-0 w-64 transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="flex border-b relative">
                    <button
                        onClick={() => setTab('plants')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1 ${tab === 'plants' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Leaf size={16} /> Plants
                    </button>
                    <button
                        onClick={() => setTab('structures')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1 ${tab === 'structures' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Box size={16} /> Structures
                    </button>
                    <button
                        onClick={() => setTab('list')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1 ${tab === 'list' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <ClipboardList size={16} /> List
                    </button>

                    {/* Mobile Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute right-0 top-0 p-2 md:hidden text-gray-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {tab === 'plants' && (
                        <>
                            {/* Categories */}
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-thin">
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
                            <div className="grid grid-cols-2 gap-3">
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
                                <div
                                    key={item.id}
                                    className="p-3 rounded border border-gray-200 hover:border-amber-300 hover:bg-amber-50 cursor-pointer"
                                    onClick={() => { onItemSelect(item); onClose(); }}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-medium text-gray-800 text-sm">{item.name}</span>
                                        <Box size={14} className="text-amber-600" />
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        Dimensions: {item.width}' x {item.length}'
                                    </div>
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
        </>
    );
}
