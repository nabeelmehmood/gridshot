# Gridshot

A browser aim trainer for FPS warmups. Every run is 60 seconds; hits are +10, misses -10, and every 10 hits in a row adds +1 per hit (up to ×1.4).

Play it at https://nabeelmehmood.github.io/gridshot/

## Modes

- **Gridshot**: three static targets on a grid; each hit respawns on a free slot.
- **Strafe**: one target glides around the wall on a smooth looping path.
- **Pop-in**: a target appears for 1.1s and shrinks away; letting it expire costs 5.
- **Skeet**: clay discs are thrown across in a gravity arc, up to two at a time; each one that
  escapes costs 5.
- **Spidershot**: a target in the centre, then one somewhere random, then the centre again.
- **Microshot**: tiny targets hopping around right next to the crosshair.
- **Bounce**: three balls bouncing around the board.
- **Survival**: no clock and three lives. Targets shrink away faster as your hits climb, up to
  three at once; the run ends when three have expired.

Only runs that end on their own (the timer runs out, or Survival's lives do) count toward your
best; ending early with Esc doesn't. Each mode has its own leaderboard.

## Themes

Playground, Daydream, Kawaii, Pool, Deep space, Neon, Cell block and Classic, picked in Settings.
Each is defined in `src/themes.js` (target colour and style, backdrop board, particles, UI tint)
with its scenery in `src/modules/Scene/environments/`. Every texture is drawn on a canvas at
runtime, so there are no image downloads. Targets always sit on the theme's backdrop board with a
thin outline so they never blend into the scenery. "Particles and effects" in Settings turns off
ambient particles, hit sparks, miss marks and the vignette for slower machines.

## Icons and social preview

Favicons, app icons (including a maskable one for Android) and `og-image.png` (the 1200×630
link preview) live in `public/` and are generated from the SVG sources in `assets/`:

```bash
npm run assets
```

Re-run it after editing a source or a theme's `swatch` colours (the preview shows every theme's
badge). SEO tags, Open Graph/Twitter tags and JSON-LD structured data are in `index.html`;
`public/sitemap.xml` can be submitted in Google Search Console. A project site can't serve
`robots.txt` (crawlers only read it from the domain root), and it isn't needed to be indexed.

## Mouse sensitivity

1.00× is desktop-matched: one pixel of mouse movement moves the point under the crosshair one pixel
on screen, so it feels like the desktop cursor and stays consistent when you change FOV or resize.
By default the OS pointer speed and acceleration apply; "Raw mouse input" bypasses both.

## Stack

