import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { track } from '../../analytics';
import { fetchTopScores, registerRun } from '../../api';
import { DEFAULT_MODE, MODES, newRolls } from '../../game/modes';
import { calculateAccuracy, calculateScore } from '../../game/scoring';
import { createInitialState, gameReducer, PHASES } from '../../game/state';
import { playCountdown, resetStreak, unlockAudio } from '../../sound';
import { readStored, writeStored } from '../../storage';
import { DEFAULT_THEME, THEMES } from '../../themes';
import { CROSSHAIR_STYLES } from '../Crosshair';

export const DEFAULT_SETTINGS = {
  sensitivity: 1,
  fov: 75,
  volume: 0.6,
  theme: DEFAULT_THEME,
  effects: true,
  rawInput: false,
  customCursor: true,
  crosshair: { style: 'cross', color: '#ffffff', size: 22, thickness: 2, gap: 4, outline: true }
};

export const SETTING_LIMITS = {
  sensitivity: { min: 0.05, max: 3, step: 0.05 },
  fov: { min: 40, max: 100, step: 1 },
  volume: { min: 0, max: 1, step: 0.05 },
  crosshairSize: { min: 8, max: 48, step: 1 },
  crosshairThickness: { min: 1, max: 6, step: 0.5 },
  crosshairGap: { min: 0, max: 12, step: 1 }
};

const CROSSHAIR_STYLE_IDS = CROSSHAIR_STYLES.map(style => style.id);
const within = (value, { min, max }) => typeof value === 'number' && value >= min && value <= max;
const isCrosshair = value =>
  value !== null &&
  typeof value === 'object' &&
  CROSSHAIR_STYLE_IDS.includes(value.style) &&
  /^#[0-9a-f]{6}$/i.test(value.color) &&
  within(value.size, SETTING_LIMITS.crosshairSize) &&
  within(value.thickness, SETTING_LIMITS.crosshairThickness) &&
  within(value.gap, SETTING_LIMITS.crosshairGap) &&
  typeof value.outline === 'boolean';

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

const isHistory = value =>
  value !== null &&
  typeof value === 'object' &&
  Object.entries(value).every(
    ([mode, entry]) =>
      MODES[mode] &&
      Number.isInteger(entry?.count) &&
      Array.isArray(entry.runs) &&
      entry.runs.every(run => Number.isInteger(run?.score) && Number.isInteger(run.hits) && Number.isInteger(run.clicks))
  );

// 3, 2, 1 between the camera arriving and the run starting.
const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 600;

// New key on purpose: bests from before run tokens ('topScore') can't be submitted, so they
// start over together with the leaderboard.
const loadProgress = () => ({
  mode: readStored('mode', value => Boolean(MODES[value]), DEFAULT_MODE),
  bestRuns: readStored('bestRuns', isBestRuns, {}),
  history: readStored('runHistory', isHistory, {})
});

// 'lookSensitivity' replaces 'mouseSpeed' (and the older 'sensitivity'): 1 now means desktop-matched,
// so values saved on the old scales would feel wildly off.
const loadSettings = () => ({
  sensitivity: readStored('lookSensitivity', inRange('sensitivity'), DEFAULT_SETTINGS.sensitivity),
  fov: readStored('fov', inRange('fov'), DEFAULT_SETTINGS.fov),
  volume: readStored('volume', inRange('volume'), DEFAULT_SETTINGS.volume),
  theme: readStored('theme', value => Boolean(THEMES[value]), DEFAULT_SETTINGS.theme),
  effects: readStored('effects', value => typeof value === 'boolean', DEFAULT_SETTINGS.effects),
  rawInput: readStored('rawInput', value => typeof value === 'boolean', DEFAULT_SETTINGS.rawInput),
  customCursor: readStored('customCursor', value => typeof value === 'boolean', DEFAULT_SETTINGS.customCursor),
  crosshair: readStored('crosshair', isCrosshair, DEFAULT_SETTINGS.crosshair)
});

