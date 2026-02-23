import React, { useState } from 'react';
import GardenSetup from './components/GardenSetup';
import GardenPlanner from './components/GardenPlanner';

function generateSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function App() {
  const [garden, setGarden] = useState(null);

  if (!garden) {
    return (
      <GardenSetup
        onComplete={({ width, length, zone }) => setGarden({ width, length, zone, items: [], sessionId: generateSessionId() })}
      />
    );
  }

  return (
    <GardenPlanner
      key={garden.sessionId}
      width={garden.width}
      length={garden.length}
      zone={garden.zone}
      initialItems={garden.items}
      onNewGarden={() => setGarden(null)}
      onLoadGarden={({ width, length, zone, items }) => {
        setGarden({ width, length, zone, items, sessionId: generateSessionId() });
      }}
    />
  );
}

export default App;
