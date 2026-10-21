import { describe, expect, it } from 'vitest';
import {
  calculateAccuracy,
  calculateScore,
  formatAccuracy,
  GAME_DURATION,
  maxStreakBonus,
  streakBonus
} from './scoring';
import { MODES, ROLL_COUNT, respawnTarget, skeetPosition, spawnTargets, strafePosition } from './modes';
import { pickFreeSlot, pickTargets, TARGET_SLOTS } from './targets';
import { bestRunOf, createInitialState, gameReducer, PHASES } from './state';
import { USERNAME_PATTERN } from './username';

const rolls = value => Array.from({ length: ROLL_COUNT }, () => value);
const play = (state, ...actions) => actions.reduce(gameReducer, state);
const ticks = n => Array.from({ length: n }, () => ({ type: 'tick' }));
const start = (runKey = 1) => ({ type: 'start', runKey, rolls: rolls(0.3) });
const shot = targetKey => ({ type: 'shot', targetKey, rolls: rolls(0.6) });

describe('scoring', () => {
  it('awards hits and penalises misses and expired targets', () => {
    expect(calculateScore(10, 12)).toBe(80);
    expect(calculateScore(0, 3)).toBe(-30);
    expect(calculateScore(4, 4, 2)).toBe(30);
  });

  it('reports no accuracy before the first click', () => {
    expect(calculateAccuracy(0, 0)).toBeNull();
    expect(formatAccuracy(0, 0)).toBe('–');
    expect(formatAccuracy(3, 4)).toBe('75.0%');
  });
});

describe('targets', () => {
  it('picks distinct grid slots and never respawns onto an occupied one', () => {
    for (let i = 0; i < 50; i++) {
      const slots = pickTargets();
      expect(new Set(slots).size).toBe(3);
      slots.forEach(id => expect(TARGET_SLOTS[id]).toBeDefined());
    }
    for (const roll of [0, 0.5, 0.999]) {
      expect([0, 1, 2]).not.toContain(pickFreeSlot([0, 1, 2], roll));
    }
  });

  it('spawns one moving target for strafe that stays on the wall', () => {
    for (const roll of [0, 0.5, 0.999]) {
      const [target] = spawnTargets('strafe', 0, rolls(roll));
      for (let t = 0; t < 30; t += 0.25) {
        const [x, y] = strafePosition(target, t);
        expect(Math.abs(x)).toBeLessThanOrEqual(8 + 1e-9);
        expect(y).toBeGreaterThanOrEqual(1 - 1e-9);
        expect(y).toBeLessThanOrEqual(7 + 1e-9);
      }
    }
  });

  it('replaces only the hit target with a fresh key', () => {
    const targets = spawnTargets('gridshot', 0, rolls(0.2));
    const next = respawnTarget('gridshot', targets, targets[1].key, 9, rolls(0.7));
    expect(next.map(target => target.key)).toEqual([targets[0].key, 9, targets[2].key]);
    expect(new Set(next.map(target => target.slot)).size).toBe(3);
    expect(next[1].slot).not.toBe(targets[1].slot);
  });
});

