import React, { useState, useMemo } from 'react';
import { Copy, Download } from 'lucide-react';
import { getAllPlants } from '../catalog/catalog.js';
import { filterPlants, getCategories } from './libraryFilters.js';
import { actions } from '../plan/planReducer.js';

function newId() {
    return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function PlantCard({ plant, isCustom, onClone }) {
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col gap-1.5 relative">
            <div className="flex items-start gap-2">
                <span className="text-2xl leading-none">{plant.icon || '🌿'}</span>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm leading-snug">{plant.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{plant.category}</p>
                </div>
                {isCustom && (
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                        Mine
                    </span>
                )}
            </div>
            {plant.notes && (
                <p className="text-xs text-gray-500 line-clamp-2">{plant.notes}</p>
            )}
            {!isCustom && (
                <button
                    onClick={() => onClone(plant)}
                    className="mt-auto self-start flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                    <Copy size={11} /> Clone to My Plants
                </button>
            )}
        </div>
    );
}

function exportCustomPlants(customPlants, gardenName) {
    const payload = JSON.stringify(customPlants, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(gardenName || 'garden').replace(/\s+/g, '-').toLowerCase()}-my-plants.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export default function LibraryView({ plan, dispatch }) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('');

    const allPlants = useMemo(() => getAllPlants(plan), [plan]);
    const categories = useMemo(() => getCategories(allPlants), [allPlants]);
    const filtered = useMemo(
        () => filterPlants(allPlants, { query, category: category || null }),
        [allPlants, query, category],
    );

    const customIds = useMemo(
        () => new Set((plan?.customPlants || []).map((p) => p.id)),
        [plan],
    );

    function handleClone(plant) {
        const clone = { ...plant, id: newId(), isUserAdded: true, clonedFrom: plant.id };
        dispatch(actions.addCustomPlant(clone));
    }

    const hasCustom = (plan?.customPlants || []).length > 0;

    return (
        <div className="p-4 flex flex-col gap-4 h-full">
            <div className="flex flex-wrap items-center gap-2">
                <input
                    type="search"
                    placeholder="Search plants…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="border border-gray-300 rounded px-2.5 py-1.5 text-sm flex-1 min-w-48 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                </select>
                <button
                    disabled={!hasCustom}
                    onClick={() => exportCustomPlants(plan.customPlants, plan?.garden?.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={hasCustom ? 'Export your custom plants as JSON' : 'No custom plants yet'}
                >
                    <Download size={14} /> Export my plants
                </button>
            </div>

            {filtered.length === 0 ? (
                <p className="text-sm text-gray-500 mt-4">No plants match your search.</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-auto pb-2">
                    {filtered.map((plant) => (
                        <PlantCard
                            key={plant.id}
                            plant={plant}
                            isCustom={customIds.has(plant.id)}
                            onClone={handleClone}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
