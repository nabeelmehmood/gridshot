// v1 API keeps these as 1st-gen functions: switching an existing function to 2nd gen
// requires deleting and recreating it, which would change nothing for players.
const functions = require('firebase-functions/v1');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { Filter } = require('bad-words');
const { clientIp, createLimiter } = require('./rateLimit');
const { disableProjectBilling, KILL_SWITCH_TOPIC, shouldDisableBilling, spendLimit } = require('./killSwitch');
const cors = require('cors')({
  origin: ['https://nabeelmehmood.github.io', /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/]
});

initializeApp();
const db = getFirestore();
const profanity = new Filter();

// 'UserScores' holds the pre-validation leaderboard full of forged entries; it is no longer read.
const SCORES = 'LeaderboardScores';
// Best per player per mode per ISO week (Monday 00:00 UTC to Sunday), for the "This week" board.
const WEEKLY_SCORES = 'WeeklyScores';
const RUNS = 'Runs';
const PERIODS = ['all', 'week'];

// ISO 8601 week in UTC, e.g. '2026-W43'. The year is the one the week's Thursday falls in.
function isoWeek(date = new Date()) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((day - yearStart) / 86400000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Must match src/game/username.js.
const USERNAME_PATTERN = /^(?=[a-zA-Z0-9._-]{3,16}$)(?!.*[._-]{2})[^._-].*[^._-]$/;

// Must match MODES in src/game/modes.js.
//   maxExpired  expired targets one run can report (Pop-in lives 1.1s; Skeet throws one per 1.2s)
//   untimed     no 60s clock (Survival): limits scale with how long the run actually lasted
const MODE_RULES = {
  gridshot: { maxExpired: 0 },
  strafe: { maxExpired: 0 },
  popin: { maxExpired: 60 },
  skeet: { maxExpired: 60 },
  spidershot: { maxExpired: 0 },
  microshot: { maxExpired: 0 },
  bounce: { maxExpired: 0 },
  survival: { maxExpired: 3, untimed: true }
};
const MODES = Object.keys(MODE_RULES);
const DEFAULT_MODE = 'gridshot';
// Must match src/game/scoring.js.
const POINTS = { HIT: 10, MISS: -10, EXPIRED: -5 };
// Every STREAK_STEP hits in a row adds +1 to each hit, up to +MAX_STREAK_BONUS.
const STREAK_STEP = 10;
const MAX_STREAK_BONUS = 4;

// Hit order isn't reported, so the claimed bonus is capped at what one unbroken streak of `hits` earns.
function maxStreakBonus(hits) {
  let total = 0;
  for (let streak = 1; streak <= hits; streak++) total += Math.min(Math.floor(streak / STREAK_STEP), MAX_STREAK_BONUS);
  return total;
}

// Timed runs: 5 hits/s for a whole minute is beyond any human; ~3/s is very good.
const RUN_DURATION_MS = 60 * 1000;
const MAX_HITS = 300;
const MAX_CLICKS = 1000;
// Untimed runs: the same rates against the run's real length, with a hard ceiling (~40 minutes of play).
const MAX_HITS_PER_SECOND = 5;
const MAX_CLICKS_PER_SECOND = 15;
const MAX_UNTIMED_HITS = 3000;
const MAX_UNTIMED_CLICKS = 15000;
const MIN_UNTIMED_RUN_MS = 5000;

// A timed run can't be submitted before its timer could have run out (minus timer/network slack),
// and every token expires after a week.
const MIN_RUN_MS = RUN_DURATION_MS - 3000;
const RUN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const LEADERBOARD_SIZE = 50;
const LEADERBOARD_CACHE_MS = 30 * 1000;

// Cost guardrails. Billing grows with instances × time and with Firestore operations, so each
// function is capped at MAX_INSTANCES and rate limited per minute before touching Firestore.
// Worst case under a sustained flood is a few dollars a month instead of unbounded.
const MAX_INSTANCES = 2;
const runtime = functions.runWith({ maxInstances: MAX_INSTANCES, memory: '128MB', timeoutSeconds: 10 });

// A run takes 60s, so 5 starts/min per player leaves room for restarts after Esc.
const limits = {
  startRun: createLimiter({ name: 'startRun', perIp: 5, total: 30, logger: functions.logger }),
  addScore: createLimiter({ name: 'addScore', perIp: 5, total: 20, logger: functions.logger }),
  getTopScores: createLimiter({ name: 'getTopScores', perIp: 30, total: 300, logger: functions.logger })
};

class RejectedRun extends Error {}

const fail = (res, status, result) => res.status(status).json({ success: false, result });

function rateLimited(name, req, res) {
  if (limits[name](clientIp(req))) return false;
  res.set('Retry-After', '60');
  fail(res, 429, 'Too many requests. Try again in a minute.');
  return true;
}

// Per instance; each function runs in its own instances, so addScore can't invalidate it.
const leaderboardCache = new Map();

// Issues a single-use token at the start of a run. Scores are only accepted against a token
// old enough for a full run to have been played, so they can't be forged with a single request.
exports.startRun = runtime.https.onRequest((req, res) =>
  cors(req, res, async () => {
    if (rateLimited('startRun', req, res)) return undefined;
    if (req.method !== 'POST') return fail(res, 405, 'Use POST.');
    const mode = req.body && req.body.mode;
    if (!MODES.includes(mode)) return fail(res, 400, 'Unknown mode.');
    try {
      const run = await db.collection(RUNS).add({ mode, startedAt: FieldValue.serverTimestamp() });
      return res.json({ runId: run.id });
    } catch (error) {
      functions.logger.error('startRun failed', error);
      return fail(res, 500, 'Could not start a run.');
    }
  })
);

exports.addScore = runtime.https.onRequest((req, res) =>
  cors(req, res, async () => {
    if (rateLimited('addScore', req, res)) return undefined;
    if (req.method !== 'POST') return fail(res, 405, 'Use POST.');

    const { username, runId, hits, clicks, expired = 0, bonus = 0 } = req.body || {};
    if (typeof username !== 'string' || !USERNAME_PATTERN.test(username)) {
      return fail(res, 400, 'Names are 3-16 characters: letters, numbers, dots, dashes or underscores.');
    }
    if (profanity.isProfane(username)) return fail(res, 400, 'Please pick a different name.');
    if (
      typeof runId !== 'string' ||
      !/^[A-Za-z0-9]{1,64}$/.test(runId) ||
      !Number.isInteger(hits) ||
      !Number.isInteger(clicks) ||
      !Number.isInteger(expired) ||
      !Number.isInteger(bonus) ||
      expired < 0 ||
      bonus < 0 ||
      hits < 0 ||
      hits > clicks ||
      hits > MAX_UNTIMED_HITS ||
      clicks > MAX_UNTIMED_CLICKS
    ) {
      return fail(res, 400, 'Invalid run.');
    }
    if (bonus > maxStreakBonus(hits)) return fail(res, 400, 'Invalid run.');

    // The client never sends a score; it is derived from the reported counts.
    const score = hits * POINTS.HIT + bonus + (clicks - hits) * POINTS.MISS + expired * POINTS.EXPIRED;
    if (score <= 0) return fail(res, 400, 'Only positive scores go on the leaderboard.');

    try {
      const result = await db.runTransaction(async tx => {
        const runRef = db.collection(RUNS).doc(runId);
        const run = await tx.get(runRef);
        if (!run.exists || run.get('usedAt')) throw new RejectedRun('This run was already submitted or is unknown.');

        // The mode comes from the token, not the request, so scores can't be filed under another mode.
        const mode = run.get('mode');
        const rules = MODE_RULES[mode];
        if (!rules) throw new RejectedRun('Unknown mode.');
        if (expired > rules.maxExpired) throw new RejectedRun('Invalid run.');

        const startedAt = run.get('startedAt');
        const elapsed = Date.now() - (startedAt ? startedAt.toMillis() : Date.now());
        if (elapsed > RUN_TTL_MS) throw new RejectedRun('This run is too old to submit.');
        if (rules.untimed) {
          if (elapsed < MIN_UNTIMED_RUN_MS) throw new RejectedRun('Run finished too quickly.');
          const seconds = elapsed / 1000;
          if (hits > seconds * MAX_HITS_PER_SECOND || clicks > seconds * MAX_CLICKS_PER_SECOND) {
            throw new RejectedRun('Invalid run.');
          }
        } else {
          if (elapsed < MIN_RUN_MS) throw new RejectedRun('Run finished too quickly.');
          if (hits > MAX_HITS || clicks > MAX_CLICKS) throw new RejectedRun('Invalid run.');
        }

        // One entry per player per mode (and per week), so each board shows a name once with its best.
        // Transactions need every read before the first write.
        const name = username.toLowerCase();
        const week = isoWeek();
        const bestRef = db.collection(SCORES).doc(`${mode}_${name}`);
        const weeklyRef = db.collection(WEEKLY_SCORES).doc(`${mode}_${week}_${name}`);
        const [best, weekly] = await Promise.all([tx.get(bestRef), tx.get(weeklyRef)]);
        tx.update(runRef, { usedAt: FieldValue.serverTimestamp() });

        const entry = { username, mode, score, hits, clicks, expired, bonus, runId, createdAt: FieldValue.serverTimestamp() };
        const newWeekly = !weekly.exists || weekly.get('score') < score;
        const newBest = !best.exists || best.get('score') < score;
        if (newWeekly) tx.set(weeklyRef, { ...entry, week });
        if (newBest) tx.set(bestRef, entry);

        if (newBest) return `Saved ${score} for ${username}.`;
        if (newWeekly) return `Saved ${score} to this week's board. Your all-time best of ${best.get('score')} still stands.`;
        return `Your best of ${best.get('score')} still stands.`;
      });
      return res.json({ success: true, result });
    } catch (error) {
      if (error instanceof RejectedRun) return fail(res, 400, error.message);
      functions.logger.error('addScore failed', error);
      return fail(res, 500, 'Could not save your score. Please try again.');
    }
  })
);

exports.getTopScores = runtime.https.onRequest((req, res) =>
  cors(req, res, async () => {
    if (rateLimited('getTopScores', req, res)) return undefined;
    if (req.method !== 'GET') return fail(res, 405, 'Use GET.');
    const mode = (req.query && req.query.mode) || DEFAULT_MODE;
    const period = (req.query && req.query.period) || 'all';
    if (!MODES.includes(mode)) return fail(res, 400, 'Unknown mode.');
    if (!PERIODS.includes(period)) return fail(res, 400, 'Unknown period.');

    try {
      // Each uncached load costs LEADERBOARD_SIZE reads, so serve repeats from memory.
      const week = isoWeek();
      const cacheKey = period === 'week' ? `${mode}:${week}` : mode;
      const cached = leaderboardCache.get(cacheKey);
      let users;
      if (cached && Date.now() - cached.at < LEADERBOARD_CACHE_MS) {
        users = cached.users;
      } else {
        // Need the (mode, score desc) and (mode, week, score desc) composite indexes in firestore.indexes.json.
        const query =
          period === 'week'
            ? db.collection(WEEKLY_SCORES).where('mode', '==', mode).where('week', '==', week)
            : db.collection(SCORES).where('mode', '==', mode);
        const snapshot = await query.orderBy('score', 'desc').limit(LEADERBOARD_SIZE).get();
        users = snapshot.docs.map(doc => ({
          username: doc.get('username'),
          score: doc.get('score')
        }));
        leaderboardCache.set(cacheKey, { users, at: Date.now() });
      }
      res.set('Cache-Control', 'public, max-age=30');
      return res.json({ users });
    } catch (error) {
      functions.logger.error('getTopScores failed', error);
      return fail(res, 500, 'Could not load the leaderboard.');
    }
  })
);

// Connected to a Cloud Billing budget; disables billing once spend reaches the budget (see README).
exports.stopBilling = functions
  .runWith({ maxInstances: 1, memory: '128MB', timeoutSeconds: 30 })
  .pubsub.topic(KILL_SWITCH_TOPIC)
  .onPublish(async message => {
    let notification = null;
    try {
      notification = message.json;
    } catch {
      functions.logger.error('[KillSwitch] ignoring non-JSON message');
      return;
    }

    const { costAmount, currencyCode } = notification || {};
    if (notification && currencyCode !== 'USD') {
      functions.logger.warn(`[KillSwitch] billed in ${currencyCode}, so the $5 ceiling is off; using the budget only`);
    }
    const limit = notification ? spendLimit(notification) : Infinity;
    if (!shouldDisableBilling(notification)) {
      functions.logger.info(`[KillSwitch] under limit: ${costAmount} of ${limit} ${currencyCode}`);
      return;
    }
    functions.logger.warn(`[KillSwitch] limit reached: ${costAmount} of ${limit} ${currencyCode}`);
    // Let errors throw so they show up as function failures in the logs.
    await disableProjectBilling(functions.logger);
  });
