import { useState } from 'react';
import { GameView } from './components/SillyTavern/GameView';
import { TitleScreen } from './components/game/TitleScreen';

export default function App() {
  const [inGame, setInGame] = useState(false);

  return (
    <>
      <div className={inGame ? 'block' : 'hidden'} style={{ minHeight: '100vh' }}>
        <GameView />
      </div>
      
      {!inGame && (
        <TitleScreen onStartGame={() => setInGame(true)} />
      )}
    </>
  );
}
