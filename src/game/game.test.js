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
import { avgHitMs, bestRunOf, createInitialState, gameReducer, HISTORY_SIZE, paceVsBest, PHASES } from './state';
import { USERNAME_PATTERN } from './username';
import { RANK_THRESHOLDS, rankFor } from './ranks';
import { summarizeMisses } from './missMap';
import { placementOn } from './placement';
import { cmPer360, degreesPerCount, isGameSens } from './sensitivity';

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
      timeline: [10, ...Array(GAME_DURATION - 1).fill(10)],
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

describe('timeline, history and pacing', () => {
  const hitFirst = state => shot(state.targets[0].key);

  it('records the score each second, keeps it on the best run, and paces the next run against it', () => {
    let state = play(createInitialState(), start(1));
    state = play(state, hitFirst(state), { type: 'tick' });
    state = play(state, hitFirst(state), { type: 'tick' }, ...ticks(GAME_DURATION - 2));
    expect(state.timeline.slice(0, 3)).toEqual([10, 20, 20]);
    expect(bestRunOf(state).timeline).toHaveLength(GAME_DURATION);

    let next = play(state, start(2), { type: 'tick' });
    expect(paceVsBest(next)).toBe(-10);
    for (let i = 0; i < 3; i++) next = play(next, hitFirst(next));
    next = play(next, { type: 'tick' });
    expect(paceVsBest(next)).toBe(10);
  });

  it('has no pace without a best run to compare with', () => {
    const state = play(createInitialState(), start(), { type: 'tick' });
    expect(paceVsBest(state)).toBeNull();
  });

  it('keeps the last runs per mode and counts every finished run, but not abandoned ones', () => {
    let state = createInitialState();
    for (let run = 0; run < HISTORY_SIZE + 2; run++) state = play(state, start(run), ...ticks(GAME_DURATION));
    state = play(state, start(99), { type: 'finish' });
    expect(state.history.gridshot.count).toBe(HISTORY_SIZE + 2);
    expect(state.history.gridshot.runs).toHaveLength(HISTORY_SIZE);
    expect(state.history.gridshot.runs.at(-1)).toMatchObject({ score: 0, hits: 0, seconds: GAME_DURATION });
  });
});

describe('practice runs and hit timing', () => {
  const hitAt = (state, at) => ({ type: 'shot', targetKey: state.targets[0].key, rolls: rolls(0.6), at });

  it('times each hit from the run start or the previous hit', () => {
    let state = play(createInitialState(), { ...start(), at: 1000 });
    state = play(state, hitAt(state, 1400));
    state = play(state, { type: 'shot', targetKey: null, rolls: rolls(0.6), at: 1700 });
    state = play(state, hitAt(state, 2000));
    expect(state.hitTime).toBe(1000);
    expect(avgHitMs(state)).toBe(500);
    state = play(state, ...ticks(GAME_DURATION));
    expect(state.history.gridshot.runs.at(-1).avgHitMs).toBe(500);
  });

  it('has no timing without timestamps', () => {
    const state = play(createInitialState(), start(), shot(null));
    expect(avgHitMs(state)).toBeNull();
  });

  it('uses its own length and never touches bests, history or pacing', () => {
    let state = play(createInitialState(), start(1), ...ticks(GAME_DURATION));
    const { bestRuns, history } = state;
    const practice = { duration: 30, size: 1.5, speed: 0.5 };
    state = play(state, { ...start(2), practice });
    expect(state).toMatchObject({ timeLeft: 30, practice });
    state = play(state, shot(state.targets[0].key), { type: 'tick' });
    expect(paceVsBest(state)).toBeNull();
    state = play(state, ...ticks(29));
    expect(state).toMatchObject({ phase: PHASES.FINISHED, completed: true, newBest: false });
    expect(state.bestRuns).toBe(bestRuns);
    expect(state.history).toBe(history);
  });
});

describe('ranks', () => {
  it('maps scores to tiers per mode, with the distance to the next one', () => {
    expect(rankFor('gridshot', 0)).toBeNull();
    expect(rankFor('gridshot', 1)).toMatchObject({ id: 'bronze', next: { toGo: 599, tier: { id: 'silver' } } });
    expect(rankFor('gridshot', 1100)).toMatchObject({ id: 'gold', level: 2, next: { at: 1600 } });
    expect(rankFor('gridshot', 5000)).toMatchObject({ id: 'diamond', next: null });
    expect(Object.keys(RANK_THRESHOLDS)).toEqual(Object.keys(MODES));
    for (const thresholds of Object.values(RANK_THRESHOLDS)) {
      expect([...thresholds].sort((a, b) => a - b)).toEqual(thresholds);
    }
  });
});

