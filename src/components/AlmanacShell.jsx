import React, { useReducer, useState } from 'react';
import { CalendarDays, Sprout, Library, Save, Upload, Undo, Redo, Plus } from 'lucide-react';
import { planReducer, createInitialState, actions } from '../features/plan/planReducer.js';
import { usePlanIO } from '../features/plan/usePlanIO.js';
import AgendaView from '../features/agenda/AgendaView';
import BedsView from '../features/beds/BedsView';
import BedDetail from '../features/beds/BedDetail';
import LibraryView from '../features/library/LibraryView';

const VIEWS = [
    { id: 'agenda', label: 'Agenda', icon: CalendarDays },
    { id: 'beds', label: 'Beds', icon: Sprout },
    { id: 'library', label: 'Library', icon: Library },
];

export default function AlmanacShell({ initialPlan, onNewGarden }) {
    const [state, dispatch] = useReducer(planReducer, createInitialState(initialPlan));
    const [view, setView] = useState('agenda');
    const [selectedBedId, setSelectedBedId] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const { handleSave, handleLoad } = usePlanIO({ plan: state.plan, dispatch, setLoadError });

    const canUndo = state.currentHistoryIndex > 0;
    const canRedo = state.currentHistoryIndex < state.history.length - 1;

    return (
        <div className="h-screen flex flex-col bg-stone-100">
            <header className="bg-white border-b border-gray-200">
                <div className="h-12 px-3 flex items-center gap-3 text-sm">
                    <span className="font-semibold text-gray-800">{state.plan.garden.name}</span>
                    <span className="text-xs text-gray-500">
                        Zone {state.plan.garden.zone.toUpperCase()} · last frost {state.plan.garden.lastFrostDate}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                        <button onClick={() => dispatch(actions.undo())} disabled={!canUndo}
                            className="p-1.5 border rounded border-gray-300 disabled:opacity-30">
                            <Undo size={14} />
                        </button>
                        <button onClick={() => dispatch(actions.redo())} disabled={!canRedo}
                            className="p-1.5 border rounded border-gray-300 disabled:opacity-30">
                            <Redo size={14} />
                        </button>
                        <button onClick={handleSave}
                            className="px-2 py-1 border border-gray-300 rounded inline-flex items-center gap-1 text-gray-700 hover:bg-gray-50">
                            <Save size={14} /> Save
                        </button>
                        <label className="px-2 py-1 border border-gray-300 rounded inline-flex items-center gap-1 text-gray-700 hover:bg-gray-50 cursor-pointer">
                            <Upload size={14} /> Load
                            <input type="file" accept=".json" onChange={handleLoad} className="hidden" />
                        </label>
                        <button onClick={onNewGarden}
                            className="px-2 py-1 border border-red-300 rounded text-red-600 hover:bg-red-50 inline-flex items-center gap-1">
                            <Plus size={14} /> New Garden
                        </button>
                    </div>
                </div>
                {loadError && (
                    <div className="px-3 py-2 text-xs text-red-700 bg-red-50 border-t border-red-200">
                        {loadError}
                    </div>
                )}
            </header>

            <div className="flex flex-1 min-h-0">
                <nav className="w-14 bg-green-700 text-white flex flex-col items-center py-3 gap-2">
                    {VIEWS.map(({ id, label, icon: Icon }) => ( // eslint-disable-line no-unused-vars
                        <button
                            key={id}
                            title={label}
                            onClick={() => {
                                if (id === 'beds') setSelectedBedId(null);
                                setView(id);
                            }}
                            className={`p-2 rounded ${view === id ? 'bg-green-800' : 'hover:bg-green-800/60'}`}
                        >
                            <Icon size={18} />
                        </button>
                    ))}
                </nav>

                <main className="flex-1 overflow-auto bg-white">
                    {view === 'agenda' && <AgendaView plan={state.plan} dispatch={dispatch} onSwitchView={setView} />}
                    {view === 'beds' && !selectedBedId && (
                        <BedsView plan={state.plan} dispatch={dispatch} onSelectBed={setSelectedBedId} />
                    )}
                    {view === 'beds' && selectedBedId && (
                        <BedDetail plan={state.plan} dispatch={dispatch} bedId={selectedBedId}
                            onBack={() => setSelectedBedId(null)} />
                    )}
                    {view === 'library' && <LibraryView plan={state.plan} dispatch={dispatch} />}
                </main>
            </div>
        </div>
    );
}
