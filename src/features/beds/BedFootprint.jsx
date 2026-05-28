import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { computeFootprint, buildLegend } from './footprint.js';
import { getPlantsById } from '../catalog/catalog.js';

const EMPTY_CELL = '·';

export default function BedFootprint({ bed, plantings, plan }) {
    const plantsById = useMemo(() => getPlantsById(plan), [plan]);
    const bedPlantings = useMemo(
        () => (plantings || []).filter((p) => p.bedId === bed.id),
        [plantings, bed.id],
    );

    const { grid, overflow, cols } = useMemo(
        () => computeFootprint(bed, bedPlantings, plantsById),
        [bed, bedPlantings, plantsById],
    );

    const legend = useMemo(() => buildLegend(grid, plantsById), [grid, plantsById]);

    const isEmpty = legend.length === 0;

    return (
        <div className="font-mono text-base leading-none select-none">
            {isEmpty ? (
                <p className="text-xs text-gray-400 italic font-sans">No plants added yet.</p>
            ) : (
                <>
                    <pre className="border border-gray-200 rounded p-2 bg-stone-50 overflow-x-auto whitespace-pre">
                        {grid.map((row, ri) => (
                            <span key={ri} className="block">
                                {row.map((cell, ci) => (
                                    <span key={ci} title={cell ? plantsById[cell.plantId]?.name : undefined}>
                                        {cell ? cell.icon : EMPTY_CELL}
                                    </span>
                                ))}
                            </span>
                        ))}
                    </pre>
                    <p className="text-xs text-gray-500 mt-1">
                        Grid: {cols} ft wide — each cell = 1 sq ft
                    </p>
                    {overflow && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-700">
                            <AlertTriangle size={12} />
                            Some plants exceed the bed capacity and are not shown.
                        </div>
                    )}
                    {legend.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
                            {legend.map((e) => (
                                <li key={e.plantId}>{e.icon} {e.name}</li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}
