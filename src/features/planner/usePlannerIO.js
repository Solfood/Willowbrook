import { useCallback } from 'react';
import { clampPlanItemsToBounds, parseGardenPlanText } from './planSchema.js';

export function usePlannerIO({ width, length, zone, items, onLoadGarden, clearSelection, loadItems }) {
    const handleSave = useCallback(async () => {
        const clamped = clampPlanItemsToBounds(items, width, length);
        if (!clamped.ok) {
            alert(`Cannot save plan: ${clamped.error}`);
            return;
        }
        const data = { schemaVersion: 1, width, length, zone, items: clamped.items };
        const jsonString = JSON.stringify(data, null, 2);

        try {
            if (typeof window.showSaveFilePicker === 'function') {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'willowbrook-garden.json',
                    types: [{
                        description: 'JSON/Garden Plan',
                        accept: { 'application/json': ['.json'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(jsonString);
                await writable.close();
                return;
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('Save picker failed, using fallback:', err);
        }

        const filename = prompt('Enter a name for your garden plan:', 'willowbrook-garden');
        if (!filename) return;

        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }, [width, length, zone, items]);

    const handlePrint = useCallback(() => {
        window.print();
    }, []);

    const handleLoad = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = typeof event.target?.result === 'string' ? event.target.result : '';
            const result = parseGardenPlanText(content);

            if (!result.ok) {
                alert(`Failed to load: ${result.error}`);
                return;
            }

            const loadedClamped = clampPlanItemsToBounds(result.plan.items, result.plan.width, result.plan.length);
            if (!loadedClamped.ok) {
                alert(`Failed to load: ${loadedClamped.error}`);
                return;
            }

            if (result.plan.width !== width || result.plan.length !== length || result.plan.zone !== zone) {
                if (typeof onLoadGarden === 'function') {
                    onLoadGarden({
                        width: result.plan.width,
                        length: result.plan.length,
                        zone: result.plan.zone,
                        items: loadedClamped.items,
                    });
                    return;
                }
                alert('Loaded plan settings do not match current garden.');
                return;
            }

            loadItems(loadedClamped.items);
            clearSelection();
        };

        reader.readAsText(file);
        e.target.value = '';
    }, [width, length, zone, onLoadGarden, clearSelection, loadItems]);

    return { handleSave, handleLoad, handlePrint };
}
