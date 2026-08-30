import React, { useState } from 'react';
import { Plus, Sprout, X } from 'lucide-react';
import { actions } from '../plan/planReducer.js';
import { getPlantsById } from '../catalog/catalog.js';
import { computeAgenda } from '../agenda/agenda.js';

function summarizePlantings(plantings, plantsById) {
    if (plantings.length === 0) return 'No plantings yet';
    const counts = {};
    for (const p of plantings) {
        const name = plantsById[p.plantId]?.name ?? p.plantId;
        counts[name] = (counts[name] || 0) + p.quantity;
    }
    const entries = Object.entries(counts);
    const shown = entries.slice(0, 3).map(([n, q]) => `${q} ${n}`);
    const extra = entries.length - 3;
    return extra > 0 ? `${shown.join(' · ')} · +${extra} more` : shown.join(' · ');
}

const ACTION_LABELS = {
    start_indoors: 'Start indoors',
    direct_sow: 'Direct-sow',
    transplant: 'Transplant',
    harvest: 'Harvest',
};

const SHORT_DATE_FMT = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
});
function formatDateShort(iso) {
    const [y, m, d] = iso.split('-').map((s) => parseInt(s, 10));
    return SHORT_DATE_FMT.format(new Date(y, m - 1, d));
}

function buildNextTaskByBed(plan, plantsById) {
    const { overdue, thisWeek, nextWeek } = computeAgenda({
        plantings: plan.plantings,
        plantsById,
        beds: plan.beds,
        zone: plan.garden.zone,
        lastFrostDate: plan.garden.lastFrostDate,
    });
    const all = [...overdue, ...thisWeek, ...nextWeek];
    const plantingBedById = {};
    for (const p of plan.plantings) plantingBedById[p.id] = p.bedId;
    const map = {};
    for (const t of all) {
        const bedId = plantingBedById[t.plantingId];
        if (!bedId) continue;
        if (!map[bedId]) map[bedId] = t;
    }
    return map;
}

export default function BedsView({ plan, dispatch, onSelectBed }) {
    const [showAdd, setShowAdd] = useState(false);
    const plantsById = getPlantsById(plan);
    const nextTaskByBed = buildNextTaskByBed(plan, plantsById);

    const activeByBed = plan.beds.map((bed) => ({
        bed,
        active: plan.plantings.filter((p) => p.bedId === bed.id && p.status !== 'harvested' && p.status !== 'removed'),
    }));

    if (plan.beds.length === 0) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-center">
                <Sprout size={48} className="text-green-700 mb-4" />
                <h2 className="text-xl font-semibold text-gray-800 mb-2">No beds yet</h2>
                <p className="text-sm text-gray-600 mb-6">Create your first bed to start tracking plantings.</p>
                <button onClick={() => setShowAdd(true)}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800">
                    <Plus size={16} /> Add bed
                </button>
                {showAdd && <AddBedModal dispatch={dispatch} onClose={() => setShowAdd(false)} />}
            </div>
        );
    }

    return (
        <div className="p-6">
            <header className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Beds</h2>
                <button onClick={() => setShowAdd(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800">
                    <Plus size={16} /> Add bed
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {activeByBed.map(({ bed, active }) => {
                    const next = nextTaskByBed[bed.id];
                    return (
                        <button key={bed.id} onClick={() => onSelectBed(bed.id)}
                            className="text-left border rounded p-4 bg-white hover:shadow-sm">
                            <div className="font-medium">{bed.name}</div>
                            <div className="text-xs text-gray-600">{bed.widthFt}′ × {bed.lengthFt}′</div>
                            <div className="text-sm mt-2">{summarizePlantings(active, plantsById)}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                {next
                                    ? `Next: ${ACTION_LABELS[next.action] ?? next.action} ${next.plantName} — ${formatDateShort(next.date)}`
                                    : 'Next: (nothing scheduled)'}
                            </div>
                        </button>
                    );
                })}
            </div>

            {showAdd && <AddBedModal dispatch={dispatch} onClose={() => setShowAdd(false)} />}
        </div>
    );
}

function AddBedModal({ dispatch, onClose }) {
    const [name, setName] = useState('');
    const [widthFt, setWidthFt] = useState('4');
    const [lengthFt, setLengthFt] = useState('8');
    const [errors, setErrors] = useState({});

    function submit(e) {
        e.preventDefault();
        const next = {};
        if (!name.trim()) next.name = 'Bed name is required.';
        if (!Number.isFinite(+widthFt) || +widthFt <= 0) next.widthFt = 'Must be > 0.';
        if (!Number.isFinite(+lengthFt) || +lengthFt <= 0) next.lengthFt = 'Must be > 0.';
        setErrors(next);
        if (Object.keys(next).length > 0) return;

        dispatch(actions.addBed({
            id: crypto.randomUUID(),
            name: name.trim(),
            widthFt: +widthFt,
            lengthFt: +lengthFt,
        }));
        onClose();
    }

    return (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white rounded shadow-lg p-4 w-80" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Add bed</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={16} /></button>
                </header>
                <form onSubmit={submit} className="space-y-3 text-sm">
                    <label className="block">
                        <span className="block text-xs font-medium text-gray-700 mb-1">Name</span>
                        <input value={name} onChange={(e) => setName(e.target.value)}
                            className="border rounded px-2 py-1 w-full" autoFocus />
                        {errors.name && <span className="text-xs text-red-600">{errors.name}</span>}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="block text-xs font-medium text-gray-700 mb-1">Width (ft)</span>
                            <input type="number" min="0.5" step="0.5" value={widthFt}
                                onChange={(e) => setWidthFt(e.target.value)}
                                className="border rounded px-2 py-1 w-full" />
                            {errors.widthFt && <span className="text-xs text-red-600">{errors.widthFt}</span>}
                        </label>
                        <label className="block">
                            <span className="block text-xs font-medium text-gray-700 mb-1">Length (ft)</span>
                            <input type="number" min="0.5" step="0.5" value={lengthFt}
                                onChange={(e) => setLengthFt(e.target.value)}
                                className="border rounded px-2 py-1 w-full" />
                            {errors.lengthFt && <span className="text-xs text-red-600">{errors.lengthFt}</span>}
                        </label>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t">
                        <button type="button" onClick={onClose}
                            className="px-3 py-1.5 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="submit"
                            className="px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800">Add</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
