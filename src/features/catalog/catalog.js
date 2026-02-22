export const PLANT_CATEGORIES = {
    vegetables: [
        { id: 'tomato', name: 'Tomato', icon: '🍅', color: 'bg-red-500' },
        { id: 'carrot', name: 'Carrot', icon: '🥕', color: 'bg-orange-500' },
        { id: 'lettuce', name: 'Lettuce', icon: '🥬', color: 'bg-green-400' },
        { id: 'pepper', name: 'Pepper', icon: '🫑', color: 'bg-green-600' },
        { id: 'onion', name: 'Onion', icon: '🧅', color: 'bg-yellow-600' },
        { id: 'broccoli', name: 'Broccoli', icon: '🥦', color: 'bg-green-700' },
        { id: 'potato', name: 'Potato', icon: '🥔', color: 'bg-yellow-700' },
        { id: 'bean', name: 'Bean', icon: '🫘', color: 'bg-emerald-600' },
        { id: 'radish', name: 'Radish', icon: '🔴', color: 'bg-pink-500' },
        { id: 'spinach', name: 'Spinach', icon: '🍃', color: 'bg-green-800' },
        { id: 'zucchini', name: 'Zucchini', icon: '🥒', color: 'bg-green-500' },
        { id: 'corn', name: 'Corn', icon: '🌽', color: 'bg-yellow-400' },
        { id: 'eggplant', name: 'Eggplant', icon: '🍆', color: 'bg-purple-700' },
        { id: 'beet', name: 'Beet', icon: '🍠', color: 'bg-rose-800' },
        { id: 'garlic', name: 'Garlic', icon: '🧄', color: 'bg-stone-200' },
    ],
    herbs: [
        { id: 'basil', name: 'Basil', icon: '🌿', color: 'bg-green-500' },
        { id: 'parsley', name: 'Parsley', icon: '🌿', color: 'bg-green-600' },
        { id: 'mint', name: 'Mint', icon: '🍃', color: 'bg-emerald-400' },
        { id: 'rosemary', name: 'Rosemary', icon: '🌲', color: 'bg-green-800' },
        { id: 'thyme', name: 'Thyme', icon: '🌿', color: 'bg-stone-500' },
        { id: 'lavender', name: 'Lavender', icon: '🪻', color: 'bg-purple-400' },
    ],
    flowers: [
        { id: 'sunflower', name: 'Sunflower', icon: '🌻', color: 'bg-yellow-500' },
        { id: 'marigold', name: 'Marigold', icon: '🌼', color: 'bg-orange-400' },
        { id: 'daisy', name: 'Daisy', icon: '🌼', color: 'bg-white' },
        { id: 'tulip', name: 'Tulip', icon: '🌷', color: 'bg-pink-400' },
    ],
    fruits: [
        { id: 'strawberry', name: 'Strawberry', icon: '🍓', color: 'bg-red-600' },
        { id: 'blueberry', name: 'Blueberry', icon: '🫐', color: 'bg-blue-600' },
        { id: 'raspberry', name: 'Raspberry', icon: '🍇', color: 'bg-rose-500' },
    ],
};

export const STRUCTURES = [
    { id: 'raised-bed', name: 'Raised Bed', type: 'structure', width: 4, length: 4, subType: 'raised-bed' },
    { id: 'raised-bed-rect', name: 'Raised Bed (Long)', type: 'structure', width: 2, length: 8, subType: 'raised-bed' },
    { id: 'raised-bed-round', name: 'Round Raised Bed', type: 'structure', width: 4, length: 4, subType: 'raised-bed-round' },
    { id: 'garden-plot', name: 'Garden Plot', type: 'structure', width: 10, length: 10, subType: 'garden-plot' },
    { id: 'garden-plot-small', name: 'Small Plot', type: 'structure', width: 4, length: 8, subType: 'garden-plot' },
];

export const getPlantImage = (id) => {
    for (const categoryName of Object.keys(PLANT_CATEGORIES)) {
        const foundPlant = PLANT_CATEGORIES[categoryName].find((plant) => plant.id === id);
        if (foundPlant) {
            return `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${foundPlant.icon}</text></svg>`;
        }
    }
    return '';
};
