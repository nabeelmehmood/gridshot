import { MAX_SCORE } from './game/scoring';

const API_BASE = 'https://us-central1-gridshot-bbd16.cloudfunctions.net';

const isValidEntry = user =>
  typeof user?.username === 'string' && Number.isInteger(user.score) && user.score > 0 && user.score <= MAX_SCORE;

export async function fetchTopScores(mode) {
  const res = await fetch(`${API_BASE}/getTopScores?mode=${encodeURIComponent(mode)}`);
  if (!res.ok) throw new Error(`Leaderboard request failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data.users) ? data.users.filter(isValidEntry) : [];
}

// Server-issued token for the run that is starting; required to submit its score.
// The server records the mode on the token, so a score can't be filed under another mode.
export async function registerRun(mode) {
  const res = await fetch(`${API_BASE}/startRun`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode })
  });
  if (!res.ok) throw new Error(`Run registration failed (${res.status})`);
  const data = await res.json();
  if (typeof data.runId !== 'string') throw new Error('Run registration failed');
  return data.runId;
}

// The server recomputes the score from hits/clicks and checks them against the run token.
export async function submitScore(username, { runId, hits, clicks, expired }) {
  const res = await fetch(`${API_BASE}/addScore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, runId, hits, clicks, expired })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.result || 'Could not save your score. Please try again.');
  }
}
