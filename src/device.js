// True when a mouse (or other precise pointer) is available. Phones and tablets without one get the
// showcase menu instead of the game, and no custom cursor.
export const hasFinePointer = typeof window !== 'undefined' && window.matchMedia('(any-pointer: fine)').matches;
