import React, { useState } from 'react';
import { ArrowLeft, Pencil, Trash2, Check, X, Plus } from 'lucide-react';
import { actions } from '../plan/planReducer.js';
import { getAllPlants, getPlantsById } from '../catalog/catalog.js';
import { PLANTING_STATUS_VALUES } from '../plan/planSchema.js';

export default function BedDetail({ plan, dispatch, bedId, onBack }) {
    const bed = plan.beds.find((b) => b.id === bedId);
    const [editing, setEditing] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [draft, setDraft] = useState(null);

    if (!bed) {
        return (
            <div className="p-6">
                <button onClick={onBack} className="text-sm underline">← back to beds</button>
                <p className="mt-4 text-sm text-gray-600">Bed not found.</p>
            </div>
        );
    }

    function startEdit() {
        setDraft({ name: bed.name, widthFt: String(bed.widthFt), lengthFt: String(bed.lengthFt) });
        setEditing(true);
    }

    function saveEdit() {
        const widthFt = +draft.widthFt;
        const lengthFt = +draft.lengthFt;
        if (!draft.name.trim() || !Number.isFinite(widthFt) || widthFt <= 0 || !Number.isFinite(lengthFt) || lengthFt <= 0) {
            return;
        }
        dispatch(actions.updateBed(bed.id, {
            name: draft.name.trim(),
            widthFt,
            lengthFt,
        }));
        setEditing(false);
    }

    function handleRemove() {
        dispatch(actions.removeBed(bed.id));
        onBack();
    }

    return (
        <div className="p-6 space-y-6">
            <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-gray-700 hover:underline">
                <ArrowLeft size={14} /> Back to beds
            </button>

            {!editing && (
                <header className="flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">{bed.name}</h2>
                        <p className="text-xs text-gray-600">{bed.widthFt}′ × {bed.lengthFt}′</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={startEdit}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-gray-50">
                            <Pencil size={12} /> Edit
                        </button>
                        {!confirmRemove ? (
                            <button onClick={() => setConfirmRemove(true)}
                                className="inline-flex items-center gap-1 text-xs px-2 py-1 border border-red-300 text-red-700 rounded hover:bg-red-50">
                                <Trash2 size={12} /> Remove bed
                            </button>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-xs">
                                Remove bed and all its plantings?
                                <button onClick={handleRemove}
                                    className="px-2 py-1 bg-red-600 text-white rounded">Yes, remove</button>
                                <button onClick={() => setConfirmRemove(false)}
                                    className="px-2 py-1 border rounded">Cancel</button>
                            </span>
                        )}
                    </div>
                </header>
            )}

            {editing && (
                <header className="flex items-end gap-2 flex-wrap">
                    <label className="block">
                        <span className="block text-xs font-medium text-gray-700">Name</span>
                        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                            className="border rounded px-2 py-1" />
                    </label>
                    <label className="block">
                        <span className="block text-xs font-medium text-gray-700">Width (ft)</span>
                        <input type="number" min="0.5" step="0.5" value={draft.widthFt}
                            onChange={(e) => setDraft({ ...draft, widthFt: e.target.value })}
                            className="border rounded px-2 py-1 w-20" />
                    </label>
                    <label className="block">
                        <span className="block text-xs font-medium text-gray-700">Length (ft)</span>
                        <input type="number" min="0.5" step="0.5" value={draft.lengthFt}
                            onChange={(e) => setDraft({ ...draft, lengthFt: e.target.value })}
                            className="border rounded px-2 py-1 w-20" />
                    </label>
                    <button onClick={saveEdit}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-700 text-white rounded">
                        <Check size={12} /> Save
                    </button>
                    <button onClick={() => setEditing(false)}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded">
                        <X size={12} /> Cancel
                    </button>
                </header>
            )}

            <PlantingsSection plan={plan} dispatch={dispatch} bedId={bed.id} />
            <JournalSection plan={plan} dispatch={dispatch} bedId={bed.id} />
            <HistorySection plan={plan} bedId={bed.id} />
            <p className="text-sm text-gray-500">Footprint comes in the next task.</p>
        </div>
    );
}

