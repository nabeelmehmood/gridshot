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

Scores live in the `LeaderboardScores` collection and tokens in `Runs`. The old `UserScores`
collection (the pre-validation leaderboard) is no longer read.
