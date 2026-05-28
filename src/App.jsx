import React, { useState, useCallback } from 'react';
import GardenSetup from './components/GardenSetup';
import AlmanacShell from './components/AlmanacShell';
import { createEmptyPlan } from './features/plan/planSchema.js';
import { loadPlanFromStorage } from './features/plan/usePlanIO.js';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, info) {
        console.error('Willowbrook crashed:', error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-stone-100 flex items-center justify-center p-6">
                    <div className="max-w-md bg-white border border-red-200 rounded-xl shadow-sm p-6">
                        <h1 className="text-xl font-bold text-gray-800 mb-2">Something went wrong</h1>
                        <p className="text-sm text-gray-600 mb-3">
                            Willowbrook hit an unexpected error. Reload the page to try again — your auto-saved plan should still be in localStorage.
                        </p>
                        <button onClick={() => window.location.reload()} className="px-3 py-1.5 bg-stone-900 text-white rounded text-sm">
                            Reload
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

function AppInner() {
    const [plan, setPlan] = useState(() => loadPlanFromStorage());

    const handleSetupComplete = useCallback((garden) => {
        setPlan(createEmptyPlan(garden));
    }, []);

    const handleNewGarden = useCallback(() => {
        if (!window.confirm('Start a new garden? Your current plan will be replaced (auto-save will overwrite).')) return;
        setPlan(null);
    }, []);

    if (!plan) {
        return <GardenSetup onComplete={handleSetupComplete} />;
    }
    return <AlmanacShell initialPlan={plan} onNewGarden={handleNewGarden} />;
}

export default function App() {
    return (
        <ErrorBoundary>
            <AppInner />
        </ErrorBoundary>
    );
}
