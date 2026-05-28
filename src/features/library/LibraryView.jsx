import React, { useState } from 'react';
import { Plus, Pencil, Download } from 'lucide-react';
import { getAllPlants } from '../catalog/catalog.js';
import { filterPlants, deriveCategoryChips } from './libraryFilters.js';
import AddPlantForm from './AddPlantForm.jsx';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

function MonthStrip({ window }) {
    if (!window) return null;
    const active = new Set();
    const { start, end } = window;
    if (start <= end) {
        for (let i = start; i <= end; i++) active.add(i);
    } else {
        for (let i = start; i <= 11; i++) active.add(i);
        for (let i = 0; i <= end; i++) active.add(i);
    }
    return (
        <div className="flex gap-0.5 text-[10px] mt-1">
            {MONTHS.map((m, i) => (
                <span key={i}
                    className={`w-4 h-4 inline-flex items-center justify-center rounded-sm ${
                        active.has(i) ? 'bg-green-200 text-green-900' : 'bg-gray-100 text-gray-400'
                    }`}>{m}</span>
            ))}
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
    const allPlants = getAllPlants(plan);
    const categories = deriveCategoryChips(allPlants);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [formMode, setFormMode] = useState(null);

    const filtered = filterPlants(allPlants, { search, category });

    return (
        <div className="p-6">
            <header className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Library</h2>
                <div className="flex items-center gap-2">
                    <button
                        disabled={!plan?.customPlants?.length}
                        onClick={() => exportCustomPlants(plan.customPlants, plan?.garden?.name)}
                        title={plan?.customPlants?.length ? 'Export your custom plants as JSON' : 'No custom plants yet'}
                        className="inline-flex items-center gap-1 px-3 py-1.5 border rounded text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                        <Download size={14} /> Export my plants
                    </button>
                    <button onClick={() => setFormMode('create')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800">
                        <Plus size={16} /> Add a plant
                    </button>
                </div>
            </header>

            <div className="flex flex-col md:flex-row gap-3 mb-4">
                <input type="search" placeholder="Search plants by name or notes…"
                    value={search} onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 border rounded px-3 py-1.5 text-sm" />
                <div className="flex flex-wrap gap-1">
                    <Chip active={category === null} onClick={() => setCategory(null)}>all</Chip>
                    {categories.map((c) => (
                        <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map((p) => (
                    <article key={p.id}
                        className="border rounded p-3 bg-white hover:shadow-sm cursor-pointer"
                        onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-2xl">{p.icon}</div>
                                <div className="font-medium">{p.name}</div>
                                <div className="text-xs text-gray-600">{p.category}</div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                {p.isUserAdded && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded">yours</span>
                                )}
                                {p.isUserAdded && (
                                    <button onClick={(e) => { e.stopPropagation(); setFormMode({ editPlantId: p.id }); }}
                                        className="p-1 hover:bg-gray-100 rounded" title="Edit">
                                        <Pencil size={12} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-2">
                            <div>Spacing: {p.spacingInches}″ · DTM: {p.daysToMaturity}d</div>
                            <MonthStrip window={p.plantingWindow} />
                        </div>
                        {expandedId === p.id && (
                            <div className="mt-3 pt-3 border-t text-xs space-y-2">
                                {p.notes && <p className="text-gray-700">{p.notes}</p>}
                                {(p.goodNeighbors?.length > 0) && (
                                    <p><span className="font-medium text-green-700">Good with:</span> {p.goodNeighbors.join(', ')}</p>
                                )}
                                {(p.avoidNeighbors?.length > 0) && (
                                    <p><span className="font-medium text-red-700">Avoid:</span> {p.avoidNeighbors.join(', ')}</p>
                                )}
                                {p.sourceRefs?.length > 0 && (
                                    <details>
                                        <summary className="text-gray-500 cursor-pointer">Sources</summary>
                                        <ul className="list-disc pl-4 mt-1 text-gray-600">
                                            {p.sourceRefs.map((ref, i) => (
                                                <li key={i}>
                                                    <a href={ref.url} target="_blank" rel="noreferrer" className="underline">{ref.title}</a>
                                                    {ref.publisher && <span> — {ref.publisher}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                )}
                            </div>
                        )}
                    </article>
                ))}
                {filtered.length === 0 && (
                    <div className="col-span-full text-center text-sm text-gray-500 py-8">
                        No plants match. Try clearing filters or adding one.
                    </div>
                )}
            </div>

            {formMode === 'create' && (
                <AddPlantForm plan={plan} dispatch={dispatch} onClose={() => setFormMode(null)} />
            )}
            {formMode && formMode.editPlantId && (
                <AddPlantForm plan={plan} dispatch={dispatch} editPlantId={formMode.editPlantId}
                    onClose={() => setFormMode(null)} />
            )}
        </div>
    );
}

function Chip({ active, onClick, children }) {
    return (
        <button onClick={onClick}
            className={`text-xs px-2 py-1 rounded border ${
                active ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}>{children}</button>
    );
}
