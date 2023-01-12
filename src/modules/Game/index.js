import { useContext } from 'react';
import Canvas from '../Canvas';
import { GameContext, GAME_STATES } from '../Context';
import Cursor from '../Cursor';
import GameOverlay from '../GameOverlay';
import StartOverlay from '../StartOverlay';

const Game = () => {
  const {gameStart, setTotalClicks} = useContext(GameContext);
  
  const pressListener = (e) => {
    if (gameStart === GAME_STATES.STARTED) {
      setTotalClicks(clicks => clicks + 1);
    }  
  }
  return (
    <div onClick={pressListener} style={{ height: '100vh', width: '100vw' }}>
      <Canvas />
      <Cursor />
      <StartOverlay />
      <GameOverlay />
    </div>
  );
};

export default Game;
