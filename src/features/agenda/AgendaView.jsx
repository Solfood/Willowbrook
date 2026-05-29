import React from 'react';
import { CalendarDays, CheckCircle2 } from 'lucide-react';
import { computeAgenda, isoToday } from './agenda.js';
import { getPlantsById } from '../catalog/catalog.js';
import { actions } from '../plan/planReducer.js';

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
});

function formatDate(iso) {
    const [y, m, d] = iso.split('-').map((s) => parseInt(s, 10));
    return DATE_FMT.format(new Date(y, m - 1, d));
}

const BUCKET_STYLES = {
    overdue:  { label: 'Overdue',   pill: 'bg-amber-100 text-amber-800' },
    thisWeek: { label: 'This week', pill: 'bg-green-100 text-green-800' },
    nextWeek: { label: 'Next week', pill: 'bg-gray-100 text-gray-700' },
};

export default function AgendaView({ plan, dispatch, onSwitchView }) {
    const plantsById = getPlantsById(plan);
    const { garden, plantings, beds } = plan;

    if (plantings.length === 0) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-center">
                <CalendarDays size={48} className="text-green-700 mb-4" />
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Agenda is empty</h2>
                <p className="text-sm text-gray-600 mb-6">
                    Add a bed and at least one planting so we can compute what to do next.
                </p>
                {onSwitchView && (
                    <button onClick={() => onSwitchView('beds')}
                        className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800">
                        Go to Beds
                    </button>
                )}
            </div>
        );
    }

    const today = isoToday();
    const { overdue, thisWeek, nextWeek } = computeAgenda({
        plantings, plantsById, beds,
        zone: garden.zone, lastFrostDate: garden.lastFrostDate, today,
    });

    const total = overdue.length + thisWeek.length + nextWeek.length;
    if (total === 0) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-center">
                <CalendarDays size={48} className="text-green-700 mb-4" />
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Nothing on the agenda this fortnight</h2>
                <p className="text-sm text-gray-600">
                    Plantings will appear here as their dates approach.
                </p>
            </div>
        );
    }

    function handleMarkDone(task) {
        dispatch(actions.markTaskDone({
            plantingId: task.plantingId,
            nextStatus: task.nextStatus,
            date: today,
        }));
    }

    const sections = [
        ['overdue', overdue],
        ['thisWeek', thisWeek],
        ['nextWeek', nextWeek],
    ];

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Agenda</h2>
            {sections.map(([key, tasks]) => tasks.length === 0 ? null : (
                <section key={key}>
                    <header className="mb-2 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${BUCKET_STYLES[key].pill}`}>
                            {BUCKET_STYLES[key].label}
                        </span>
                        <span className="text-xs text-gray-500">
                            {tasks.length} task{tasks.length === 1 ? '' : 's'}
                        </span>
                    </header>
                    <ul className="space-y-2">
                        {tasks.map((task) => (
                            <TaskRow key={task.id} task={task} plantsById={plantsById} onMarkDone={handleMarkDone} />
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}

function TaskRow({ task, plantsById, onMarkDone }) {
    const icon = plantsById[task.plantId]?.icon ?? '🌱';
    return (
        <li className="border rounded p-3 bg-white flex items-start gap-3">
            <div className="text-2xl leading-none mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                    {task.plantName} — {task.bedName}
                </div>
                <div className="text-xs text-gray-600 italic">{task.reason}</div>
                <div className="text-xs text-gray-500 mt-0.5">{formatDate(task.date)}</div>
            </div>
            <button onClick={() => onMarkDone(task)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-green-700 text-green-700 rounded hover:bg-green-50">
                <CheckCircle2 size={14} /> Mark done
            </button>
        </li>
    );
}
