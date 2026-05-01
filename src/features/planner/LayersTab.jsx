function LayerRow({ name, checked, onChange }) {
    return (
        <label className="flex items-center justify-between text-sm text-gray-700 py-2 border-b border-gray-100">
            <span>{name}</span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange?.(e.target.checked)}
            />
        </label>
    );
}

export function LayersTab({ layers, setLayers, selectedTool }) {
    return (
        <>
            <h3 className="font-semibold text-gray-800 mb-2">Layers</h3>
            <p className="text-xs text-gray-600 mb-3">Control visibility and editability.</p>
            <LayerRow
                name="Grid"
                checked={layers.grid}
                onChange={(checked) => setLayers((prev) => ({ ...prev, grid: checked }))}
            />
            <LayerRow
                name="Structures"
                checked={layers.structures}
                onChange={(checked) => setLayers((prev) => ({ ...prev, structures: checked }))}
            />
            <LayerRow
                name="Plants"
                checked={layers.plants}
                onChange={(checked) => setLayers((prev) => ({ ...prev, plants: checked }))}
            />
            <LayerRow
                name="Selection Guides"
                checked={layers.guides}
                onChange={(checked) => setLayers((prev) => ({ ...prev, guides: checked }))}
            />
            {selectedTool && (
                <div className="mt-4 p-3 rounded border border-gray-200 bg-gray-50 text-xs">
                    <div className="font-semibold text-gray-700 mb-1">Inspector</div>
                    <div className="text-gray-600">Name: {selectedTool.name}</div>
                    <div className="text-gray-600">Type: {selectedTool.type}</div>
                    {selectedTool.type === 'structure' && (
                        <div className="text-gray-600">Size: {selectedTool.width}' x {selectedTool.length}'</div>
                    )}
                </div>
            )}
        </>
    );
}
