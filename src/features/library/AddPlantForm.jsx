import React, { useState } from 'react';
import { X } from 'lucide-react';
import { actions } from '../plan/planReducer.js';
import { getAllPlants } from '../catalog/catalog.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function blankForm() {
    return {
        name: '',
        category: '',
        icon: '🌱',
        spacingInches: 12,
        daysToMaturity: 60,
        startIndoorsWeeksBeforeLastFrost: 0,
        plantingWindowStart: 3,
        plantingWindowEnd: 8,
        goodNeighbors: [],
        avoidNeighbors: [],
        notes: '',
    };
}

function formFromPlant(plant) {
    return {
        name: plant.name ?? '',
        category: plant.category ?? '',
        icon: plant.icon ?? '🌱',
        spacingInches: plant.spacingInches ?? 12,
        daysToMaturity: plant.daysToMaturity ?? 60,
        startIndoorsWeeksBeforeLastFrost: plant.startIndoorsWeeksBeforeLastFrost ?? 0,
        plantingWindowStart: plant.plantingWindow?.start ?? 3,
        plantingWindowEnd: plant.plantingWindow?.end ?? 8,
        goodNeighbors: plant.goodNeighbors ?? [],
        avoidNeighbors: plant.avoidNeighbors ?? [],
        notes: plant.notes ?? '',
    };
}

