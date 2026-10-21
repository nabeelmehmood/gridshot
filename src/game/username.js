import { Filter } from 'bad-words';

// Must match the check in functions/index.js.
export const USERNAME_PATTERN = /^(?=[a-zA-Z0-9._]{3,20}$)(?!.*[_.]{2})[^_.].*[^_.]$/;

export const USERNAME_HINT =
  '3–20 characters: letters, numbers, dots or underscores (not at the start or end, and not doubled).';

export const profanity = new Filter();

export function cleanName(name) {
  return profanity.clean(String(name ?? ''));
}
