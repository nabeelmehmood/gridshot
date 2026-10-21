import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { fetchTopScores, registerRun } from '../../api';
import { DEFAULT_MODE, MODES, newRolls } from '../../game/modes';
import { createInitialState, gameReducer, PHASES } from '../../game/state';
import { resetStreak, unlockAudio } from '../../sound';
import { readStored, writeStored } from '../../storage';

export const DEFAULT_SETTINGS = {
  sensitivity: 1,
  fov: 75,
  volume: 0.6
};

export const SETTING_LIMITS = {
  sensitivity: { min: 0.1, max: 3, step: 0.05 },
  fov: { min: 40, max: 100, step: 1 },
  volume: { min: 0, max: 1, step: 0.05 }
};

const LOCK_ERROR = 'Mouse capture was blocked. Wait a second and press Start again.';
const EMPTY_LEADERBOARD = { status: 'loading', users: [] };

const isNumber = value => typeof value === 'number' && Number.isFinite(value);
const inRange = key => value =>
  isNumber(value) && value >= SETTING_LIMITS[key].min && value <= SETTING_LIMITS[key].max;

const isBestRun = value =>
  value !== null &&
  typeof value === 'object' &&
  [value.score, value.hits, value.clicks, value.expired].every(Number.isInteger) &&
  (value.runId === null || typeof value.runId === 'string') &&
  typeof value.saved === 'boolean';

const isBestRuns = value =>
  value !== null &&
  typeof value === 'object' &&
  Object.entries(value).every(([mode, run]) => MODES[mode] && isBestRun(run));

// New key on purpose: bests from before run tokens ('topScore') can't be submitted, so they
// start over together with the leaderboard.
const loadProgress = () => ({
  mode: readStored('mode', value => Boolean(MODES[value]), DEFAULT_MODE),
  bestRuns: readStored('bestRuns', isBestRuns, {})
});

// 'mouseSpeed' replaces the old 'sensitivity' key, whose -6..6 scale no longer applies.
const loadSettings = () => ({
  sensitivity: readStored('mouseSpeed', inRange('sensitivity'), DEFAULT_SETTINGS.sensitivity),
  fov: readStored('fov', inRange('fov'), DEFAULT_SETTINGS.fov),
  volume: readStored('volume', inRange('volume'), DEFAULT_SETTINGS.volume)
});

// Chrome rejects raw (unadjusted) input on some platforms; fall back to OS-accelerated input there.
async function requestPointerLock(element) {
  try {
    await element.requestPointerLock({ unadjustedMovement: true });
  } catch (error) {
    if (error?.name !== 'NotSupportedError') throw error;
    await element.requestPointerLock();
  }
}

const GameContext = createContext(null);

export function GameContextProvider({ children }) {
  const [game, dispatch] = useReducer(gameReducer, undefined, () => createInitialState(loadProgress()));
  const [settings, setSettings] = useState(loadSettings);
  const [leaderboards, setLeaderboards] = useState({});
  const [lockError, setLockError] = useState(null);
  const controlsRef = useRef(null);
  const runCounter = useRef(0);

  const { phase, mode, bestRuns } = game;

  useEffect(() => {
    writeStored('mode', mode);
  }, [mode]);

  useEffect(() => {
    writeStored('bestRuns', bestRuns);
  }, [bestRuns]);

  useEffect(() => {
    writeStored('mouseSpeed', settings.sensitivity);
    writeStored('fov', settings.fov);
    writeStored('volume', settings.volume);
  }, [settings]);

  useEffect(() => {
    if (phase !== PHASES.RUNNING) return undefined;
    const timer = setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === PHASES.FINISHED && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, [phase]);

  const loadLeaderboard = useCallback(
    boardMode =>
      fetchTopScores(boardMode).then(
        users => setLeaderboards(current => ({ ...current, [boardMode]: { status: 'ready', users } })),
        () =>
          setLeaderboards(current => ({
            ...current,
            [boardMode]: { ...(current[boardMode] ?? EMPTY_LEADERBOARD), status: 'error' }
          }))
      ),
    []
  );

  useEffect(() => {
    loadLeaderboard(mode);
  }, [loadLeaderboard, mode]);

  const leaderboardFor = useCallback(boardMode => leaderboards[boardMode] ?? EMPTY_LEADERBOARD, [leaderboards]);

  // The server caches the leaderboard for 30s, so a refetch right after saving could miss the new
  // score; insert it locally instead.
  const recordSavedScore = useCallback((boardMode, entry) => {
    setLeaderboards(current => {
      const board = current[boardMode] ?? EMPTY_LEADERBOARD;
      const users = [...board.users, entry].sort((a, b) => b.score - a.score).slice(0, 50);
      return { ...current, [boardMode]: { status: 'ready', users } };
    });
  }, []);

  const requestStart = useCallback(async () => {
    const element = controlsRef.current?.domElement;
    if (!element) return;
    unlockAudio();
    setLockError(null);
    try {
      await requestPointerLock(element);
    } catch {
      setLockError(LOCK_ERROR);
    }
  }, []);

  const startRun = useCallback(() => {
    setLockError(null);
    resetStreak();
    runCounter.current += 1;
    const runKey = runCounter.current;
    dispatch({ type: 'start', runKey, rolls: newRolls() });
    // Offline or server errors just leave the run unsubmittable; the game itself is unaffected.
    registerRun(game.mode).then(
      runId => dispatch({ type: 'runRegistered', runKey, runId }),
      () => {}
    );
  }, [game.mode]);

  const endRun = useCallback(() => dispatch({ type: 'finish' }), []);
  const shoot = useCallback(targetKey => dispatch({ type: 'shot', targetKey, rolls: newRolls() }), []);
  const expire = useCallback(targetKey => dispatch({ type: 'expire', targetKey, rolls: newRolls() }), []);
  const selectMode = useCallback(nextMode => dispatch({ type: 'selectMode', mode: nextMode, rolls: newRolls() }), []);
  const markScoreSaved = useCallback(savedMode => dispatch({ type: 'scoreSaved', mode: savedMode }), []);
  const reportLockError = useCallback(() => setLockError(LOCK_ERROR), []);

  const value = {
    game,
    settings,
    setSettings,
    leaderboardFor,
    loadLeaderboard,
    recordSavedScore,
    lockError,
    controlsRef,
    requestStart,
    startRun,
    endRun,
    shoot,
    expire,
    selectMode,
    markScoreSaved,
    reportLockError
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used inside GameContextProvider');
  return context;
}
