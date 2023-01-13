import axios from 'axios';
import React, { useContext, useEffect, useState } from 'react';
import { addScore } from '../../api';
import { GameContext, GAME_STATES, SCORE_CONSTATS } from '../Context';
import Filter from 'bad-words';
import styles from './index.module.css';

const usernameRegex = /^(?=[a-zA-Z0-9._]{3,20}$)(?!.*[_.]{2})[^_.].*[^_.]$/;
const filter = new Filter();

const GameOverlay = () => {
  const {
    timeLeft,
    score,
    totalClicks,
    gameStart,
    topScore,
    setTopScore,
    scoreSaved,
    setScoreSaved,
    leaderboard,
    getScores
  } = useContext(GameContext);

  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [spinner, setSpinner] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const calculateScore = () => {
    const positiveScore = score * SCORE_CONSTATS.HIT;
    const negativeScore = (totalClicks - score) * SCORE_CONSTATS.CLICK_NEGATIVE;
    return positiveScore - negativeScore;
  };

  const showFinishedOverlay =
    gameStart === GAME_STATES.FINISHED || gameStart === GAME_STATES.NOT_STARTED;
  const totalScore = calculateScore();
  const misses = totalClicks - score;
  const accuracy = ((score / totalClicks) * 100).toFixed(2);

  const showSaveScore = gameStart === GAME_STATES.FINISHED && !scoreSaved && topScore;
  const topScorer = leaderboard && leaderboard[0];
  useEffect(() => {
    if (gameStart === GAME_STATES.FINISHED) {
      const total = calculateScore();
      if (total > topScore) {
        setTopScore(total);
        setScoreSaved(false);
        localStorage.setItem('topScore', total);
      }
    }
  }, [gameStart]);

  const submitForm = async () => {
    if (!username || !usernameRegex.test(username)) {
      setError(
        'Please enter a valid username. Alpha-numeric between 3-20 characters'
      );
    } else {
      try {
        setSpinner(true);
        const res = await axios.post(addScore, {
          user: {
            username: username,
            score: Number(topScore)
          }
        });
        setSpinner(false);
        if (res.status === 200) {
          setScoreSaved(true);
          getScores();
        }
      } catch (e) {
        setSpinner(false);
        console.log(e);
      }
    }
  };

  return (
    <div class={styles.gameOverlay}>
      <div className={styles.counter}>
        <div>
          <span style={{ fontSize: '20px' }}>Time left:</span>
          <span style={{ color: 'red' }} className={styles.count}>
            {timeLeft}
          </span>
        </div>
        <div>
          <span>Current score:</span>
          <span className={styles.count}>{totalScore}</span>
        </div>
      </div>
      {topScorer && (
        <div className={styles.topScorer}>
          <div>Top Scorer</div>
          <div>
            {filter.clean(topScorer.username)} : {topScorer.score}
          </div>
          <div
            className={styles.leaderboardButton}
            onClick={() => setShowLeaderboard(true)}
          >
            See leaderboard
          </div>
        </div>
      )}
      {showFinishedOverlay && (
        <div className={styles.finishedOverlay}>
          <span>Score: {totalScore}</span>
          <span>Hits: {score}</span>
          <span>Total Clicks: {totalClicks}</span>
          <span>Misses: {misses}</span>
          <span>Accuracy: {isNaN(accuracy) ? 'N/A' : `${accuracy}%`}</span>
          <span>Best Score: {topScore}</span>
        </div>
      )}
      {showSaveScore && (
        <div className={styles.saveScoreForm}>
          <span className={styles.formDesc}>
            Save your top score on the leaderboards.
          </span>
          <span className={styles.formInput}>
            Enter name:{' '}
            <input
              type="text"
              value={username}
              onChange={e => {
                setUsername(e.target.value);
              }}
            />
            {spinner && <div className={styles.lds_dual_ring}></div>}
          </span>
          <span
            className={styles.error}
            style={{ display: error ? 'inline' : 'none' }}
          >
            {error}
          </span>
          <button disabled={spinner} onClick={submitForm}>
            Submit
          </button>
        </div>
      )}
      {showLeaderboard && (
        <div className={styles.leaderboardModal}>
          <div
            className={styles.closeButton}
            onClick={() => setShowLeaderboard(false)}
          >
            close
          </div>
          <div className={styles.leadersList}>
            <div className={styles.leadersItem}>
              <span>Name</span>
              <span>Score</span>
            </div>
            {leaderboard &&
              leaderboard.map((item, index) => {
                return (
                  <div className={styles.leadersItem}>
                    <span>{index + 1}. {filter.clean(item.username)}</span> 
                    <span>{item.score}</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameOverlay;
