// Miss map. Each miss near a target is stored as its offset from that target's centre, in target
// radii on the target plane: dx to the right, dy up. `along` is the part of the offset along the
// flick (from the previous shot to the target): positive overshoots, negative stops short; null when
// the target was too close to the previous shot to tell.
export const MAX_MISSES = 300;
// Misses further than this many radii from every target are "wild" and only counted.
export const NEAR_RADII = 4;
// Average offsets smaller than this (in radii) count as no lean in that direction.
const LEAN = 0.3;
const MIN_FOR_PATTERN = 5;

const mean = values => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

export function summarizeMisses(misses, wild = 0) {
  const flicks = misses.map(miss => miss.along).filter(Number.isFinite);
  const dx = mean(misses.map(miss => miss.dx));
  const dy = mean(misses.map(miss => miss.dy));
  const along = flicks.length >= MIN_FOR_PATTERN ? mean(flicks) : 0;
  const summary = { count: misses.length, wild, dx, dy, along };

  if (misses.length === 0) return { ...summary, key: 'none', headline: wild ? 'Your misses were nowhere near a target.' : 'No misses. Clean run.', tip: null };
  if (misses.length < MIN_FOR_PATTERN) return { ...summary, key: 'few', headline: 'Too few misses to spot a pattern.', tip: null };

  const leans = [];
  if (along >= LEAN) leans.push('overshoot');
  if (along <= -LEAN) leans.push('undershoot');
  if (dx >= LEAN) leans.push('right');
  if (dx <= -LEAN) leans.push('left');
  if (dy >= LEAN) leans.push('high');
  if (dy <= -LEAN) leans.push('low');

  if (leans.length === 0) {
    return { ...summary, key: 'even', headline: 'Your misses are spread evenly around the targets.', tip: 'No habit to fix: keep the speed and tighten up.' };
  }
  const key = leans.join(',');
  return { ...summary, key, headline: `Your misses tend to ${describePattern(key)}.`, tip: tipFor(leans) };
}

const LEAN_WORDS = {
  overshoot: 'overshoot',
  undershoot: 'stop short',
  right: 'land right',
  left: 'land left',
  high: 'land high',
  low: 'land low'
};

// 'overshoot,right' → 'overshoot and land right'.
export function describePattern(key) {
  const list = key.split(',').map(lean => LEAN_WORDS[lean] ?? lean);
  return list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list.at(-1)}` : list[0];
}

function tipFor(leans) {
  if (leans.includes('overshoot')) return 'Ease off at the end of each flick, or try a slightly lower sensitivity.';
  if (leans.includes('undershoot')) return 'Commit to the whole flick, or try a slightly higher sensitivity.';
  if (leans.includes('high') || leans.includes('low')) return 'Keep your crosshair level: check your arm or wrist rest and your mouse grip.';
  return 'A sideways lean is often grip or posture: keep the mouse straight under your hand.';
}
