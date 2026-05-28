import React, { useState } from 'react';
import { Sprout, RefreshCw } from 'lucide-react';
import { fetchFrostDates } from '../features/catalog/frostDates.js';

const ZONE_OPTIONS = [
    '1a','1b','2a','2b','3a','3b','4a','4b','5a','5b','6a','6b',
    '7a','7b','8a','8b','9a','9b','10a','10b','11a','11b','12a','12b','13a','13b',
];

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_LAST = `${CURRENT_YEAR}-04-15`;
const DEFAULT_FIRST = `${CURRENT_YEAR}-10-30`;

export default function GardenSetup({ onComplete }) {
    const [name, setName] = useState('My Garden');
    const [zone, setZone] = useState('7a');
    const [zip, setZip] = useState('');
    const [lastFrostDate, setLastFrostDate] = useState(DEFAULT_LAST);
    const [firstFrostDate, setFirstFrostDate] = useState(DEFAULT_FIRST);
    const [zoneStatus, setZoneStatus] = useState({ state: 'idle', message: '' });
    const [frostStatus, setFrostStatus] = useState({ state: 'idle', message: '' });

    const handleZipLookup = async () => {
        const cleanZip = zip.trim();
        if (!/^\d{5}$/.test(cleanZip)) {
            setZoneStatus({ state: 'error', message: 'Enter a valid 5-digit ZIP.' });
            return;
        }
        setZoneStatus({ state: 'loading', message: 'Looking up zone…' });
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const res = await fetch(`https://phzmapi.org/${cleanZip}.json`, { signal: controller.signal });
            clearTimeout(timeout);
            if (!res.ok) throw new Error('zone lookup failed');
            const payload = await res.json();
            if (!payload?.zone) throw new Error('no zone');
            setZone(String(payload.zone).toLowerCase());
            setZoneStatus({ state: 'success', message: `ZIP ${cleanZip} → zone ${String(payload.zone).toUpperCase()}.` });
        } catch (err) {
            setZoneStatus({
                state: 'error',
                message: err.name === 'AbortError'
                    ? 'Zone lookup timed out — pick manually.'
                    : 'Zone lookup failed — pick manually.',
            });
        }
    };

    const handleFrostLookup = async () => {
        const cleanZip = zip.trim();
        if (!/^\d{5}$/.test(cleanZip)) {
            setFrostStatus({ state: 'error', message: 'Enter a 5-digit ZIP first.' });
            return;
        }
        setFrostStatus({ state: 'loading', message: 'Looking up frost dates…' });
        const result = await fetchFrostDates({ zip: cleanZip });
        if (result.ok) {
            setLastFrostDate(result.lastFrostDate);
            setFirstFrostDate(result.firstFrostDate);
            setFrostStatus({ state: 'success', message: `Last frost ${result.lastFrostDate}, first frost ${result.firstFrostDate}.` });
        } else {
            setFrostStatus({ state: 'error', message: result.error });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onComplete({
            name: name.trim() || 'My Garden',
            zone,
            zip: zip.trim() || null,
            lastFrostDate,
            firstFrostDate,
        });
    };

    return (
        <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
                <div className="flex items-center justify-center mb-6 text-green-600">
                    <Sprout size={48} />
                </div>
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Willowbrook Almanac</h1>
                <p className="text-center text-gray-600 mb-8">Bed-centric garden journal. Let's set up your garden.</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <Field label="Garden name">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </Field>

                    <Field label="ZIP code (US)">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={5}
                                value={zip}
                                onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))}
                                placeholder="e.g. 30301"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                            <button
                                type="button"
                                onClick={handleZipLookup}
                                disabled={zoneStatus.state === 'loading'}
                                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-60"
                            >
                                Zone
                            </button>
                            <button
                                type="button"
                                onClick={handleFrostLookup}
                                disabled={frostStatus.state === 'loading'}
                                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-60"
                            >
                                Frost
                            </button>
                        </div>
                        {zoneStatus.message && (
                            <p className={`text-xs mt-1 ${zoneStatus.state === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
                                {zoneStatus.message}
                            </p>
                        )}
                    </Field>

                    <Field label="USDA zone">
                        <select
                            value={zone}
                            onChange={(e) => setZone(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                        >
                            {ZONE_OPTIONS.map((z) => <option key={z} value={z}>{z.toUpperCase()}</option>)}
                        </select>
                    </Field>

                    <Field label="Last spring frost">
                        <input
                            type="date"
                            value={lastFrostDate}
                            onChange={(e) => setLastFrostDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </Field>

                    <Field label="First fall frost">
                        <input
                            type="date"
                            value={firstFrostDate}
                            onChange={(e) => setFirstFrostDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </Field>

                    {frostStatus.message && (
                        <p className={`text-xs ${frostStatus.state === 'error' ? 'text-red-600' : 'text-gray-600'} flex items-center gap-1`}>
                            <RefreshCw size={12} />
                            {frostStatus.message}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
                    >
                        Open Almanac
                    </button>
                </form>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            {children}
        </div>
    );
}