export default function AddPlantForm({ plan, dispatch, editPlantId = null, onClose }) {
    const allPlants = getAllPlants(plan);
    const existingCategories = Array.from(new Set(allPlants.map((p) => p.category).filter(Boolean))).sort();
    const editTarget = editPlantId ? plan.customPlants.find((p) => p.id === editPlantId) : null;

    const [form, setForm] = useState(editTarget ? formFromPlant(editTarget) : blankForm());
    const [categoryMode, setCategoryMode] = useState('existing');
    const [errors, setErrors] = useState({});

    const set = (patch) => setForm((f) => ({ ...f, ...patch }));

    function validate() {
        const e = {};
        if (!form.name.trim()) e.name = 'Name is required.';
        if (!form.category.trim()) e.category = 'Category is required.';
        if ([...form.icon].length < 1) e.icon = 'Icon must be at least one character.';
        if (!Number.isFinite(+form.spacingInches) || +form.spacingInches < 0) e.spacingInches = 'Must be ≥ 0.';
        if (!Number.isFinite(+form.daysToMaturity) || +form.daysToMaturity < 0) e.daysToMaturity = 'Must be ≥ 0.';
        if (!Number.isFinite(+form.startIndoorsWeeksBeforeLastFrost) || +form.startIndoorsWeeksBeforeLastFrost < 0) {
            e.startIndoorsWeeksBeforeLastFrost = 'Must be ≥ 0.';
        }
        return e;
    }

    function handleSubmit(ev) {
        ev.preventDefault();
        const e = validate();
        setErrors(e);
        if (Object.keys(e).length > 0) return;

        const payload = {
            name: form.name.trim(),
            category: form.category.trim(),
            icon: form.icon,
            spacingInches: +form.spacingInches,
            daysToMaturity: +form.daysToMaturity,
            startIndoorsWeeksBeforeLastFrost: +form.startIndoorsWeeksBeforeLastFrost,
            plantingWindow: { start: +form.plantingWindowStart, end: +form.plantingWindowEnd },
            goodNeighbors: form.goodNeighbors,
            avoidNeighbors: form.avoidNeighbors,
            notes: form.notes,
            isUserAdded: true,
        };

        if (editPlantId) {
            dispatch(actions.updateCustomPlant(editPlantId, payload));
        } else {
            dispatch(actions.addCustomPlant({ id: crypto.randomUUID(), ...payload }));
        }
        onClose?.();
    }

    return (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose}>
            <aside className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-lg overflow-y-auto"
                onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between px-4 py-3 border-b">
                    <h3 className="font-semibold">{editPlantId ? 'Edit plant' : 'Add a plant'}</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
                </header>

                <form onSubmit={handleSubmit} className="p-4 space-y-4 text-sm">
                    <Field label="Name" error={errors.name}>
                        <input type="text" value={form.name} onChange={(e) => set({ name: e.target.value })}
                            className="border rounded px-2 py-1 w-full" />
                    </Field>

                    <Field label="Category" error={errors.category}>
                        {categoryMode === 'existing' ? (
                            <select value={form.category} onChange={(e) => {
                                if (e.target.value === '__new__') setCategoryMode('new');
                                else set({ category: e.target.value });
                            }} className="border rounded px-2 py-1 w-full">
                                <option value="">— select —</option>
                                {existingCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                                <option value="__new__">+ new category…</option>
                            </select>
                        ) : (
                            <div className="flex gap-2">
                                <input type="text" value={form.category} onChange={(e) => set({ category: e.target.value })}
                                    placeholder="new category" className="border rounded px-2 py-1 flex-1" />
                                <button type="button" onClick={() => setCategoryMode('existing')}
                                    className="text-xs text-gray-600 underline">use existing</button>
                            </div>
                        )}
                    </Field>

                    <Field label="Icon (emoji or character)" error={errors.icon}>
                        <input type="text" value={form.icon} onChange={(e) => set({ icon: e.target.value })}
                            className="border rounded px-2 py-1 w-20 text-2xl text-center" />
                    </Field>

                    <div className="grid grid-cols-3 gap-3">
                        <Field label="Spacing (in)" error={errors.spacingInches}>
                            <input type="number" min="0" value={form.spacingInches}
                                onChange={(e) => set({ spacingInches: e.target.value })}
                                className="border rounded px-2 py-1 w-full" />
                        </Field>
                        <Field label="Days to maturity" error={errors.daysToMaturity}>
                            <input type="number" min="0" value={form.daysToMaturity}
                                onChange={(e) => set({ daysToMaturity: e.target.value })}
                                className="border rounded px-2 py-1 w-full" />
                        </Field>
                        <Field label="Indoor weeks before last frost" error={errors.startIndoorsWeeksBeforeLastFrost}>
                            <input type="number" min="0" value={form.startIndoorsWeeksBeforeLastFrost}
                                onChange={(e) => set({ startIndoorsWeeksBeforeLastFrost: e.target.value })}
                                className="border rounded px-2 py-1 w-full" />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Window start month">
                            <select value={form.plantingWindowStart}
                                onChange={(e) => set({ plantingWindowStart: +e.target.value })}
                                className="border rounded px-2 py-1 w-full">
                                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                            </select>
                        </Field>
                        <Field label="Window end month">
                            <select value={form.plantingWindowEnd}
                                onChange={(e) => set({ plantingWindowEnd: +e.target.value })}
                                className="border rounded px-2 py-1 w-full">
                                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                            </select>
                        </Field>
                    </div>

                    <NeighborMultiSelect label="Good neighbors" value={form.goodNeighbors} all={allPlants}
                        onChange={(ids) => set({ goodNeighbors: ids })} />
                    <NeighborMultiSelect label="Avoid neighbors" value={form.avoidNeighbors} all={allPlants}
                        onChange={(ids) => set({ avoidNeighbors: ids })} />

                    <Field label="Notes">
                        <textarea value={form.notes} onChange={(e) => set({ notes: e.target.value })}
                            className="border rounded px-2 py-1 w-full h-20" />
                    </Field>

                    <div className="flex justify-end gap-2 pt-2 border-t">
                        <button type="button" onClick={onClose}
                            className="px-3 py-1.5 border rounded text-gray-700 hover:bg-gray-50">Cancel</button>
                        <button type="submit"
                            className="px-3 py-1.5 bg-green-700 text-white rounded hover:bg-green-800">
                            {editPlantId ? 'Save changes' : 'Add plant'}
                        </button>
                    </div>
                </form>
            </aside>
        </div>
    );
}

function Field({ label, error, children }) {
    return (
        <label className="block">
            <span className="block text-xs font-medium text-gray-700 mb-1">{label}</span>
            {children}
            {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
        </label>
    );
}

function NeighborMultiSelect({ label, value, all, onChange }) {
    return (
        <Field label={`${label} (optional)`}>
            <select multiple size="4" value={value}
                onChange={(e) => onChange(Array.from(e.target.selectedOptions).map((o) => o.value))}
                className="border rounded px-2 py-1 w-full">
                {all.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
            </select>
        </Field>
    );
}

