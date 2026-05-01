function HelpCard({ title, body }) {
    return (
        <div className="mb-3 border border-gray-200 rounded p-3 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-800 mb-1">{title}</h4>
            <p className="text-xs text-gray-600">{body}</p>
        </div>
    );
}

export function LearnTab({ focusedPlantContext, placementInsights, zone }) {
    return (
        <>
            <h3 className="font-semibold text-gray-800 mb-2">Learn to Use</h3>
            <p className="text-xs text-gray-600 mb-4">Desktop-first planner workflow guidance with live plant intelligence.</p>
            <HelpCard title="1. Place Plants" body="Choose a plant in the left panel, then click on the canvas to place." />
            <HelpCard title="2. Resize Structures" body="Set width/length in Structures tab, then place on the canvas." />
            <HelpCard title="3. Spacing Ring" body="Plant placement ring turns red when spacing or poor-neighbor guidance is violated." />
            <HelpCard title="4. Move Items" body="Switch to Move mode, then click an item to pick it up and reposition." />
            <HelpCard title="5. Save & Print" body="Use Save for JSON export and Print for plan output." />

            {focusedPlantContext && (
                <div className="mt-4 border border-gray-200 rounded p-3 bg-gray-50">
                    <h4 className="text-sm font-semibold text-gray-800 mb-2">
                        Plant Guidance: {focusedPlantContext.name}
                    </h4>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700">
                            Spacing: {focusedPlantContext.spacingInches}"
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700">
                            Scope: {focusedPlantContext.regionScope}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700">
                            Zone: {String(zone).toUpperCase()}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-700">
                            Confidence S/N/W: {focusedPlantContext.evidence.spacing}/{focusedPlantContext.evidence.neighbors}/{focusedPlantContext.evidence.window}
                        </span>
                    </div>
                    <details className="text-[11px] text-gray-600 mb-2">
                        <summary className="cursor-pointer select-none">Confidence key</summary>
                        <div className="mt-1">
                            <strong>S</strong> = spacing, <strong>N</strong> = neighbors, <strong>W</strong> = planting window.
                            <span className="ml-1">Each value is high/medium/low confidence.</span>
                        </div>
                    </details>
                    <div className="text-[11px] text-gray-600 mb-2">Last reviewed: {focusedPlantContext.lastReviewed || 'Not reviewed yet'}</div>
                    <p className="text-xs text-gray-600 mb-2">{focusedPlantContext.notes}</p>
                    <div className="text-xs text-gray-700">
                        Good neighbors: {focusedPlantContext.goodNeighbors.length > 0 ? focusedPlantContext.goodNeighbors.join(', ') : 'none listed'}
                    </div>
                    <div className="text-xs text-gray-700 mb-2">
                        Avoid near: {focusedPlantContext.avoidNeighbors.length > 0 ? focusedPlantContext.avoidNeighbors.join(', ') : 'none listed'}
                    </div>
                    <details className="text-xs text-gray-600">
                        <summary className="cursor-pointer select-none">Sources ({focusedPlantContext.sourceRefs.length})</summary>
                        {focusedPlantContext.sourceRefs.length === 0 ? (
                            <div className="mt-1">Not populated yet.</div>
                        ) : (
                            <ul className="mt-1 mb-2 space-y-1">
                                {focusedPlantContext.sourceRefs.map((ref, idx) => (
                                    <li key={`${focusedPlantContext.id}-src-${idx}`}>
                                        <a href={ref.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">
                                            {ref.title || ref.url}
                                        </a>
                                        <span className="text-gray-500"> ({ref.publisher || 'source'})</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </details>
                    <details className="text-xs text-gray-600 mt-1">
                        <summary className="cursor-pointer select-none">Nearby plants ({focusedPlantContext.nearby.length})</summary>
                        {focusedPlantContext.nearby.length === 0 ? (
                            <div className="mt-1">No nearby plants.</div>
                        ) : (
                            <ul className="mt-1 space-y-1">
                                {focusedPlantContext.nearby.map((neighbor) => (
                                    <li key={neighbor.id} className="flex justify-between">
                                        <span>
                                            {neighbor.name}
                                            {neighbor.relation === 'good' ? ' (good)' : ''}
                                            {neighbor.relation === 'avoid' ? ' (avoid)' : ''}
                                            {neighbor.tooClose ? ' - too close' : ''}
                                        </span>
                                        <span>{neighbor.distanceInches}"</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </details>
                </div>
            )}

            {placementInsights?.status === 'warning' && (
                <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                    Placement warning: the current ghost location violates spacing or companion guidance.
                </div>
            )}
        </>
    );
}
