# Willowbrook Garden Planner

Willowbrook is a React + Vite garden layout planner for designing raised beds and plant placements on a snap grid.

## Features
- Create a garden by width/length in feet.
- Place plants and structures on a 0.5ft snap grid.
- Move items, delete items, and use undo/redo history.
- Mobile-friendly camera controls: pan, pinch-zoom, fit-to-screen.
- Save and load plans as JSON.
- Print-ready layout for paper/PDF export.

## Tech Stack
- React 19
- Vite 7
- Tailwind CSS
- Lucide icons
- ESLint (flat config)

## Project Structure
- `src/components/`
  - `GardenSetup.jsx`: garden dimension entry screen
  - `GardenPlanner.jsx`: planner canvas, interactions, save/load
  - `Sidebar.jsx`: plant/structure selection and shopping list
- `src/features/planner/`
  - `planReducer.js`: planner domain state and history transitions
  - `planSchema.js`: JSON plan validation/parsing
- `src/features/catalog/`
  - `catalog.js`: plant catalog, structures, icon helpers

## Plan File Format
Saved plans use JSON with schema metadata:

```json
{
  "schemaVersion": 1,
  "width": 10,
  "length": 12,
  "items": []
}
```

`width` and `length` are required positive numbers. `items` must be a valid planner item array.

## Local Development

```bash
npm install
npm run dev
```

## Quality Checks

```bash
npm run lint
npm run build
```

## Deployment
GitHub Pages deployment is handled by `.github/workflows/deploy.yml` on pushes to `main`.
