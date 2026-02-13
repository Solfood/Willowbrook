import React from 'react';
import { useDraggable } from '@dnd-kit/core';

// Import SVG assets
import beet from '../assets/beet.svg';
import broccoli from '../assets/broccoli.svg';
import carrot from '../assets/carrot.svg';
import cucumber from '../assets/cucumber.svg';
import garlic from '../assets/garlic.svg';
import leek from '../assets/leek.svg';
import lettuce from '../assets/lettuce.svg';
import onion from '../assets/onion.svg';
import peas from '../assets/peas.svg';
import pepper from '../assets/pepper.svg';
import radish from '../assets/radish.svg';
import spinach from '../assets/spinach.svg';
import strawberry from '../assets/strawberry.svg';
import tomato from '../assets/tomato.svg';

const PLANT_TYPES = [
    { id: 'beet', name: 'Beet', src: beet },
    { id: 'broccoli', name: 'Broccoli', src: broccoli },
    { id: 'carrot', name: 'Carrot', src: carrot },
    { id: 'cucumber', name: 'Cucumber', src: cucumber },
    { id: 'garlic', name: 'Garlic', src: garlic },
    { id: 'leek', name: 'Leek', src: leek },
    { id: 'lettuce', name: 'Lettuce', src: lettuce },
    { id: 'onion', name: 'Onion', src: onion },
    { id: 'peas', name: 'Peas', src: peas },
    { id: 'pepper', name: 'Pepper', src: pepper },
    { id: 'radish', name: 'Radish', src: radish },
    { id: 'spinach', name: 'Spinach', src: spinach },
    { id: 'strawberry', name: 'Strawberry', src: strawberry },
    { id: 'tomato', name: 'Tomato', src: tomato },
];

export function getPlantImage(id) {
    return PLANT_TYPES.find(p => p.id === id)?.src;
}

export default function PlantPalette() {
    return (
        <aside className="w-64 bg-white shadow-lg overflow-y-auto p-4 z-20 flex-shrink-0">
            <h2 className="font-bold text-gray-700 mb-4 border-b pb-2">Plants</h2>
            <div className="grid grid-cols-2 gap-3">
                {PLANT_TYPES.map(plant => (
                    <DraggablePlant key={plant.id} plant={plant} />
                ))}
            </div>
        </aside>
    );
}

function DraggablePlant({ plant }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: plant.id,
        data: {
            type: 'plant',
            plantId: plant.id,
            src: plant.src
        }
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="p-2 rounded cursor-move flex flex-col items-center hover:bg-green-50 border border-transparent hover:border-green-200 transition-colors"
        >
            <img src={plant.src} alt={plant.name} className="w-10 h-10 mb-1 object-contain pointer-events-none" />
            <span className="text-xs font-medium text-gray-600">{plant.name}</span>
        </div>
    );
}
