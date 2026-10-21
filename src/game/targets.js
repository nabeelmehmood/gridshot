const COLUMNS = [9, 6, 3, 0, -3, -6, -9];
const ROWS = [1, 4, 7];

// Gridshot slot id is the index into this list.
export const TARGET_SLOTS = ROWS.flatMap(y => COLUMNS.map(x => [x, y]));

export function pickTargets(random = Math.random, count = 3) {
  const pool = TARGET_SLOTS.map((_, id) => id);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

// A random slot not in `occupied`; pass the slot just hit in `occupied` so it never repeats.
export function pickFreeSlot(occupied, roll) {
  const free = TARGET_SLOTS.map((_, id) => id).filter(id => !occupied.includes(id));
  return free[Math.floor(roll * free.length)];
}
