import { calculateScore, GAME_DURATION } from './scoring';
import { DEFAULT_MODE, MODES, newRolls, respawnTarget, spawnTargets } from './modes';

export const PHASES = {
  IDLE: 'idle',
  RUNNING: 'running',
  FINISHED: 'finished'
};

// bestRuns[mode]: { score, hits, clicks, expired, runId, saved } for the best full-length run.
// runId is the server token that makes it submittable (null if the server couldn't be reached).
export function createInitialState({ mode = DEFAULT_MODE, bestRuns = {} } = {}) {
  return {
    phase: PHASES.IDLE,
    mode,
    timeLeft: GAME_DURATION,
    hits: 0,
    clicks: 0,
    expired: 0,
    targets: spawnTargets(mode, 0, newRolls()),
    nextKey: 3,
    runKey: null,
    runId: null,
    completed: false,
    newBest: false,
    bestRuns
  };
}

export const bestRunOf = state => state.bestRuns[state.mode] ?? null;

function withTargets(state, targets) {
  return { ...state, targets, nextKey: Math.max(state.nextKey, ...targets.map(target => target.key)) + 1 };
}

function respawn(state, oldKey, rolls) {
  return withTargets(state, respawnTarget(state.mode, state.targets, oldKey, state.nextKey, rolls));
}

// Only runs that reach the end of the timer count: ending early with Esc can't set a best.
function finishRun(state, completed) {
  const { mode, hits, clicks, expired, runId } = state;
  const score = calculateScore(hits, clicks, expired);
  const newBest = completed && score > (bestRunOf(state)?.score ?? 0);
  return {
    ...state,
    phase: PHASES.FINISHED,
    completed,
    newBest,
    bestRuns: newBest
      ? { ...state.bestRuns, [mode]: { score, hits, clicks, expired, runId, saved: false } }
      : state.bestRuns
  };
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'selectMode':
      if (state.phase === PHASES.RUNNING || !MODES[action.mode]) return state;
      return withTargets(
        { ...state, phase: PHASES.IDLE, mode: action.mode, newBest: false },
        spawnTargets(action.mode, state.nextKey, action.rolls)
      );
    case 'start':
      return withTargets(
        {
          ...state,
          phase: PHASES.RUNNING,
          timeLeft: GAME_DURATION,
          hits: 0,
          clicks: 0,
          expired: 0,
          runKey: action.runKey,
          runId: null,
          completed: false,
          newBest: false
        },
        spawnTargets(state.mode, state.nextKey, action.rolls)
      );
    case 'runRegistered': {
      // The token request may resolve after its run has ended; it still belongs to that run.
      if (action.runKey !== state.runKey) return state;
      const best = bestRunOf(state);
      const patchBest = state.newBest && best && !best.runId;
      return {
        ...state,
        runId: action.runId,
        bestRuns: patchBest ? { ...state.bestRuns, [state.mode]: { ...best, runId: action.runId } } : state.bestRuns
      };
    }
    case 'tick':
      if (state.phase !== PHASES.RUNNING) return state;
      if (state.timeLeft > 1) return { ...state, timeLeft: state.timeLeft - 1 };
      return finishRun({ ...state, timeLeft: 0 }, true);
    case 'shot': {
      if (state.phase !== PHASES.RUNNING) return state;
      const hit = action.targetKey != null && state.targets.some(target => target.key === action.targetKey);
      const counted = { ...state, clicks: state.clicks + 1, hits: hit ? state.hits + 1 : state.hits };
      return hit ? respawn(counted, action.targetKey, action.rolls) : counted;
    }
    case 'expire':
      if (state.phase !== PHASES.RUNNING || !state.targets.some(target => target.key === action.targetKey)) {
        return state;
      }
      return respawn({ ...state, expired: state.expired + 1 }, action.targetKey, action.rolls);
    case 'finish':
      return state.phase === PHASES.RUNNING ? finishRun(state, false) : state;
    case 'scoreSaved': {
      const best = state.bestRuns[action.mode];
      if (!best) return state;
      return { ...state, bestRuns: { ...state.bestRuns, [action.mode]: { ...best, saved: true } } };
    }
    default:
      return state;
  }
}
