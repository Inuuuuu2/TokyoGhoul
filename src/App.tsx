import { useState } from 'react';
import { GameView } from './components/SillyTavern/GameView';
import { OpeningSequence } from './components/game/OpeningSequence';

export default function App() {
  const [showOpening, setShowOpening] = useState(true);

  return (
    <>
      {showOpening && <OpeningSequence onComplete={() => setShowOpening(false)} />}
      <div style={{ display: showOpening ? 'none' : 'block' }}>
        <GameView />
      </div>
    </>
  );
}
