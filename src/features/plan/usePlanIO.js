import { useCallback, useEffect } from 'react';
import { validatePlanFile } from './planSchema.js';
import { actions } from './planReducer.js';

const STORAGE_KEY = 'willowbrook_almanac_plan_v2';

export function loadPlanFromStorage() {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        const validation = validatePlanFile(parsed);
        if (!validation.ok) {
            console.warn('[planIO] Ignoring invalid plan in localStorage:', validation.error);
            return null;
        }
        return parsed;
    } catch (err) {
        console.warn('[planIO] Could not parse plan from localStorage:', err);
        return null;
    }
}

export function usePlanIO({ plan, dispatch, setLoadError }) {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
        } catch (err) {
            console.warn('[planIO] Auto-save failed:', err);
        }
    }, [plan]);

    const handleSave = useCallback(() => {
        const json = JSON.stringify(plan, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${plan.garden.name.replace(/\s+/g, '-').toLowerCase() || 'garden'}-almanac.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [plan]);

    const handleLoad = useCallback(async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            const validation = validatePlanFile(parsed);
            if (!validation.ok) {
                setLoadError(validation.error);
                return;
            }
            dispatch(actions.loadPlan(parsed));
            setLoadError(null);
        } catch {
            setLoadError('Could not read that file as JSON.');
        } finally {
            event.target.value = '';
        }
    }, [dispatch, setLoadError]);

    return { handleSave, handleLoad };
}
