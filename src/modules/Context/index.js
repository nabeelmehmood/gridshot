import { createContext, useEffect, useState } from 'react';

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
}

let timerInterval;

const GameContextProvider = ({ children }) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameStart, setGameStart] = useState(GAME_STATES.NOT_STARTED);
  const [score, setScore] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);

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
        setTotalClicks
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export { GameContext, GameContextProvider, GAME_STATES, SCORE_CONSTATS };
