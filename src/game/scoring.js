export const GAME_DURATION = 60;

// Must match functions/index.js.
export const POINTS = {
  HIT: 10,
  MISS: -10,
  EXPIRED: -5
};

// Every STREAK_STEP hits in a row adds +1 to each hit, up to +MAX_STREAK_BONUS (x1.4).
// A miss or an expired target resets the streak. Must match functions/index.js.
export const STREAK_STEP = 10;
export const MAX_STREAK_BONUS = 4;

// Extra points for the hit that brings the streak to `streak`.
export const streakBonus = streak => Math.min(Math.floor(streak / STREAK_STEP), MAX_STREAK_BONUS);

export const streakMultiplier = streak => (POINTS.HIT + streakBonus(streak)) / POINTS.HIT;

// The most bonus `hits` hits could earn: all of them in one unbroken streak.
export function maxStreakBonus(hits) {
  let total = 0;
  for (let streak = 1; streak <= hits; streak++) total += streakBonus(streak);
  return total;
}

// 5 hits/s for a whole run is beyond any human; ~3/s is very good.
export const MAX_HITS = 300;
export const MAX_SCORE = MAX_HITS * POINTS.HIT + maxStreakBonus(MAX_HITS);

export function calculateScore(hits, clicks, expired = 0, bonus = 0) {
  return hits * POINTS.HIT + bonus + (clicks - hits) * POINTS.MISS + expired * POINTS.EXPIRED;
}

export function calculateAccuracy(hits, clicks) {
  return clicks > 0 ? (hits / clicks) * 100 : null;
}

export function formatAccuracy(hits, clicks) {
  const accuracy = calculateAccuracy(hits, clicks);
  return accuracy === null ? '–' : `${accuracy.toFixed(1)}%`;
}
