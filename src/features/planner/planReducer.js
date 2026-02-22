export function createPlannerInitialState(initialItems = []) {
    const items = Array.isArray(initialItems) ? initialItems : [];
    return {
        items,
        history: [items],
        currentHistoryIndex: 0,
    };
}

export const plannerInitialState = createPlannerInitialState();

export const plannerActionTypes = {
    COMMIT_ITEMS: 'COMMIT_ITEMS',
    PICKUP_ITEM: 'PICKUP_ITEM',
    RESET_TO_COMMITTED: 'RESET_TO_COMMITTED',
    UNDO: 'UNDO',
    REDO: 'REDO',
    LOAD_ITEMS: 'LOAD_ITEMS',
};

export function plannerReducer(state, action) {
    switch (action.type) {
        case plannerActionTypes.COMMIT_ITEMS: {
            const nextItems = Array.isArray(action.payload) ? action.payload : [];
            const nextHistory = state.history.slice(0, state.currentHistoryIndex + 1);
            nextHistory.push(nextItems);
            return {
                items: nextItems,
                history: nextHistory,
                currentHistoryIndex: nextHistory.length - 1,
            };
        }

        case plannerActionTypes.PICKUP_ITEM: {
            const pickedUpId = action.payload;
            return {
                ...state,
                items: state.items.filter(item => item.id !== pickedUpId),
            };
        }

        case plannerActionTypes.RESET_TO_COMMITTED:
            return {
                ...state,
                items: state.history[state.currentHistoryIndex] || [],
            };

        case plannerActionTypes.UNDO: {
            if (state.currentHistoryIndex <= 0) return state;
            const prevIndex = state.currentHistoryIndex - 1;
            return {
                ...state,
                currentHistoryIndex: prevIndex,
                items: state.history[prevIndex],
            };
        }

        case plannerActionTypes.REDO: {
            if (state.currentHistoryIndex >= state.history.length - 1) return state;
            const nextIndex = state.currentHistoryIndex + 1;
            return {
                ...state,
                currentHistoryIndex: nextIndex,
                items: state.history[nextIndex],
            };
        }

        case plannerActionTypes.LOAD_ITEMS: {
            const loadedItems = Array.isArray(action.payload) ? action.payload : [];
            const nextHistory = state.history.slice(0, state.currentHistoryIndex + 1);
            nextHistory.push(loadedItems);
            return {
                items: loadedItems,
                history: nextHistory,
                currentHistoryIndex: nextHistory.length - 1,
            };
        }

        default:
            return state;
    }
}
