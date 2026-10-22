// Matching another game's sensitivity. Each game turns a fixed angle per mouse count (its yaw)
// times the in-game sensitivity, regardless of field of view, so copying degrees per count copies
// the feel exactly. Values are the games' defaults for hip-fire.
export const GAMES = [
  { id: 'cs2', name: 'Counter-Strike 2', yaw: 0.022 },
  { id: 'valorant', name: 'Valorant', yaw: 0.07 },
  { id: 'apex', name: 'Apex Legends', yaw: 0.022 },
  { id: 'overwatch', name: 'Overwatch 2', yaw: 0.0066 },
  { id: 'cod', name: 'Call of Duty (MW / Warzone)', yaw: 0.0066 }
];

export const SENS_LIMITS = { min: 0.001, max: 1000 };
export const DPI_LIMITS = { min: 100, max: 32000 };

export const gameById = id => GAMES.find(game => game.id === id) ?? null;

export const isGameSens = value =>
  value === null ||
  (typeof value === 'object' &&
    Boolean(gameById(value.game)) &&
    Number.isFinite(value.value) &&
    value.value >= SENS_LIMITS.min &&
    value.value <= SENS_LIMITS.max &&
    Number.isInteger(value.dpi) &&
    value.dpi >= DPI_LIMITS.min &&
    value.dpi <= DPI_LIMITS.max);

export const degreesPerCount = ({ game, value }) => gameById(game).yaw * value;

// Centimetres of mouse travel for a full turn, for players who think in cm/360.
export const cmPer360 = (degrees, dpi) => (360 / degrees / dpi) * 2.54;
