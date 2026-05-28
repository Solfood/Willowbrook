import React, { useState } from 'react';
import { ArrowLeft, Pencil, Trash2, Check, X } from 'lucide-react';
import { actions } from '../plan/planReducer.js';

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

            <p className="text-sm text-gray-500">Plantings, footprint, journal and history come in next tasks.</p>
        </div>
    );
}
