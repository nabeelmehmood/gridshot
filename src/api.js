import { MODES } from './game/modes';
import { MAX_SCORE } from './game/scoring';

const API_BASE = 'https://us-central1-gridshot-bbd16.cloudfunctions.net';

// Timed runs have a hard score ceiling; Survival runs are open-ended, so only the server limits them.
const isValidEntry = (user, mode) =>
  typeof user?.username === 'string' &&
  Number.isInteger(user.score) &&
  user.score > 0 &&
  (MODES[mode]?.untimed || user.score <= MAX_SCORE);

// period: 'all' for all-time bests, 'week' for this ISO week (resets Monday 00:00 UTC).
export async function fetchTopScores(mode, period = 'all') {
  const params = new URLSearchParams({ mode, period });
  const res = await fetch(`${API_BASE}/getTopScores?${params}`);
  if (!res.ok) throw new Error(`Leaderboard request failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data.users) ? data.users.filter(user => isValidEntry(user, mode)) : [];
}

// Server-issued token for the run that is starting; required to submit its score.
// The server records the mode on the token, so a score can't be filed under another mode.
export async function registerRun(mode) {
  const res = await fetch(`${API_BASE}/startRun`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode })
  });
  if (!res.ok) {
    const error = new Error(`Run registration failed (${res.status})`);
    // 429: the server's rate limit, not a connection problem.
    error.busy = res.status === 429;
    throw error;
  }
  const data = await res.json();
  if (typeof data.runId !== 'string') throw new Error('Run registration failed');
  return data.runId;
}

// The server recomputes the score from the counts and checks them against the run token.
export async function submitScore(username, { runId, hits, clicks, expired, bonus = 0 }) {
  const res = await fetch(`${API_BASE}/addScore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, runId, hits, clicks, expired, bonus })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.result || 'Could not save your score. Please try again.');
  }
}