function JournalSection({ plan, dispatch, bedId }) {
    const [text, setText] = useState('');
    const today = new Date().toISOString().slice(0, 10);
    const entries = plan.journal
        .filter((j) => j.bedId === bedId)
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1));

    function submit(e) {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;
        dispatch(actions.addJournalEntry({
            id: crypto.randomUUID(),
            bedId,
            date: today,
            text: trimmed,
        }));
        setText('');
    }

    return (
        <section>
            <h3 className="font-semibold mb-2">Journal</h3>
            <form onSubmit={submit} className="flex gap-2 mb-3">
                <input type="text" value={text} onChange={(e) => setText(e.target.value)}
                    placeholder={`Add entry for ${today}…`}
                    className="flex-1 border rounded px-2 py-1 text-sm" />
                <button type="submit"
                    className="px-2 py-1 bg-green-700 text-white rounded text-xs">Add entry</button>
            </form>
            {entries.length === 0 ? (
                <p className="text-xs text-gray-500">No journal entries yet.</p>
            ) : (
                <ul className="space-y-1 text-sm">
                    {entries.map((j) => (
                        <li key={j.id} className="border-b last:border-0 py-1">
                            <span className="text-xs text-gray-500">{j.date}</span>
                            <span className="ml-2">{j.text}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function HistorySection({ plan, bedId }) {
    const [open, setOpen] = useState(false);
    const plantsById = getPlantsById(plan);
    const past = plan.plantings
        .filter((p) => p.bedId === bedId && (p.status === 'harvested' || p.status === 'removed'))
        .slice()
        .sort((a, b) => {
            if (a.datePlanted === b.datePlanted) return a.id.localeCompare(b.id);
            if (a.datePlanted === null) return 1;
            if (b.datePlanted === null) return -1;
            return a.datePlanted < b.datePlanted ? 1 : -1;
        });

    return (
        <section>
            <button onClick={() => setOpen((o) => !o)}
                className="font-semibold flex items-center gap-1 text-sm">
                {open ? '▾' : '▸'} History ({past.length})
            </button>
            {open && (
                <div className="overflow-x-auto mt-2">
                    <table className="min-w-full text-sm border-collapse">
                        <thead>
                            <tr className="text-left text-xs text-gray-600 border-b">
                                <th className="py-1 pr-2">Icon</th>
                                <th className="py-1 pr-2">Plant</th>
                                <th className="py-1 pr-2">Qty</th>
                                <th className="py-1 pr-2">Status</th>
                                <th className="py-1 pr-2">Date planted</th>
                                <th className="py-1 pr-2">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {past.length === 0 && (
                                <tr><td colSpan="6" className="text-xs text-gray-500 py-2">No history yet.</td></tr>
                            )}
                            {past.map((p) => (
                                <tr key={p.id} className="border-b last:border-0 text-gray-700">
                                    <td className="py-1 pr-2 text-xl">{plantsById[p.plantId]?.icon ?? '?'}</td>
                                    <td className="py-1 pr-2">{plantsById[p.plantId]?.name ?? p.plantId}</td>
                                    <td className="py-1 pr-2">{p.quantity}</td>
                                    <td className="py-1 pr-2">{p.status.replace(/_/g, ' ')}</td>
                                    <td className="py-1 pr-2">{p.datePlanted ?? '—'}</td>
                                    <td className="py-1 pr-2">{p.notes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

function PlantingsSection({ plan, dispatch, bedId }) {
    const allPlants = getAllPlants(plan);
    const plantsById = getPlantsById(plan);
    const current = plan.plantings.filter(
        (p) => p.bedId === bedId && p.status !== 'harvested' && p.status !== 'removed'
    );

    const [adding, setAdding] = useState(false);

    return (
        <section>
            <h3 className="font-semibold mb-2">Current plantings</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                    <thead>
                        <tr className="text-left text-xs text-gray-600 border-b">
                            <th className="py-1 pr-2">Icon</th>
                            <th className="py-1 pr-2">Plant</th>
                            <th className="py-1 pr-2">Qty</th>
                            <th className="py-1 pr-2">Status</th>
                            <th className="py-1 pr-2">Date planted</th>
                            <th className="py-1 pr-2">Notes</th>
                            <th className="py-1 pr-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {current.length === 0 && (
                            <tr><td colSpan="7" className="text-xs text-gray-500 py-2">No plantings yet.</td></tr>
                        )}
                        {current.map((p) => (
                            <PlantingRow key={p.id} planting={p} plant={plantsById[p.plantId]} dispatch={dispatch} />
                        ))}
                    </tbody>
                </table>
            </div>

            {!adding && (
                <button onClick={() => setAdding(true)}
                    className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-gray-50">
                    <Plus size={12} /> Add planting
                </button>
            )}
            {adding && (
                <AddPlantingRow bedId={bedId} allPlants={allPlants} dispatch={dispatch}
                    onDone={() => setAdding(false)} />
            )}
        </section>
    );
}

function PlantingRow({ planting, plant, dispatch }) {
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [draftQty, setDraftQty] = useState(String(planting.quantity));
    const [draftNotes, setDraftNotes] = useState(planting.notes ?? '');

    function commitQty() {
        const n = parseInt(draftQty, 10);
        if (!Number.isFinite(n) || n < 1) {
            setDraftQty(String(planting.quantity));
            return;
        }
        if (n !== planting.quantity) dispatch(actions.updatePlanting(planting.id, { quantity: n }));
    }

    function commitNotes() {
        if (draftNotes !== (planting.notes ?? '')) dispatch(actions.updatePlanting(planting.id, { notes: draftNotes }));
    }

    return (
        <tr className="border-b last:border-0">
            <td className="py-1 pr-2 text-xl">{plant?.icon ?? '?'}</td>
            <td className="py-1 pr-2">{plant?.name ?? planting.plantId}</td>
            <td className="py-1 pr-2">
                <input type="number" min="1" value={draftQty}
                    onChange={(e) => setDraftQty(e.target.value)}
                    onBlur={commitQty}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                    className="border rounded px-1 py-0.5 w-16" />
            </td>
            <td className="py-1 pr-2">
                <select value={planting.status}
                    onChange={(e) => dispatch(actions.updatePlanting(planting.id, { status: e.target.value }))}
                    className="border rounded px-1 py-0.5">
                    {PLANTING_STATUS_VALUES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
            </td>
            <td className="py-1 pr-2">
                <input type="date" value={planting.datePlanted ?? ''}
                    onChange={(e) => dispatch(actions.updatePlanting(planting.id, { datePlanted: e.target.value || null }))}
                    className="border rounded px-1 py-0.5" />
            </td>
            <td className="py-1 pr-2">
                <input type="text" value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    onBlur={commitNotes}
                    className="border rounded px-1 py-0.5 w-40" />
            </td>
            <td className="py-1 pr-2">
                {!confirmRemove ? (
                    <button onClick={() => setConfirmRemove(true)}
                        className="text-xs text-gray-500 hover:text-red-600">×</button>
                ) : (
                    <span className="text-xs">
                        Remove?
                        <button onClick={() => dispatch(actions.removePlanting(planting.id))}
                            className="ml-1 px-1 bg-red-600 text-white rounded">Yes</button>
                        <button onClick={() => setConfirmRemove(false)}
                            className="ml-1 px-1 border rounded">No</button>
                    </span>
                )}
            </td>
        </tr>
    );
}

function AddPlantingRow({ bedId, allPlants, dispatch, onDone }) {
    const [plantId, setPlantId] = useState(allPlants[0]?.id ?? '');
    const [quantity, setQuantity] = useState('1');
    const [status, setStatus] = useState('planned');
    const [datePlanted, setDatePlanted] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState(null);

    function submit(e) {
        e.preventDefault();
        const qty = parseInt(quantity, 10);
        if (!plantId) { setError('Pick a plant.'); return; }
        if (!Number.isFinite(qty) || qty < 1) { setError('Quantity ≥ 1.'); return; }
        dispatch(actions.addPlanting({
            id: crypto.randomUUID(),
            bedId,
            plantId,
            quantity: qty,
            status,
            datePlanted: datePlanted || null,
            notes,
        }));
        setQuantity('1');
        setStatus('planned');
        setDatePlanted('');
        setNotes('');
        setError(null);
    }

    return (
        <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2 text-sm border-t pt-3">
            <label>
                <span className="block text-xs text-gray-600">Plant</span>
                <select value={plantId} onChange={(e) => setPlantId(e.target.value)}
                    className="border rounded px-1 py-0.5" autoFocus>
                    {allPlants.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                </select>
            </label>
            <label>
                <span className="block text-xs text-gray-600">Qty</span>
                <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                    className="border rounded px-1 py-0.5 w-16" />
            </label>
            <label>
                <span className="block text-xs text-gray-600">Status</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                    className="border rounded px-1 py-0.5">
                    {PLANTING_STATUS_VALUES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
            </label>
            <label>
                <span className="block text-xs text-gray-600">Date</span>
                <input type="date" value={datePlanted} onChange={(e) => setDatePlanted(e.target.value)}
                    className="border rounded px-1 py-0.5" />
            </label>
            <label className="flex-1 min-w-40">
                <span className="block text-xs text-gray-600">Notes</span>
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
                    className="border rounded px-1 py-0.5 w-full" />
            </label>
            <button type="submit"
                className="px-2 py-1 bg-green-700 text-white rounded text-xs">Add</button>
            <button type="button" onClick={onDone}
                className="px-2 py-1 border rounded text-xs">Done</button>
            {error && <p className="text-xs text-red-600 w-full">{error}</p>}
        </form>
    );
}
