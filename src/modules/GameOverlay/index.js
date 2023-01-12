import React, { useContext } from 'react';
import { GameContext, GAME_STATES, SCORE_CONSTATS } from '../Context';
import styles from './index.module.css';

const GameOverlay = () => {
  const { timeLeft, score, totalClicks, gameStart } = useContext(GameContext);
  
  const calculateScore = () => {
    const positiveScore = score * SCORE_CONSTATS.HIT;
    const negativeScore = (totalClicks - score) * SCORE_CONSTATS.CLICK_NEGATIVE;
    return positiveScore - negativeScore;
  };

  const showFinishedOverlay = gameStart === GAME_STATES.FINISHED || gameStart === GAME_STATES.NOT_STARTED;
  const totalScore = calculateScore();
  const misses = totalClicks - score;
  const accuracy = ((score / totalClicks) * 100).toFixed(2);
  return (
    <div class={styles.gameOverlay}>
      <div className={styles.counter}>
        <div>
          <span>Time left:</span>
          <span className={styles.count}>{timeLeft}</span>
        </div>
        <div>
          <span>Current score:</span>
          <span className={styles.count}>{totalScore}</span>
        </div>
      </div>
      {showFinishedOverlay && (
        <div className={styles.finishedOverlay}>
          <span>Score: {totalScore}</span>
          <span>Hits: {score}</span>
          <span>Total Clicks: {totalClicks}</span>
          <span>Misses: {misses}</span>
          <span>Accuracy: {accuracy}%</span>
        </div>
      )}
    </div>
  );
};

export default GameOverlay;
