import React, { useState } from 'react';
import { Sprout } from 'lucide-react';

export default function GardenSetup({ onComplete }) {
    const [width, setWidth] = useState(10);
    const [length, setLength] = useState(10);

    const handleSubmit = (e) => {
        e.preventDefault();
        onComplete({ width: Number(width), length: Number(length) });
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
