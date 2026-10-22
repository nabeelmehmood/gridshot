// Practice: any mode with its own length, target size and speed. Practice runs are never submitted
// and don't count towards bests, history or pacing.
export const PRACTICE_OPTIONS = {
  duration: [30, 60, 90, 120],
  size: [0.75, 1, 1.25, 1.5],
  speed: [0.5, 0.75, 1, 1.25]
};

export const DEFAULT_PRACTICE = { enabled: false, duration: 60, size: 1, speed: 1 };

export const isPracticeSettings = value =>
  value !== null &&
  typeof value === 'object' &&
  typeof value.enabled === 'boolean' &&
  Object.entries(PRACTICE_OPTIONS).every(([key, options]) => options.includes(value[key]));

// What a run needs from the settings: null for a normal run.
export const practiceRun = settings => (settings.enabled ? { duration: settings.duration, size: settings.size, speed: settings.speed } : null);
