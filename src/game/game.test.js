import { describe, expect, it } from 'vitest';
import { calculateAccuracy, calculateScore, formatAccuracy, GAME_DURATION } from './scoring';
import { MODES, ROLL_COUNT, respawnTarget, spawnTargets, strafePosition } from './modes';
import { pickFreeSlot, pickTargets, TARGET_SLOTS } from './targets';
import { bestRunOf, createInitialState, gameReducer, PHASES } from './state';

const rolls = value => Array.from({ length: ROLL_COUNT }, () => value);
const play = (state, ...actions) => actions.reduce(gameReducer, state);
const ticks = n => Array.from({ length: n }, () => ({ type: 'tick' }));
const start = (runKey = 1) => ({ type: 'start', runKey, rolls: rolls(0.3) });
const shot = targetKey => ({ type: 'shot', targetKey, rolls: rolls(0.6) });

describe('scoring', () => {
  it('awards hits and penalises misses and expired targets', () => {
    expect(calculateScore(10, 12)).toBe(90);
    expect(calculateScore(0, 3)).toBe(-15);
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
    expect(bestRunOf(state)).toEqual({ score: 15, hits: 2, clicks: 3, expired: 0, runId: 'run-abc', saved: false });

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

  it('keeps bests per mode and only switches mode between runs', () => {
    let state = play(createInitialState(), start(), ...ticks(GAME_DURATION));
    state = play(state, { type: 'selectMode', mode: 'strafe', rolls: rolls(0.5) });
    expect(state).toMatchObject({ mode: 'strafe', phase: PHASES.IDLE });
    expect(state.targets).toHaveLength(1);

    const running = play(state, start());
    expect(play(running, { type: 'selectMode', mode: 'gridshot', rolls: rolls(0.5) })).toBe(running);
    expect(play(state, { type: 'selectMode', mode: 'nope', rolls: rolls(0.5) })).toBe(state);
    expect(Object.keys(MODES)).toEqual(['gridshot', 'strafe', 'popin']);
  });
});
