import { createEmptyPlan } from './planSchema.js';

export const MAX_HISTORY = 50;

export const actionTypes = {
    ADD_BED: 'ADD_BED',
    UPDATE_BED: 'UPDATE_BED',
    REMOVE_BED: 'REMOVE_BED',
    ADD_PLANTING: 'ADD_PLANTING',
    UPDATE_PLANTING: 'UPDATE_PLANTING',
    REMOVE_PLANTING: 'REMOVE_PLANTING',
    ADD_JOURNAL_ENTRY: 'ADD_JOURNAL_ENTRY',
    ADD_CUSTOM_PLANT: 'ADD_CUSTOM_PLANT',
    UPDATE_CUSTOM_PLANT: 'UPDATE_CUSTOM_PLANT',
    MARK_TASK_DONE: 'MARK_TASK_DONE',
    LOAD_PLAN: 'LOAD_PLAN',
    UNDO: 'UNDO',
    REDO: 'REDO',
};

export const actions = {
    addBed: (bed) => ({ type: actionTypes.ADD_BED, payload: bed }),
    updateBed: (id, patch) => ({ type: actionTypes.UPDATE_BED, payload: { id, patch } }),
    removeBed: (id) => ({ type: actionTypes.REMOVE_BED, payload: id }),
    addPlanting: (planting) => ({ type: actionTypes.ADD_PLANTING, payload: planting }),
    updatePlanting: (id, patch) => ({ type: actionTypes.UPDATE_PLANTING, payload: { id, patch } }),
    removePlanting: (id) => ({ type: actionTypes.REMOVE_PLANTING, payload: id }),
    addJournalEntry: (entry) => ({ type: actionTypes.ADD_JOURNAL_ENTRY, payload: entry }),
    addCustomPlant: (plant) => ({ type: actionTypes.ADD_CUSTOM_PLANT, payload: plant }),
    updateCustomPlant: (id, patch) => ({ type: actionTypes.UPDATE_CUSTOM_PLANT, payload: { id, patch } }),
    markTaskDone: ({ plantingId, nextStatus, date }) => ({
        type: actionTypes.MARK_TASK_DONE,
        payload: { plantingId, nextStatus, date },
    }),
    loadPlan: (plan) => ({ type: actionTypes.LOAD_PLAN, payload: plan }),
    undo: () => ({ type: actionTypes.UNDO }),
    redo: () => ({ type: actionTypes.REDO }),
};

export function createInitialState(planOrUndefined) {
    const plan = planOrUndefined || createEmptyPlan({
        zone: '7a', zip: null, lastFrostDate: '2026-04-15', firstFrostDate: '2026-10-30',
    });
    return {
        plan,
        history: [plan],
        currentHistoryIndex: 0,
    };
}

function commit(state, nextPlan) {
    const nextHistory = state.history.slice(0, state.currentHistoryIndex + 1);
    nextHistory.push(nextPlan);
    const capped = nextHistory.length > MAX_HISTORY
        ? nextHistory.slice(nextHistory.length - MAX_HISTORY)
        : nextHistory;
    return {
        plan: nextPlan,
        history: capped,
        currentHistoryIndex: capped.length - 1,
    };
}

export function plannerReducer(state, action) {
    const plan = state.plan;
    switch (action.type) {
        case actionTypes.ADD_BED:
            return commit(state, { ...plan, beds: [...plan.beds, action.payload] });
        case actionTypes.UPDATE_BED: {
            const { id, patch } = action.payload;
            return commit(state, {
                ...plan,
                beds: plan.beds.map((bed) => (bed.id === id ? { ...bed, ...patch } : bed)),
            });
        }
        case actionTypes.REMOVE_BED: {
            const id = action.payload;
            return commit(state, {
                ...plan,
                beds: plan.beds.filter((bed) => bed.id !== id),
                plantings: plan.plantings.filter((p) => p.bedId !== id),
                journal: plan.journal.filter((j) => j.bedId !== id),
            });
        }
        case actionTypes.ADD_PLANTING:
            return commit(state, { ...plan, plantings: [...plan.plantings, action.payload] });
        case actionTypes.UPDATE_PLANTING: {
            const { id, patch } = action.payload;
            return commit(state, {
                ...plan,
                plantings: plan.plantings.map((p) => (p.id === id ? { ...p, ...patch } : p)),
            });
        }
        case actionTypes.REMOVE_PLANTING:
            return commit(state, { ...plan, plantings: plan.plantings.filter((p) => p.id !== action.payload) });
        case actionTypes.ADD_JOURNAL_ENTRY:
            return commit(state, { ...plan, journal: [...plan.journal, action.payload] });
        case actionTypes.ADD_CUSTOM_PLANT:
            return commit(state, { ...plan, customPlants: [...plan.customPlants, action.payload] });
        case actionTypes.UPDATE_CUSTOM_PLANT: {
            const { id, patch } = action.payload;
            return commit(state, {
                ...plan,
                customPlants: plan.customPlants.map((c) => (c.id === id ? { ...c, ...patch } : c)),
            });
        }
        case actionTypes.MARK_TASK_DONE: {
            const { plantingId, nextStatus, date } = action.payload;
            return commit(state, {
                ...plan,
                plantings: plan.plantings.map((p) => (
                    p.id === plantingId
                        ? { ...p, status: nextStatus, datePlanted: date || p.datePlanted }
                        : p
                )),
            });
        }
        case actionTypes.LOAD_PLAN:
            return commit(state, action.payload);
        case actionTypes.UNDO:
            if (state.currentHistoryIndex <= 0) return state;
            return {
                ...state,
                currentHistoryIndex: state.currentHistoryIndex - 1,
                plan: state.history[state.currentHistoryIndex - 1],
            };
        case actionTypes.REDO:
            if (state.currentHistoryIndex >= state.history.length - 1) return state;
            return {
                ...state,
                currentHistoryIndex: state.currentHistoryIndex + 1,
                plan: state.history[state.currentHistoryIndex + 1],
            };
        default:
            return state;
    }
}