- React 19 + [react-three-fiber](https://r3f.docs.pmnd.rs/) / three.js, built with Vite
- Leaderboard: Firebase Cloud Functions (`functions/`) backed by Firestore, one board per mode

## Development

Needs Node 22+.

```bash
npm install
npm run dev       # local dev server
npm test          # unit tests (vitest)
npm run lint
npm run deploy    # build and publish dist/ to GitHub Pages
```

The dev server talks to the production leaderboard functions.

## Leaderboard

Score submission works with single-use run tokens:

1. When a run starts, the client calls `startRun` and the server stores a token with the mode and
   start time.
2. To submit, the client sends the token plus hits, clicks and expired targets. The server
   recomputes the score itself, rejects counts that aren't humanly possible, rejects tokens
   younger than a full run or older than a week, and burns the token.

This stops scores being forged with a single request. It can't stop someone who scripts a
plausible run; that needs Firebase App Check or sign-in.

### Cost guardrails

The project is on the Blaze plan, and only the functions can create cost: Firestore rules deny
all direct client access. To keep spam from turning into a bill:

- Each function is capped at 2 instances of 128 MB, with a 10s timeout.
- In-memory rate limits per minute, checked before any Firestore access: `startRun` 5 per IP and
  30 per instance, `addScore` 5 per IP and 20 per instance, `getTopScores` 30 per IP and 300 per
  instance. Over the limit returns 429. IPs can be spoofed, so the per-instance totals are the real
  ceiling on Firestore usage.
- `getTopScores` serves each mode from a 30s in-memory cache instead of re-reading 50 documents.

Rejected requests still count as function invocations (2M a month free, then $0.40 per million),
so a sustained flood can still cost something. The kill switch below is the hard stop.

### Billing kill switch

`stopBilling` listens on the `billing-kill-switch` Pub/Sub topic. A Cloud Billing budget posts its
status there several times a day; once the month's spend reaches **$5**, or the budget amount if
that is lower, the function unlinks the billing account from the project. The $5 ceiling is
hardcoded (`MAX_MONTHLY_SPEND_USD` in `functions/killSwitch.js`) so a higher console budget can't
lift it. It only applies to USD billing accounts; on any other currency the budget amount is the
limit, and the logs say so. The leaderboard stops working; the site (GitHub Pages) and the
Firestore data stay. Budget data lags by a few hours, so it caps a runaway bill rather than
preventing every cent.

One-time setup, after `firebase deploy` has created the function and the topic:

1. **Enable the Cloud Billing API** for `gridshot-bbd16`: Google Cloud console → APIs & Services →
   Library → "Cloud Billing API" → Enable.
2. **Find the function's service account**: Cloud Functions → `stopBilling` → Details → Runtime
   service account. For 1st-gen functions it is normally `gridshot-bbd16@appspot.gserviceaccount.com`.
3. **Let it unlink billing**:
   - Billing → Account management → Add principal → that service account → role
     **Billing Account Administrator**.
   - IAM & Admin → IAM (project `gridshot-bbd16`) → Grant access → same service account → role
     **Project Billing Manager**.
4. **Create the budget**: Billing → Budgets & alerts → Create budget.
   - Scope: project `gridshot-bbd16`, all services.
   - Amount: $5, monthly. (The function stops at $5 anyway; matching it keeps the email alerts in
     step with the kill switch.)
   - Thresholds: keep the email alerts (e.g. 50%, 90%, 100% of actual spend).
   - Manage notifications: tick **Connect a Pub/Sub topic to this budget**, choose project
     `gridshot-bbd16` and topic `billing-kill-switch`.
5. **Test safely**: Pub/Sub → Topics → `billing-kill-switch` → Messages → Publish message with
   `{"costAmount": 0.5, "budgetAmount": 5, "currencyCode": "USD"}`. The function logs show
   `[KillSwitch] under limit`. Don't publish a cost of 5 or more unless you want billing switched off
   for real.

**If it fires**: the logs show `[KillSwitch] billing disabled`. Once you've dealt with the cause, turn
it back on in Billing → Account management → My projects → `gridshot-bbd16` → Change billing.
The month's spend is already past $5, so the next notification will switch it off again unless
you raise `MAX_MONTHLY_SPEND_USD` and redeploy, or wait for the next month.

### Deploying

Deploy the backend before the site, because the new client calls `startRun`:

```bash
cd functions && npm install && cd ..
firebase deploy --only functions,firestore:indexes
npm run deploy
```

Scores live in the `LeaderboardScores` collection (each player's best per mode), weekly bests in
`WeeklyScores`, and tokens in `Runs`. The old `UserScores` collection (the pre-validation
leaderboard) is no longer read.

### Removing a leaderboard entry

For an offensive name, an impossible score, or a test entry. The script runs on your machine with
your Firebase CLI login, so there's no admin page or endpoint on the live site for anyone to abuse.

**Before you start**

- Run it from the repo folder (`F:\Work\gridshot`).
- You need to be logged in to the Firebase CLI as the project owner. Check with
  `npx firebase login:list`; if nothing is listed, run `npx firebase login`.

**Usage**

```bash
npm run remove-score -- <name> [mode]
```

The `--` is needed: it passes what follows to the script instead of to npm.

| Example | Removes |
|---|---|
| `npm run remove-score -- xXcheaterXx` | that name from every mode, both the all-time and this week's board |
| `npm run remove-score -- xXcheaterXx skeet` | that name from Skeet only (all-time and this week) |

- **Names aren't case-sensitive:** `Nabeel`, `nabeel` and `NABEEL` are the same player, like on the
  server.
- **Modes** are the ids `gridshot`, `strafe`, `popin`, `skeet`, `spidershot`, `microshot`, `bounce`
  and `survival`. A wrong mode or a missing name prints the usage line and deletes nothing.
- **It doesn't ask "are you sure?"**, so check the name first. There's no undo. The player can
  simply save a new score again.

**What you'll see**

```text
Removing "xXcheaterXx" from skeet (all-time and 2026-W43):
  removed LeaderboardScores/skeet_xxcheaterxx
  removed WeeklyScores/skeet_2026-W43_xxcheaterxx
```

`removed` is also printed for modes where the name had no entry; deleting something that isn't
there is harmless. `FAILED` lines show Firebase's error, usually a login problem (see above).

**Good to know**

- **Up to 30 seconds' delay.** The leaderboard function keeps each board in memory for 30 seconds,
  so the name can still show briefly. Reload after that.
- **This week only.** It removes the entry from the current week's board (weeks start Monday
  00:00 UTC). Past weeks are never shown, so they don't matter.
- **It doesn't block the name.** To stop a word being used at all, add it to the profanity filter
  with `profanity.addWords('word')` right after `new Filter()` in both `src/game/username.js` and
  `functions/index.js`, then redeploy the functions and the site.
- **Clearing everything** (for example after a scoring change) is a different job. Use
  `firebase firestore:delete <collection> --recursive --project gridshot-bbd16` on
  `LeaderboardScores`, `WeeklyScores` and `Runs`.

The script is `scripts/remove-score.mjs`. It reads the mode list from `functions/index.js`, so a
new mode is picked up automatically.

## Ranks

Bronze to Diamond per mode, from the thresholds in `src/game/ranks.js`. They're first estimates;
once the leaderboards fill up, tune them so Silver is roughly the top 70% of scores, Gold the top
40%, Platinum the top 15% and Diamond the top 3%. The mode pages pick up the new numbers on the next
build.

## Mode pages (search)

`npm run pages` writes a page per mode to `public/modes/<mode>/` and rebuilds `public/sitemap.xml`;
it also runs automatically before every build. Each page links to `/gridshot/?mode=<mode>`, which
opens the game on that mode. The per-mode text lives in `scripts/generate-mode-pages.mjs`, and the
script refuses to run until a new mode has its own copy there.

## Monthly check

Five minutes, once a month, so a surprise never gets as far as the $5 kill switch.

| Where | Look at | Normal | Act if |
|---|---|---|---|
| Firebase console → Usage and billing | This month's cost | $0.00 | anything above $0: find which product in the breakdown |
| Google Cloud console → Billing → Budgets & alerts | The $5 budget | Under 20% spent | It's climbing: check Functions below for a flood |
| Firebase console → Functions → Usage | Invocations per day | A few per visit: a leaderboard load on arrival and per board opened, a run start per run, a save now and then | Sudden spikes with no matching visits in Umami: someone is scripting the API; the rate limits cap it, but consider App Check |
| Firebase console → Firestore → Usage | Reads and writes per day | Far under the free 50K reads / 20K writes | Close to the limit: raise `LEADERBOARD_CACHE_MS` in `functions/index.js` |
| Firestore → Data → `LeaderboardScores` | The top of each mode | Believable scores | Junk names or impossible scores: `npm run remove-score -- <name>` |
| Umami → Gridshot → Events | Events this month | Well under 100K (the free plan's limit) | Near the limit: drop the noisiest events (`mode_select`, `theme_select`) |

The `Runs` collection grows by one small document per run. It's harmless, but if it ever reaches the
tens of thousands, clear it the same way as after a scoring change (see Removing a leaderboard
entry). Only unsubmitted runs from the last week matter.

## Analytics

Visits and a handful of game events (runs started, finished and abandoned, saves, shares) go to
[Umami Cloud](https://umami.is), which is cookieless, so there's no consent banner. Everything goes
through `track()` in `src/analytics.js`; on localhost events are only logged to the console.

## Installing

On Chrome and Edge the menu offers **Install app**. `public/sw.js` loads pages from the network
first (so deploys show up straight away) and serves the hashed files in `assets/` from its cache.
