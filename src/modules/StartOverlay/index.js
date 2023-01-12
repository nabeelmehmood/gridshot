import { useContext } from 'react';
import { GameContext, GAME_STATES } from '../Context';
import './index.css';

const StartOverlay = () => {
  const { gameStart, setGameStart } = useContext(GameContext);

  const showReset = gameStart === GAME_STATES.FINISHED;

  return (
    <div id="startOverlay">
      <h3 className="text">
        Click the yellow circle in the center to start. Press ESC to exit.
      </h3>
      {<div id="startButton" className={showReset ? 'disableStart' : ''} />}
      {!showReset && <div className="clickTip">Click the Yellow circle</div>}
      {showReset && (
        <button
          className="retryButton"
          onClick={() => setGameStart(GAME_STATES.NOT_STARTED)}
        >
          Try Again?
        </button>
      )}
    </div>
  );
};

export default StartOverlay;
