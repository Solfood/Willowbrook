import React from 'react';
import { computeFootprint } from './footprint.js';

export default function BedFootprint({ bed, plantings, plantsById }) {
    const { cells, legend, overflow, gridCols, gridRows } = computeFootprint({ bed, plantings, plantsById });

    return (
        <section>
            <h3 className="font-semibold mb-2">Bed footprint</h3>
            <p className="text-xs text-gray-500 mb-2">
                Bed: {bed.name} ({bed.widthFt}′ × {bed.lengthFt}′) — {gridCols} × {gridRows} cells at 6″ each.
            </p>
            <pre className="text-base leading-tight font-mono bg-gray-50 p-2 rounded border inline-block max-w-full overflow-x-auto">
                {cells.map((row) => row.join(' ')).join('\n')}
            </pre>
            {legend.length > 0 && (
                <ul className="mt-2 text-xs space-y-0.5">
                    {legend.map((e) => (
                        <li key={e.plantId}>
                            <span className="text-base">{e.icon}</span> {e.name} × {e.placed}
                            {e.placed < e.requested && (
                                <span className="text-amber-700"> (of {e.requested} requested)</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {overflow.length > 0 && (
                <ul className="mt-2 text-xs text-amber-700 space-y-0.5">
                    {overflow.map((o) => (
                        <li key={o.plantId}>
                            ⚠️ {o.missing} {o.name.toLowerCase()} don&apos;t fit in this {bed.widthFt}′ × {bed.lengthFt}′ bed.
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