describe('game lifecycle', () => {
  it('plays a full run, records a new best with its run token', () => {
    let state = play(createInitialState(), start(7));
    expect(state.phase).toBe(PHASES.RUNNING);
    const [first, second] = state.targets;

    state = play(state, shot(first.key), shot(null), shot(second.key));
    expect(state).toMatchObject({ hits: 2, clicks: 3 });
    expect(state.targets.map(target => target.key)).not.toContain(first.key);
    expect(new Set(state.targets.map(target => target.key)).size).toBe(3);

    state = play(state, { type: 'runRegistered', runKey: 7, runId: 'run-abc' }, ...ticks(GAME_DURATION));
    expect(state).toMatchObject({ phase: PHASES.FINISHED, timeLeft: 0, completed: true, newBest: true });
    expect(bestRunOf(state)).toEqual({
      score: 10,
      hits: 2,
      clicks: 3,
      expired: 0,
      bonus: 0,
      bestStreak: 1,
      runId: 'run-abc',
      saved: false
    });

    // Input after the run ends is ignored.
    expect(play(state, shot(state.targets[0].key), { type: 'tick' })).toBe(state);

    state = play(state, { type: 'scoreSaved', mode: 'gridshot' });
    expect(bestRunOf(state).saved).toBe(true);
  });

  it('attaches a run token that arrives after the run ended, but not to a later run', () => {
    let state = play(createInitialState(), start(1), shot(null), ...ticks(GAME_DURATION));
    expect(state.newBest).toBe(false);

    state = play(createInitialState(), start(2));
    state = play(state, shot(state.targets[0].key), ...ticks(GAME_DURATION));
    state = play(state, { type: 'runRegistered', runKey: 2, runId: 'late' });
    expect(bestRunOf(state).runId).toBe('late');

    const next = play(state, start(3), { type: 'runRegistered', runKey: 2, runId: 'stale' });
    expect(next.runId).toBeNull();
  });

  it('does not let a run ended early with Esc set a best', () => {
    let state = play(createInitialState(), start());
    state = play(state, shot(state.targets[0].key), { type: 'finish' });
    expect(state).toMatchObject({ phase: PHASES.FINISHED, completed: false, newBest: false });
    expect(bestRunOf(state)).toBeNull();
  });

  it('counts expired pop-in targets and respawns them', () => {
    let state = play(createInitialState({ mode: 'popin' }), start());
    const [target] = state.targets;
    state = play(state, { type: 'expire', targetKey: target.key, rolls: rolls(0.9) });
    expect(state.expired).toBe(1);
    expect(state.targets).toHaveLength(1);
    expect(state.targets[0].key).not.toBe(target.key);

    // A stale timer for a target that's already gone changes nothing.
    expect(play(state, { type: 'expire', targetKey: target.key, rolls: rolls(0.1) })).toBe(state);
  });

  it('launches skeet discs up to the limit, removes hit discs and counts escapes', () => {
    let state = play(createInitialState({ mode: 'skeet' }), start());
    expect(state.targets).toHaveLength(1);
    const [disc] = state.targets;
    expect(disc.lifetimeMs).toBeGreaterThan(1000);
    expect(Math.abs(disc.vx)).toBeGreaterThan(0);

    state = play(state, { type: 'launch', rolls: rolls(0.2) }, { type: 'launch', rolls: rolls(0.7) });
    expect(state.targets).toHaveLength(MODES.skeet.maxActive);

    state = play(state, shot(disc.key));
    expect(state).toMatchObject({ hits: 1, clicks: 1 });
    expect(state.targets.map(t => t.key)).not.toContain(disc.key);

    const [other] = state.targets;
    state = play(state, { type: 'expire', targetKey: other.key, rolls: rolls(0.5) });
    expect(state).toMatchObject({ expired: 1, targets: [] });
  });

  it('keeps a skeet disc inside the arc until it escapes', () => {
    for (const roll of [0, 0.5, 0.999]) {
      const [disc] = spawnTargets('skeet', 0, rolls(roll));
      const [, y] = skeetPosition(disc, disc.lifetimeMs / 1000 / 2);
      expect(y).toBeGreaterThan(1);
      expect(y).toBeLessThan(9.5);
    }
  });

  it('alternates spidershot targets between the centre and away from it', () => {
    let state = play(createInitialState({ mode: 'spidershot' }), start());
    expect(state.targets[0]).toMatchObject({ x: 0, y: 4, center: true });
    state = play(state, shot(state.targets[0].key));
    const away = state.targets[0];
    expect(away.center).toBeUndefined();
    expect(Math.hypot(away.x, away.y - 4)).toBeGreaterThan(1.5);
    state = play(state, shot(away.key));
    expect(state.targets[0]).toMatchObject({ x: 0, y: 4, center: true });
  });

  it('keeps microshot targets near the crosshair and moving', () => {
    let state = play(createInitialState({ mode: 'microshot' }), start());
    for (let i = 0; i < 20; i++) {
      const [target] = state.targets;
      expect(Math.abs(target.x)).toBeLessThanOrEqual(2.5);
      expect(target.y).toBeGreaterThanOrEqual(2.5);
      expect(target.y).toBeLessThanOrEqual(5.5);
      state = play(state, { type: 'shot', targetKey: target.key, rolls: rolls((i * 0.37) % 1) });
      expect(Math.hypot(state.targets[0].x - target.x, state.targets[0].y - target.y)).toBeGreaterThan(0.3);
    }
  });

  it('keeps three bouncing balls in play', () => {
    let state = play(createInitialState({ mode: 'bounce' }), start());
    expect(state.targets).toHaveLength(3);
    state = play(state, shot(state.targets[1].key));
    expect(state.targets).toHaveLength(3);
    expect(state.hits).toBe(1);
  });

  it('runs survival without a clock until three targets expire', () => {
    let state = play(createInitialState({ mode: 'survival' }), start(4));
    expect(state).toMatchObject({ lives: 3 });
    state = play(state, ...ticks(GAME_DURATION + 30));
    expect(state).toMatchObject({ phase: PHASES.RUNNING, elapsed: GAME_DURATION + 30 });

    // Targets get shorter-lived and more numerous as hits pile up.
    const firstLifetime = state.targets[0].lifetimeMs;
    for (let i = 0; i < 16; i++) state = play(state, shot(state.targets[0].key));
    expect(state.targets.length).toBe(3);
    expect(Math.max(...state.targets.map(t => t.lifetimeMs))).toBeLessThan(firstLifetime);

    for (let life = 3; life > 0; life--) {
      state = play(state, { type: 'expire', targetKey: state.targets[0].key, rolls: rolls(0.4) });
    }
    expect(state).toMatchObject({ phase: PHASES.FINISHED, lives: 0, expired: 3, completed: true, newBest: true });
  });

  it('keeps bests per mode and only switches mode between runs', () => {
    let state = play(createInitialState(), start(), ...ticks(GAME_DURATION));
    state = play(state, { type: 'selectMode', mode: 'strafe', rolls: rolls(0.5) });
    expect(state).toMatchObject({ mode: 'strafe', phase: PHASES.IDLE });
    expect(state.targets).toHaveLength(1);

    const running = play(state, start());
    expect(play(running, { type: 'selectMode', mode: 'gridshot', rolls: rolls(0.5) })).toBe(running);
    expect(play(state, { type: 'selectMode', mode: 'nope', rolls: rolls(0.5) })).toBe(state);
    expect(Object.keys(MODES)).toEqual(['gridshot', 'strafe', 'popin', 'skeet', 'spidershot', 'microshot', 'bounce', 'survival']);
  });
});

