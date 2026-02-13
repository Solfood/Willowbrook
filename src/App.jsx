import React, { useState } from 'react';
import GardenSetup from './components/GardenSetup';
import GardenPlanner from './components/GardenPlanner';

function App() {
  const [garden, setGarden] = useState(null);

  if (!garden) {
    return <GardenSetup onComplete={setGarden} />;
  }

  return (
    <GardenPlanner
      width={garden.width}
      length={garden.length}
      onNewGarden={() => setGarden(null)}
    />
  );
}

export default App;
