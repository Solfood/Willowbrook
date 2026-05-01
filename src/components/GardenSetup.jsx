import React, { useState } from 'react';
import { Sprout } from 'lucide-react';

const ZONE_OPTIONS = [
    '1a', '1b', '2a', '2b', '3a', '3b', '4a', '4b', '5a', '5b', '6a', '6b',
    '7a', '7b', '8a', '8b', '9a', '9b', '10a', '10b', '11a', '11b', '12a', '12b', '13a', '13b',
];

export default function GardenSetup({ onComplete }) {
    const [width, setWidth] = useState(10);
    const [length, setLength] = useState(10);
    const [zone, setZone] = useState('7a');
    const [zipCode, setZipCode] = useState('');
    const [lookupState, setLookupState] = useState('idle'); // idle | loading | success | error
    const [lookupMessage, setLookupMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onComplete({ width: Number(width), length: Number(length), zone });
    };

    const handleZipLookup = async () => {
        const zip = zipCode.trim();
        if (!/^\d{5}$/.test(zip)) {
            setLookupState('error');
            setLookupMessage('Enter a valid 5-digit ZIP code.');
            return;
        }

        setLookupState('loading');
        setLookupMessage('Looking up USDA zone...');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        try {
            const response = await fetch(`https://phzmapi.org/${zip}.json`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) {
                throw new Error('Lookup failed');
            }
            const payload = await response.json();
            if (!payload?.zone) {
                throw new Error('No zone found');
            }

            const normalizedZone = String(payload.zone).toLowerCase();
            setZone(normalizedZone);
            setLookupState('success');
            setLookupMessage(`ZIP ${zip} maps to USDA zone ${normalizedZone.toUpperCase()}.`);
        } catch (err) {
            clearTimeout(timeoutId);
            setLookupState('error');
            setLookupMessage(
                err.name === 'AbortError'
                    ? 'ZIP lookup timed out — please select your zone manually.'
                    : 'Could not resolve that ZIP code. Try the USDA map link below.'
            );
        }
    };

    return (
        <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
                <div className="flex items-center justify-center mb-6 text-green-600">
                    <Sprout size={48} />
                </div>
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">Willowbrook</h1>
                <p className="text-center text-gray-600 mb-8">Plan your dream garden down to the inch.</p>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Plot Width (ft)</label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={width}
                            onChange={(e) => setWidth(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Plot Length (ft)</label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={length}
                            onChange={(e) => setLength(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">USDA Zone Finder</label>
                        <ZoneMiniMap zone={zone} onSelectZone={setZone} />
                        <div className="flex gap-2 mb-1">
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={5}
                                value={zipCode}
                                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="ZIP code (e.g. 30301)"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-sm"
                            />
                            <button
                                type="button"
                                onClick={handleZipLookup}
                                disabled={lookupState === 'loading'}
                                className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-60"
                            >
                                {lookupState === 'loading' ? 'Checking...' : 'Auto-Set'}
                            </button>
                        </div>
                        {lookupMessage && (
                            <p className={`text-xs mb-1 ${lookupState === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
                                {lookupMessage}
                            </p>
                        )}
                        <a
                            href="https://planthardiness.ars.usda.gov/"
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-700 hover:underline"
                        >
                            Open full USDA map in a new tab
                        </a>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">USDA Zone</label>
                        <select
                            value={zone}
                            onChange={(e) => setZone(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition bg-white"
                            required
                        >
                            {ZONE_OPTIONS.map((z) => (
                                <option key={z} value={z}>{z.toUpperCase()}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Used for planting-window guidance in Learn/Timeline.
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Start Planning
                    </button>
                </form>
            </div>
        </div>
    );
}

function ZoneMiniMap() {
    return (
        <div className="border border-gray-200 rounded-lg bg-white p-1 mb-2">
            <img
                src="https://planthardiness.ars.usda.gov/system/files/National_Map_FZ_8x11_HS_150.png"
                alt="USDA Plant Hardiness Zone Map (reference)"
                className="w-full rounded border border-slate-200"
                loading="lazy"
                referrerPolicy="no-referrer"
            />
            <div className="text-[11px] text-gray-600 mt-1 px-1">
                USDA static reference map. Use ZIP Auto-Set or dropdown for selection.
            </div>
        </div>
    );
}
