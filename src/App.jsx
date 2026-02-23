import React, { useState } from 'react';
import GardenSetup from './components/GardenSetup';
import GardenPlanner from './components/GardenPlanner';

function App() {
  const [garden, setGarden] = useState(null);

  if (!garden) {
    return (
      <GardenSetup
        onComplete={({ width, length, zone }) => setGarden({ width, length, zone, items: [], sessionId: Date.now() })}
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
        setGarden({ width, length, zone, items, sessionId: Date.now() });
      }}
    />
  );
}

export default App;
