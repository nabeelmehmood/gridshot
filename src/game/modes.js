import { pickFreeSlot, pickTargets, TARGET_SLOTS } from './targets';

// Targets live on the back wall plane; x/y are in that plane's coordinates.
const PLANE = { minX: -8, maxX: 8, minY: 1, maxY: 7 };

// Mode ids are stored on the server; must match MODES in functions/index.js.
export const MODES = {
  gridshot: {
    id: 'gridshot',
    name: 'Gridshot',
    description: 'Three targets on a grid. Clear them as fast as you can.',
    radius: 1
  },
  strafe: {
    id: 'strafe',
    name: 'Strafe',
    description: 'One target glides around the wall. Track it and click.',
    radius: 0.9
  },
  popin: {
    id: 'popin',
    name: 'Pop-in',
    description: 'Targets flash up and shrink away. Each one you let expire costs points.',
    radius: 0.85,
    lifetimeMs: 1100
  }
};

export const MODE_IDS = Object.keys(MODES);
export const DEFAULT_MODE = 'gridshot';

// Enough random numbers for any single spawn; actions carry them so reducers stay pure.
export const ROLL_COUNT = 12;
export const newRolls = () => Array.from({ length: ROLL_COUNT }, () => Math.random());

const lerp = (min, max, t) => min + (max - min) * t;

function sequence(rolls) {
  let i = 0;
  return () => rolls[i++ % rolls.length];
}

function gridTarget(key, slot) {
  const [x, y] = TARGET_SLOTS[slot];
  return { key, slot, x, y };
}

// Two out-of-phase sine waves trace a smooth looping path that stays inside PLANE.
function strafeTarget(key, next) {
  return {
    key,
    cx: lerp(-3, 3, next()),
    cy: lerp(3.5, 4.5, next()),
    ax: lerp(3, 5, next()),
    ay: lerp(1, 2.5, next()),
    wx: lerp(0.6, 1.2, next()) * (next() < 0.5 ? -1 : 1),
    wy: lerp(0.8, 1.6, next()),
    px: lerp(0, 2 * Math.PI, next()),
    py: lerp(0, 2 * Math.PI, next())
  };
}

export function strafePosition(target, seconds) {
  return [
    target.cx + target.ax * Math.sin(target.wx * seconds + target.px),
    target.cy + target.ay * Math.sin(target.wy * seconds + target.py)
  ];
}

function popinTarget(key, next) {
  return { key, x: lerp(PLANE.minX, PLANE.maxX, next()), y: lerp(PLANE.minY, PLANE.maxY, next()) };
}

export function spawnTargets(mode, firstKey, rolls) {
  const next = sequence(rolls);
  if (mode === 'strafe') return [strafeTarget(firstKey, next)];
  if (mode === 'popin') return [popinTarget(firstKey, next)];
  return pickTargets(next).map((slot, i) => gridTarget(firstKey + i, slot));
}

export function respawnTarget(mode, targets, oldKey, newKey, rolls) {
  const next = sequence(rolls);
  let replacement;
  if (mode === 'strafe') replacement = strafeTarget(newKey, next);
  else if (mode === 'popin') replacement = popinTarget(newKey, next);
  else replacement = gridTarget(newKey, pickFreeSlot(targets.map(target => target.slot), next()));
  return targets.map(target => (target.key === oldKey ? replacement : target));
}