describe('usernames', () => {
  it('allows usual gamertags', () => {
    for (const name of ['Nabeel', 'aim_god', 'x-ray.99', 'abc', 'Sixteen_chars-ok']) {
      expect(USERNAME_PATTERN.test(name), name).toBe(true);
    }
  });

  it('rejects odd characters, edge symbols and long names', () => {
    for (const name of ['ab', 'seventeen_chars_x', 'has space', 'émile', 'x<script>', 'zalgo̵', '_lead', 'trail-', 'a..b', 'a_-b', '😀😀😀']) {
      expect(USERNAME_PATTERN.test(name), name).toBe(false);
    }
  });
});

describe('streaks', () => {
  const hitFirst = state => shot(state.targets[0].key);
  const hitMany = (state, n) => {
    for (let i = 0; i < n; i++) state = play(state, hitFirst(state));
    return state;
  };

  it('adds +1 per hit for every 10 in a row, capped at +4', () => {
    expect([1, 9, 10, 19, 20, 39, 40, 200].map(streakBonus)).toEqual([0, 0, 1, 1, 2, 3, 4, 4]);
    expect(maxStreakBonus(9)).toBe(0);
    expect(maxStreakBonus(12)).toBe(3);
    expect(maxStreakBonus(50)).toBe(10 + 20 + 30 + 11 * 4);
  });

  it('builds a bonus, and a miss resets the streak and flags the break', () => {
    let state = hitMany(play(createInitialState(), start()), 12);
    expect(state).toMatchObject({ streak: 12, bestStreak: 12, bonus: 3, streakBreaks: 0 });
    state = play(state, shot(null));
    expect(state).toMatchObject({ streak: 0, bestStreak: 12, bonus: 3, streakBreaks: 1, lostStreak: 12 });
    state = play(state, ...ticks(GAME_DURATION));
    expect(bestRunOf(state)).toMatchObject({ score: 120 + 3 - 10, bonus: 3, bestStreak: 12 });
  });

  it('lets short streaks break quietly and resets on expired targets', () => {
    let state = play(createInitialState({ mode: 'popin' }), start());
    state = hitMany(state, 5);
    state = play(state, shot(null));
    expect(state).toMatchObject({ streak: 0, streakBreaks: 0 });
    state = hitMany(state, 10);
    state = play(state, { type: 'expire', targetKey: state.targets[0].key, rolls: rolls(0.4) });
    expect(state).toMatchObject({ streak: 0, streakBreaks: 1, lostStreak: 10, bonus: 1 });
  });
});
