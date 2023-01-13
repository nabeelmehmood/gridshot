import axios from 'axios';
import { createContext, useEffect, useState } from 'react';
import { getTopScores } from '../../api';

const GameContext = createContext();

const GAME_STATES = {
  NOT_STARTED: 'NOT_STARTED',
  START_TIMER: 'START_TIMER',
  STARTED: 'STARTED',
  FINISHED: 'FINISHED'
};

const SCORE_CONSTATS = {
  HIT: 10,
  CLICK_NEGATIVE: 5
};

const DEFAULT_CAMERA = {
  FOV: 75,
  SENSITIVITY: 0
};

let timerInterval;

const GameContextProvider = ({ children }) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameStart, setGameStart] = useState(GAME_STATES.NOT_STARTED);
  const [score, setScore] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [topScore, setTopScore] = useState(0);
  const [fov, setFov] = useState(DEFAULT_CAMERA.FOV);
  const [sensitivity, setSensitivity] = useState(DEFAULT_CAMERA.SENSITIVITY);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [leaderboard, setLeaderboard] = useState();

  const getScores = () => {
    axios.get(getTopScores).then(res => {
      if (res.data && res.data.users) {
        setLeaderboard(res.data.users);
      }
    });
  };

  useEffect(() => {
    const topScoreLocal = localStorage.getItem('topScore');
    const sensitivityLocal = localStorage.getItem('sensitivity');
    const fovLocal = localStorage.getItem('fov');
    const scoreSavedLocal = localStorage.getItem('scoreSaved');
    if (topScoreLocal) {
      setTopScore(JSON.parse(topScoreLocal));
    }
    if (fovLocal) {
      setFov(JSON.parse(fovLocal));
    }
    if (sensitivityLocal) {
      setSensitivity(JSON.parse(sensitivityLocal));
    }
    if (scoreSavedLocal) {
      setScoreSaved(JSON.parse(scoreSavedLocal));
    }
    getScores();
  }, []);

  useEffect(() => {
    localStorage.setItem('sensitivity', sensitivity);
    localStorage.setItem('fov', fov);
  }, [sensitivity, fov]);

  useEffect(() => {
    localStorage.setItem('scoreSaved', scoreSaved);
  }, [scoreSaved]);

  useEffect(() => {
    //controls timer
    if (gameStart === GAME_STATES.START_TIMER) {
      timerInterval = setInterval(() => {
        setTimeLeft(time => {
          if (time > 1) {
            return time - 1;
          } else {
            clearInterval(timerInterval);
            setGameStart(GAME_STATES.FINISHED);
            return 0;
          }
        });
      }, 1000);
      setGameStart(GAME_STATES.STARTED);
    }
    if (gameStart === GAME_STATES.FINISHED) {
      clearInterval(timerInterval);
    }
  }, [gameStart]);

  return (
    <GameContext.Provider
      value={{
        timeLeft,
        setTimeLeft,
        score,
        setScore,
        gameStart,
        setGameStart,
        totalClicks,
        setTotalClicks,
        topScore,
        setTopScore,
        fov,
        setFov,
        sensitivity,
        setSensitivity,
        scoreSaved,
        setScoreSaved,
        leaderboard,
        getScores
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export {
  GameContext,
  GameContextProvider,
  GAME_STATES,
  SCORE_CONSTATS,
  DEFAULT_CAMERA
};
