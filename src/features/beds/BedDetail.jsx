import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function BedDetail({ plan, bedId, onBack }) {
    const bed = plan.beds.find((b) => b.id === bedId);
    if (!bed) return (
        <div className="p-6">
            <button onClick={onBack} className="text-sm underline">← back to beds</button>
            <p className="mt-4 text-sm text-gray-600">Bed not found.</p>
        </div>
    );
    return (
        <div className="p-6">
            <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-gray-700 hover:underline">
                <ArrowLeft size={14} /> Back to beds
            </button>
            <h2 className="text-xl font-semibold mt-2">{bed.name}</h2>
            <p className="text-xs text-gray-600">{bed.widthFt}′ × {bed.lengthFt}′</p>
            <p className="mt-4 text-sm text-gray-500">Sections coming in next tasks.</p>
        </div>
    );
}