// By default the browser applies the OS pointer speed and acceleration, so 1× feels like the desktop.
// Raw input skips both (what competitive players usually want); Chrome rejects it on some platforms,
// so fall back to OS-adjusted input there.
async function requestPointerLock(element, rawInput) {
  if (!rawInput) {
    await element.requestPointerLock();
    return;
  }
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

  const { phase, mode, bestRuns, history } = game;

  // One event per run as it ends: finished runs report the result, Esc reports how long it lasted.
  const { completed, hits, clicks, expired, bonus, bestStreak, newBest, elapsed } = game;
  useEffect(() => {
    if (phase !== PHASES.FINISHED) return;
    if (completed) {
      track('run_complete', {
        mode,
        score: calculateScore(hits, clicks, expired, bonus),
        accuracy: Math.round((calculateAccuracy(hits, clicks) ?? 0) * 10) / 10,
        best_streak: bestStreak,
        new_best: newBest
      });
    } else {
      track('run_abandon', { mode, seconds_played: elapsed });
    }
  }, [phase, completed, mode, hits, clicks, expired, bonus, bestStreak, newBest, elapsed]);

  useEffect(() => {
    writeStored('mode', mode);
  }, [mode]);

  useEffect(() => {
    writeStored('bestRuns', bestRuns);
  }, [bestRuns]);

  useEffect(() => {
    writeStored('runHistory', history);
  }, [history]);

  useEffect(() => {
    writeStored('lookSensitivity', settings.sensitivity);
    writeStored('rawInput', settings.rawInput);
    writeStored('fov', settings.fov);
    writeStored('volume', settings.volume);
    writeStored('theme', settings.theme);
    writeStored('effects', settings.effects);
    writeStored('crosshair', settings.crosshair);
    writeStored('customCursor', settings.customCursor);
  }, [settings]);

  useEffect(() => {
    if (phase !== PHASES.RUNNING) return undefined;
    const timer = setInterval(() => dispatch({ type: 'tick' }), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Skeet keeps throwing discs on a fixed rhythm; the reducer caps how many are in the air.
  const { launchEveryMs } = MODES[mode];
  useEffect(() => {
    if (phase !== PHASES.RUNNING || !launchEveryMs) return undefined;
    const launcher = setInterval(() => dispatch({ type: 'launch', rolls: newRolls() }), launchEveryMs);
    return () => clearInterval(launcher);
  }, [phase, launchEveryMs]);

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
      // The server keeps one entry per name (its best), so mirror that here.
      const name = entry.username.toLowerCase();
      const previous = board.users.find(user => user.username.toLowerCase() === name);
      if (previous && previous.score >= entry.score) return current;
      const others = board.users.filter(user => user.username.toLowerCase() !== name);
      const users = [...others, entry].sort((a, b) => b.score - a.score).slice(0, 50);
      return { ...current, [boardMode]: { status: 'ready', users } };
    });
  }, []);

  const requestStart = useCallback(async () => {
    const element = controlsRef.current?.domElement;
    if (!element) return;
    unlockAudio();
    setLockError(null);
    try {
      await requestPointerLock(element, settings.rawInput);
    } catch {
      setLockError(LOCK_ERROR);
    }
  }, [settings.rawInput]);

  const startRun = useCallback(() => {
    setLockError(null);
    resetStreak();
    runCounter.current += 1;
    const runKey = runCounter.current;
    dispatch({ type: 'start', runKey, rolls: newRolls() });
    track('run_start', { mode: game.mode, theme: settings.theme, crosshair: settings.crosshair.style });
    // Offline or server errors just leave the run unsubmittable; the game itself is unaffected.
    registerRun(game.mode).then(
      runId => dispatch({ type: 'runRegistered', runKey, runId }),
      () => {}
    );
  }, [game.mode, settings.theme, settings.crosshair.style]);

  const endRun = useCallback(() => dispatch({ type: 'finish' }), []);

  // Camera view: 'menu' → 'entering' while the camera glides in (the menu is gone but the run hasn't
  // started) → 'game' once it arrives; back to 'menu' the moment the pointer unlocks.
  // In 'game', countdown runs 3 → 1 before the run itself starts.
  const [view, setView] = useState('menu');
  const [countdown, setCountdown] = useState(0);
  const beginEntering = useCallback(() => setView('entering'), []);
  const enterGame = useCallback(() => {
    setView('game');
    setCountdown(COUNTDOWN_FROM);
    playCountdown(false, settings.volume);
  }, [settings.volume]);
  const leaveGame = useCallback(() => {
    setView('menu');
    setCountdown(0);
    endRun();
  }, [endRun]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setTimeout(() => {
      if (countdown > 1) {
        setCountdown(countdown - 1);
        playCountdown(false, settings.volume);
      } else {
        setCountdown(0);
        playCountdown(true, settings.volume);
        startRun();
      }
    }, COUNTDOWN_STEP_MS);
    return () => clearTimeout(timer);
  }, [countdown, settings.volume, startRun]);
  const shoot = useCallback(targetKey => dispatch({ type: 'shot', targetKey, rolls: newRolls() }), []);
  const expire = useCallback(targetKey => dispatch({ type: 'expire', targetKey, rolls: newRolls() }), []);
  const selectMode = useCallback(nextMode => {
    track('mode_select', { mode: nextMode });
    dispatch({ type: 'selectMode', mode: nextMode, rolls: newRolls() });
  }, []);
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
    view,
    countdown,
    beginEntering,
    enterGame,
    leaveGame,
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
