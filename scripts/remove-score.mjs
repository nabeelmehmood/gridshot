// Removes a player's leaderboard entries using your Firebase CLI login (no admin endpoint needed).
//   npm run remove-score -- <name>            every mode, all-time and this week
//   npm run remove-score -- <name> <mode>     one mode
// Entries are stored under predictable ids (see addScore in functions/index.js):
//   LeaderboardScores/<mode>_<name>   WeeklyScores/<mode>_<isoWeek>_<name>
// Boards are cached for 30s by the function, so a removed name can linger that long.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PROJECT = 'gridshot-bbd16';

// Same as isoWeek in functions/index.js: ISO 8601 week in UTC, e.g. '2026-W43'.
function isoWeek(date = new Date()) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((day - yearStart) / 86400000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Mode ids come from MODE_RULES in functions/index.js, so this stays in step with the server.
const functionsSource = readFileSync(new URL('../functions/index.js', import.meta.url), 'utf8');
const rules = functionsSource.match(/const MODE_RULES = \{([\s\S]*?)\n\};/);
const MODES = rules ? [...rules[1].matchAll(/^\s+(\w+):/gm)].map(match => match[1]) : [];

const [rawName, mode] = process.argv.slice(2);
if (!rawName || (mode && !MODES.includes(mode))) {
  console.error(`Usage: npm run remove-score -- <name> [${MODES.join('|')}]`);
  process.exit(1);
}

const name = rawName.toLowerCase();
const week = isoWeek();
const paths = (mode ? [mode] : MODES).flatMap(id => [`LeaderboardScores/${id}_${name}`, `WeeklyScores/${id}_${week}_${name}`]);

console.log(`Removing "${rawName}" from ${mode ?? 'every mode'} (all-time and ${week}):`);
let failed = 0;
for (const path of paths) {
  // Deleting a document that doesn't exist succeeds quietly, so missing modes are harmless.
  const result = spawnSync('npx', ['firebase', 'firestore:delete', path, '--project', PROJECT, '--force'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    encoding: 'utf8'
  });
  const ok = result.status === 0;
  if (!ok) failed += 1;
  console.log(`  ${ok ? 'removed' : 'FAILED '} ${path}${ok ? '' : `\n    ${(result.stderr || result.stdout).trim()}`}`);
}
process.exit(failed ? 1 : 0);