describe('miss map', () => {
  const misses = (dx, dy, along, n = 6) => Array.from({ length: n }, () => ({ dx, dy, along }));

  it('names the lean and suggests a fix', () => {
    expect(summarizeMisses(misses(0.6, 0, 0.8))).toMatchObject({
      key: 'overshoot,right',
      headline: 'Your misses tend to overshoot and land right.'
    });
    expect(summarizeMisses(misses(0, -0.5, -0.6)).key).toBe('undershoot,low');
    expect(summarizeMisses(misses(0.1, -0.1, 0.1)).key).toBe('even');
  });

  it('needs a few misses before calling a pattern', () => {
    expect(summarizeMisses([]).key).toBe('none');
    expect(summarizeMisses([], 3).headline).toMatch(/nowhere near/);
    expect(summarizeMisses(misses(1, 1, 1, 3)).key).toBe('few');
  });

  it('records misses on the run and keeps the pattern in history', () => {
    let state = play(createInitialState(), start());
    for (let i = 0; i < 6; i++) state = play(state, { type: 'shot', targetKey: null, rolls: rolls(0.6), miss: { dx: 0.7, dy: 0, along: 0.9 } });
    state = play(state, { type: 'shot', targetKey: null, rolls: rolls(0.6), miss: { wild: true } }, ...ticks(GAME_DURATION));
    expect(state).toMatchObject({ wildMisses: 1 });
    expect(state.misses).toHaveLength(6);
    expect(state.history.gridshot.runs.at(-1).missPattern).toBe('overshoot,right');
  });
});

describe('sensitivity matching', () => {
  it('copies the game turn rate and reports cm/360', () => {
    expect(degreesPerCount({ game: 'valorant', value: 0.4 })).toBeCloseTo(0.028);
    expect(cmPer360(degreesPerCount({ game: 'cs2', value: 1 }), 800)).toBeCloseTo(51.95, 1);
    expect(isGameSens({ game: 'valorant', value: 0.4, dpi: 800 })).toBe(true);
    expect(isGameSens({ game: 'fortnite', value: 0.4, dpi: 800 })).toBe(false);
    expect(isGameSens(null)).toBe(true);
  });
});

describe('run registration', () => {
  it('remembers why a run has no token, for that run only', () => {
    let state = play(createInitialState(), start(1), { type: 'runNotRegistered', runKey: 1, reason: 'busy' });
    expect(state.runIssue).toBe('busy');
    expect(play(state, { type: 'runNotRegistered', runKey: 0, reason: 'offline' }).runIssue).toBe('busy');
    state = play(state, ...ticks(GAME_DURATION), start(2));
    expect(state.runIssue).toBeNull();
  });
});

describe('saving runs', () => {
  it('saves any finished run and keeps the reply, without marking a different best as saved', () => {
    const hitFirst = state => shot(state.targets[0].key);
    let state = play(createInitialState(), start(1), { type: 'runRegistered', runKey: 1, runId: 'best' });
    for (let i = 0; i < 5; i++) state = play(state, hitFirst(state));
    state = play(state, ...ticks(GAME_DURATION));
    state = play(state, start(2), { type: 'runRegistered', runKey: 2, runId: 'lower' }, hitFirst(state), ...ticks(GAME_DURATION));
    expect(state).toMatchObject({ runId: 'lower', newBest: false, runSaved: null });

    state = play(state, { type: 'scoreSaved', mode: 'gridshot', message: "Saved 10 to this week's board." });
    expect(state.runSaved).toBe("Saved 10 to this week's board.");
    expect(bestRunOf(state)).toMatchObject({ runId: 'best', saved: false });

    state = play(state, start(3));
    expect(state.runSaved).toBeNull();
  });
});

describe('leaderboard placement', () => {
  const board = [
    { username: 'Ace', score: 2000 },
    { username: 'Nabeel', score: 1500 },
    { username: 'Bo', score: 900 }
  ];

  it('places a score among the other players', () => {
    expect(placementOn(board, 1800, 'someone')).toBe(2);
    expect(placementOn(board, 100, 'someone')).toBe(4);
    expect(placementOn([], 10)).toBe(1);
  });

  it('ignores your own entry, and returns null when it is already as high', () => {
    expect(placementOn(board, 1800, 'nabeel')).toBe(2);
    expect(placementOn(board, 1200, 'NABEEL')).toBeNull();
  });

  it('returns null outside the top 50', () => {
    const full = Array.from({ length: 50 }, (_, i) => ({ username: `p${i}`, score: 1000 - i }));
    expect(placementOn(full, 1, 'me')).toBeNull();
    expect(placementOn(full, 990, 'me')).toBe(11);
  });
});
