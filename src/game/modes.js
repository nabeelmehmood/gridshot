import { pickFreeSlot, pickTargets, TARGET_SLOTS } from './targets';

// Targets live on the plane in front of the backdrop; x/y are in that plane's coordinates.
const PLANE = { minX: -8, maxX: 8, minY: 1, maxY: 7 };
const CENTER = [0, 4];

// Mode ids are stored on the server; must match MODE_RULES in functions/index.js.
//   lifetimeMs  targets expire after this long (per target via target.lifetimeMs when it varies)
//   expiredLabel what an expired target is called in results
//   untimed     no countdown; the run ends when `lives` run out
//   shape       'disc' renders a clay pigeon instead of a sphere
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
    lifetimeMs: 1100,
    expiredLabel: 'Expired'
  },
  skeet: {
    id: 'skeet',
    name: 'Skeet',
    description: 'Clay discs fly across in an arc. Hit them before they get away.',
    radius: 0.85,
    shape: 'disc',
    expiredLabel: 'Escaped',
    launchEveryMs: 1200,
    maxActive: 2
  },
  spidershot: {
    id: 'spidershot',
    name: 'Spidershot',
    description: 'Centre, then somewhere random, then centre again. Flick out and back.',
    radius: 0.9
  },
  microshot: {
    id: 'microshot',
    name: 'Microshot',
    description: 'Tiny targets right next to the crosshair. Precision over speed.',
    radius: 0.35
  },
  bounce: {
    id: 'bounce',
    name: 'Bounce',
    description: 'Three balls bouncing around the board. Catch them mid-air.',
    radius: 0.9
  },
  survival: {
    id: 'survival',
    name: 'Survival',
    description: "No clock. Targets shrink away faster and faster; let three expire and it's over.",
    radius: 0.9,
    expiredLabel: 'Expired',
    untimed: true,
    lives: 3
  }
};

export const MODE_IDS = Object.keys(MODES);
export const DEFAULT_MODE = 'gridshot';

// Enough random numbers for any single spawn; actions carry them so reducers stay pure.
export const ROLL_COUNT = 12;
export const newRolls = () => Array.from({ length: ROLL_COUNT }, () => Math.random());

const lerp = (min, max, t) => min + (max - min) * t;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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

function randomTarget(key, next) {
  return { key, x: lerp(PLANE.minX, PLANE.maxX, next()), y: lerp(PLANE.minY, PLANE.maxY, next()) };
}

// Skeet: launched from just off one side, flying a gravity arc across the board.
export const SKEET_GRAVITY = 7;
const SKEET_FLOOR = -1.5;
const SKEET_EDGE = 13;

function skeetTarget(key, next) {
  const side = next() < 0.5 ? -1 : 1;
  const x = side * 12;
  const y = lerp(0.5, 2, next());
  const vx = -side * lerp(5, 8, next());
  const vy = lerp(7.5, 9.5, next());
  // The disc escapes when it drops below the board or leaves the far side, whichever is first.
  const untilFloor = (vy + Math.sqrt(vy * vy + 2 * SKEET_GRAVITY * (y - SKEET_FLOOR))) / SKEET_GRAVITY;
  const untilEdge = (SKEET_EDGE + Math.abs(x)) / Math.abs(vx);
  return { key, x, y, vx, vy, lifetimeMs: Math.round(Math.min(untilFloor, untilEdge) * 1000) };
}

export function skeetPosition(target, seconds) {
  return [target.x + target.vx * seconds, target.y + target.vy * seconds - 0.5 * SKEET_GRAVITY * seconds * seconds];
}

function centerTarget(key) {
  return { key, x: CENTER[0], y: CENTER[1], center: true };
}

// Somewhere at least 3 units from the centre, inside the plane.
function awayTarget(key, next) {
  const angle = next() * Math.PI * 2;
  const distance = lerp(3, 8, next());
  return {
    key,
    x: clamp(CENTER[0] + Math.cos(angle) * distance, PLANE.minX, PLANE.maxX),
    y: clamp(CENTER[1] + Math.sin(angle) * distance * 0.6, PLANE.minY, PLANE.maxY)
  };
}

// Microshot: small hops around the crosshair, never on top of the previous target.
const MICRO_BOX = { x: 2.5, minY: 2.5, maxY: 5.5 };
function microTarget(key, next, from = { x: CENTER[0], y: CENTER[1] }) {
  const angle = next() * Math.PI * 2;
  const distance = lerp(0.9, 2.2, next());
  return {
    key,
    x: clamp(from.x + Math.cos(angle) * distance, -MICRO_BOX.x, MICRO_BOX.x),
    y: clamp(from.y + Math.sin(angle) * distance, MICRO_BOX.minY, MICRO_BOX.maxY)
  };
}

// Bounce: start high with a sideways push; the renderer integrates the motion.
export const BOUNCE_BOUNDS = { minX: -9, maxX: 9, minY: 1, maxY: 7.6, gravity: 9 };
function bounceTarget(key, next) {
  return {
    key,
    x: lerp(-7, 7, next()),
    y: lerp(5, 7, next()),
    vx: lerp(3, 5.5, next()) * (next() < 0.5 ? -1 : 1),
    // Speed off the floor on every bounce, so each ball keeps a steady height.
    bounceSpeed: lerp(8, 10.5, next())
  };
}

// Survival: lifetime shrinks as hits pile up, and more targets join.
export function survivalLifetime(hits) {
  return Math.max(750, 2200 - hits * 25);
}
export function survivalTargetCount(hits) {
  return Math.min(3, 1 + Math.floor(hits / 8));
}

function survivalTarget(key, next, hits) {
  return { ...randomTarget(key, next), lifetimeMs: survivalLifetime(hits) };
}

const INITIAL = {
  gridshot: (key, next) => pickTargets(next).map((slot, i) => gridTarget(key + i, slot)),
  strafe: (key, next) => [strafeTarget(key, next)],
  popin: (key, next) => [randomTarget(key, next)],
  skeet: (key, next) => [skeetTarget(key, next)],
  spidershot: key => [centerTarget(key)],
  microshot: (key, next) => [microTarget(key, next)],
  bounce: (key, next) => [0, 1, 2].map(i => bounceTarget(key + i, next)),
  survival: (key, next) => [survivalTarget(key, next, 0)]
};

export function spawnTargets(mode, firstKey, rolls) {
  return INITIAL[mode](firstKey, sequence(rolls));
}

// A fresh target replacing `old`; `hits` is the run's hit count after this shot.
export function nextTarget(mode, targets, old, key, rolls, hits = 0) {
  const next = sequence(rolls);
  switch (mode) {
    case 'gridshot':
      return gridTarget(key, pickFreeSlot(targets.map(target => target.slot), next()));
    case 'strafe':
      return strafeTarget(key, next);
    case 'skeet':
      return skeetTarget(key, next);
    case 'spidershot':
      return old?.center ? awayTarget(key, next) : centerTarget(key);
    case 'microshot':
      return microTarget(key, next, old);
    case 'bounce':
      return bounceTarget(key, next);
    case 'survival':
      return survivalTarget(key, next, hits);
    default:
      return randomTarget(key, next);
  }
}

export function respawnTarget(mode, targets, oldKey, newKey, rolls, hits = 0) {
  const old = targets.find(target => target.key === oldKey);
  const replacement = nextTarget(mode, targets, old, newKey, rolls, hits);
  return targets.map(target => (target.key === oldKey ? replacement : target));
}
