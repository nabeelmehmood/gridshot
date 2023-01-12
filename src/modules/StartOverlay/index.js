import { useContext, useState } from 'react';
import { DEFAULT_CAMERA, GameContext, GAME_STATES } from '../Context';
import './index.css';

const StartOverlay = () => {
  const { gameStart, setGameStart, sensitivity, setSensitivity, fov, setFov } =
    useContext(GameContext);
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
      <div className="slidersWrapper">
        <div className="slider">
          <div>Sensitivity: {sensitivity}</div>
          <input
            type="range"
            min={-6}
            max={6}
            value={sensitivity}
            onChange={e => setSensitivity(e.target.value)}
          />
        </div>
        <div className="slider">
          <div>FOV: {fov}</div>
          <input
            type="range"
            min={40}
            max={100}
            value={fov}
            onChange={e => setFov(e.target.value)}
          />
        </div>
        <div>
          <button
            onClick={() => {
              setSensitivity(DEFAULT_CAMERA.SENSITIVITY);
              setFov(DEFAULT_CAMERA.FOV);
            }}
          >
            Reset Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartOverlay;
