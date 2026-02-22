import React, { useState } from 'react';
import GardenSetup from './components/GardenSetup';
import GardenPlanner from './components/GardenPlanner';

function App() {
  const [garden, setGarden] = useState(null);

  if (!garden) {
    return (
      <GardenSetup
        onComplete={({ width, length }) => setGarden({ width, length, items: [], sessionId: Date.now() })}
      />
    );
  }

  return (
    <GardenPlanner
      key={garden.sessionId}
      width={garden.width}
      length={garden.length}
      initialItems={garden.items}
      onNewGarden={() => setGarden(null)}
      onLoadGarden={({ width, length, items }) => {
        setGarden({ width, length, items, sessionId: Date.now() });
      }}
    />
  );
}

export default App;
