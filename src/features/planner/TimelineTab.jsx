const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function TimelineTab({ timelineMonth, setTimelineMonth, zone, timelineRows }) {
    return (
        <>
            <h3 className="font-semibold text-gray-800 mb-2">Timeline</h3>
            <p className="text-xs text-gray-600 mb-3">Compare your current plants against suggested planting windows.</p>
            <div className="text-[11px] text-gray-600 mb-2">USDA zone context: {String(zone).toUpperCase()}</div>
            <label className="text-xs text-gray-600 block mb-2">
                Month
                <select
                    value={timelineMonth}
                    onChange={(e) => setTimelineMonth(Number(e.target.value))}
                    className="mt-1 w-full px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                >
                    {MONTH_LABELS.map((label, idx) => (
                        <option key={label} value={idx}>{label}</option>
                    ))}
                </select>
            </label>
            <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                {timelineRows.length === 0 ? (
                    <p className="text-xs text-gray-500">Add plants to see timeline guidance.</p>
                ) : timelineRows.map((row) => (
                    <div key={row.name} className="border border-gray-200 rounded p-2 bg-gray-50">
                        <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-gray-800">{row.name}</span>
                            <span className="text-gray-600">x{row.count}</span>
                        </div>
                        {row.window ? (
                            <div>
                                <div className={`text-[11px] mb-1 ${row.inWindow ? 'text-green-700' : 'text-amber-700'}`}>
                                    Suggested: {MONTH_LABELS[row.window.start]}-{MONTH_LABELS[row.window.end]} {row.inWindow ? '(in window)' : '(outside window)'}
                                </div>
                                <div className="grid grid-cols-12 gap-0.5">
                                    {MONTH_LABELS.map((month, idx) => {
                                        const inSuggested = idx >= row.window.start && idx <= row.window.end;
                                        const isActive = idx === timelineMonth;
                                        return (
                                            <div
                                                key={`${row.name}-${month}`}
                                                className={`h-2 rounded-sm ${inSuggested ? 'bg-green-300' : 'bg-gray-200'} ${isActive ? 'ring-1 ring-gray-700' : ''}`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="text-[11px] text-gray-500">No planting window defined yet.</div>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
}
