import React, { useState } from 'react';
import { Sprout } from 'lucide-react';

const ZONE_OPTIONS = [
    '1a', '1b', '2a', '2b', '3a', '3b', '4a', '4b', '5a', '5b', '6a', '6b',
    '7a', '7b', '8a', '8b', '9a', '9b', '10a', '10b', '11a', '11b', '12a', '12b', '13a', '13b',
];
const CONTIGUOUS_US_ZONE_BANDS = [3, 4, 5, 6, 7, 8, 9, 10];

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

        try {
            const response = await fetch(`https://phzmapi.org/${zip}.json`);
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
        } catch {
            setLookupState('error');
            setLookupMessage('Could not resolve that ZIP code. Try the USDA map link below.');
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
                            Used for planting-window guidance in Learn/Timeline. Map is an approximate visual guide.
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

function ZoneMiniMap({ zone, onSelectZone }) {
    const zoneText = String(zone || '7a').toLowerCase();
    const suffix = zoneText.endsWith('b') ? 'b' : 'a';
    const zoneNumber = Number(zoneText.replace(/[^\d]/g, '')) || 7;

    return (
        <div className="border border-gray-200 rounded-lg bg-white p-2 mb-2">
            <svg viewBox="0 0 320 170" className="w-full h-40" role="img" aria-label="Approximate USDA zones map">
                <defs>
                    <clipPath id="us-shape">
                        <path d="M20,95 L30,70 L55,58 L78,60 L96,52 L132,52 L155,44 L184,48 L208,42 L232,50 L254,48 L285,62 L300,78 L286,96 L263,105 L258,118 L228,120 L206,114 L188,121 L162,118 L143,126 L114,122 L95,126 L76,116 L54,114 L37,104 Z" />
                    </clipPath>
                </defs>

                <rect x="8" y="32" width="304" height="104" rx="10" fill="#f8fafc" stroke="#e2e8f0" />
                {CONTIGUOUS_US_ZONE_BANDS.map((num, idx) => {
                    const y = 38 + (idx * 12);
                    const isSelected = num === zoneNumber;
                    return (
                        <g key={`band-${num}`}>
                            <rect
                                x="14"
                                y={y}
                                width="292"
                                height="12"
                                clipPath="url(#us-shape)"
                                fill={isSelected ? '#16a34a' : '#bbf7d0'}
                                opacity={isSelected ? 0.95 : 0.75}
                                style={{ cursor: 'pointer' }}
                                onClick={() => onSelectZone?.(`${num}${suffix}`)}
                            />
                            <text x="288" y={y + 9} textAnchor="end" fontSize="7" fill="#334155">{num}</text>
                        </g>
                    );
                })}

                <path
                    d="M20,95 L30,70 L55,58 L78,60 L96,52 L132,52 L155,44 L184,48 L208,42 L232,50 L254,48 L285,62 L300,78 L286,96 L263,105 L258,118 L228,120 L206,114 L188,121 L162,118 L143,126 L114,122 L95,126 L76,116 L54,114 L37,104 Z"
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="1.4"
                />
                <text x="12" y="20" fontSize="10" fill="#475569">Approximate contiguous U.S. hardiness bands</text>
                <text x="12" y="154" fontSize="10" fill="#334155">Selected zone: {zoneText.toUpperCase()}</text>
            </svg>

            <div className="flex flex-wrap gap-1 mt-1">
                {CONTIGUOUS_US_ZONE_BANDS.map((num) => {
                    const selected = num === zoneNumber;
                    return (
                        <button
                            key={`zone-chip-${num}`}
                            type="button"
                            onClick={() => onSelectZone?.(`${num}${suffix}`)}
                            className={`text-[10px] px-2 py-0.5 rounded border ${selected ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                            {num}{suffix.toUpperCase()}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
