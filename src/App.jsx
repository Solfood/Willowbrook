import React, { useState } from 'react';
import GardenSetup from './components/GardenSetup';
import GardenPlanner from './components/GardenPlanner';

function generateSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('[Willowbrook] Unhandled error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
            <p className="text-lg font-semibold text-gray-800 mb-2">Something went wrong.</p>
            <p className="text-sm text-gray-600 mb-6">Your plan is safe — reload to continue.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [garden, setGarden] = useState(null);

  return (
    <ErrorBoundary>
      {!garden ? (
        <GardenSetup
          onComplete={({ width, length, zone }) => setGarden({ width, length, zone, items: [], sessionId: generateSessionId() })}
        />
      ) : (
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
      )}
    </ErrorBoundary>
  );
}

export default App;
