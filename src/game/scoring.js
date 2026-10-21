export const GAME_DURATION = 60;

// Must match functions/index.js.
export const POINTS = {
  HIT: 10,
  MISS: -5,
  EXPIRED: -5
};

// 4 hits/s for a whole run is beyond any human.
export const MAX_HITS = 240;
export const MAX_SCORE = MAX_HITS * POINTS.HIT;

export function calculateScore(hits, clicks, expired = 0) {
  return hits * POINTS.HIT + (clicks - hits) * POINTS.MISS + expired * POINTS.EXPIRED;
}

export function calculateAccuracy(hits, clicks) {
  return clicks > 0 ? (hits / clicks) * 100 : null;
}

export function formatAccuracy(hits, clicks) {
  const accuracy = calculateAccuracy(hits, clicks);
  return accuracy === null ? '–' : `${accuracy.toFixed(1)}%`;
}
