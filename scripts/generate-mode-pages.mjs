// Writes a static page per mode to public/modes/<id>/index.html and rebuilds public/sitemap.xml.
// Search engines index pages, not menu options, so each mode gets its own URL with real content.
// Runs before every build (npm "prebuild"); run it by hand with `npm run pages`.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';

// The game modules use Vite-style imports without file extensions; let Node retry them with '.js'.
register(
  'data:text/javascript,' +
    encodeURIComponent(`export async function resolve(specifier, context, next) {
      try {
        return await next(specifier, context);
      } catch (error) {
        if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.') || specifier.endsWith('.js')) throw error;
        return next(specifier + '.js', context);
      }
    }`)
);
const { MODE_IDS, MODES } = await import('../src/game/modes.js');
const { RANK_THRESHOLDS, TIERS } = await import('../src/game/ranks.js');
const { GAME_DURATION, MAX_STREAK_BONUS, POINTS, STREAK_STEP } = await import('../src/game/scoring.js');

const SITE = 'https://nabeelmehmood.github.io/gridshot/';
const BASE = '/gridshot/';
const OUT = new URL('../public/modes/', import.meta.url);
const today = new Date().toISOString().slice(0, 10);

// Per-mode copy: what the mode trains and how to get better at it.
const CONTENT = {
  gridshot: {
    keyword: 'target switching aim trainer',
    trains: 'Target switching and flick speed: clearing several targets quickly and accurately, the core skill in any fast FPS fight.',
    tips: [
      'Look for the next target while you shoot the current one, so your flick starts the moment you click.',
      `Accuracy pays: a miss costs ${-POINTS.MISS} points and resets your streak bonus, so a steady pace beats spraying.`,
      'Keep your arm relaxed and let your wrist do the short hops between neighbouring targets.'
    ]
  },
  strafe: {
    keyword: 'tracking aim trainer',
    trains: 'Tracking a moving target and clicking at the right moment, like an enemy strafing side to side.',
    tips: [
      "Match the target's speed first, then click once your crosshair is moving with it.",
      'Move smoothly from the arm instead of making small jerky corrections.',
      'Watch for the turn at the end of each sweep: that is where the target slows down.'
    ]
  },
  popin: {
    keyword: 'reaction time aim trainer',
    trains: 'Reaction time and precision under pressure: targets flash up, shrink and disappear in about a second.',
    tips: [
      'React first and fine-tune second: a quick, slightly rough flick beats a perfect late one.',
      `Letting a target expire costs ${-POINTS.EXPIRED} points, so take every shot you can reach.`,
      'Keep your crosshair near the middle of the board between targets to shorten every flick.'
    ]
  },
  skeet: {
    keyword: 'moving target aim trainer',
    trains: 'Leading targets on a curved path: clay discs fly across in an arc and speed up as they fall.',
    tips: [
      'Track the disc for a moment before clicking instead of snapping to where it was.',
      'The top of the arc is where a disc moves slowest. Many players time their shots for it.',
      'Two discs can be in the air at once: take the one that will escape first.'
    ]
  },
  spidershot: {
    keyword: 'flick aim trainer',
    trains: 'Flick accuracy and resetting to centre: centre, somewhere random, then centre again.',
    tips: [
      'Treat the return to centre as a shot of its own and stay as precise as on the flick out.',
      'If you keep overshooting the far targets, slow the end of your flick, not the start.',
      'Long flicks come from the arm, short corrections from the wrist.'
    ]
  },
  microshot: {
    keyword: 'precision aim trainer',
    trains: 'Micro-adjustments: tiny targets right next to the crosshair, for precise small corrections.',
    tips: [
      'Use small, controlled wrist and finger movements; big arm movements overshoot here.',
      'Slow down until you stop missing, then speed up again.',
      'A lower sensitivity often helps for this mode.'
    ]
  },
  bounce: {
    keyword: 'reactive tracking aim trainer',
    trains: 'Reactive tracking: three balls bounce around the board and change direction without warning.',
    tips: [
      'Pick a ball and follow it rather than jumping between all three.',
      'Balls are slowest at the top of a bounce: that is the easiest moment to click.',
      'Keep your eyes on the ball, not your crosshair.'
    ]
  },
  survival: {
    keyword: 'aim endurance trainer',
    trains: 'Consistency and focus: there is no clock, targets shrink away faster and faster, and three expired targets end the run.',
    tips: [
      'Hit the oldest target first. It is the one closest to expiring.',
      'Stay calm when more targets appear; rushing causes misses, and misses reset your streak.',
      'Your score keeps climbing as long as you survive, so consistency beats speed.'
    ]
  }
};

const escape = text =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function scoringItems(mode) {
  const items = [`Hit: <strong>+${POINTS.HIT}</strong>`, `Miss: <strong>${POINTS.MISS}</strong>`];
  if (mode.expiredLabel) items.push(`${mode.expiredLabel} target: <strong>${POINTS.EXPIRED}</strong>`);
  items.push(
    `Streak bonus: every ${STREAK_STEP} hits in a row add +1 to each hit, up to +${MAX_STREAK_BONUS} (×${(
      1 +
      MAX_STREAK_BONUS / 10
    ).toFixed(1)})`
  );
  items.push(mode.untimed ? `No clock: the run ends when ${mode.lives} targets expire` : `Each run lasts ${GAME_DURATION} seconds`);
  return items;
}

function page(id) {
  const mode = MODES[id];
  const content = CONTENT[id];
  const url = `${SITE}modes/${id}/`;
  const title = `${mode.name} – free ${content.keyword} in your browser | Gridshot`;
  const description = `Play ${mode.name} free in your browser. ${mode.description} No download, no sign-up.`;
  const thresholds = RANK_THRESHOLDS[id];
  const ranks = TIERS.map((tier, index) => ({ ...tier, from: index === 0 ? 1 : thresholds[index - 1] }));
  const others = MODE_IDS.filter(other => other !== id);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escape(title)}</title>
    <meta name="description" content="${escape(description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta name="theme-color" content="#0d1017" />
    <meta name="color-scheme" content="dark" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Gridshot" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${escape(title)}" />
    <meta property="og:description" content="${escape(description)}" />
    <meta property="og:image" content="${SITE}og-image.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="icon" href="${BASE}favicon.svg" type="image/svg+xml" />
    <link rel="icon" href="${BASE}favicon.ico" sizes="48x48" />
    <link rel="apple-touch-icon" sizes="180x180" href="${BASE}apple-touch-icon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&display=swap" rel="stylesheet" />
    <script type="application/ld+json">
      ${JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        url,
        description,
        isPartOf: { '@type': 'WebSite', name: 'Gridshot', url: SITE },
        breadcrumb: {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Gridshot', item: SITE },
            { '@type': 'ListItem', position: 2, name: mode.name, item: url }
          ]
        }
      })}
    </script>
    <style>
      :root { --bg: #0d1017; --panel: #151a24; --line: rgba(255, 255, 255, 0.08); --text: #e8ecf3; --muted: #8b94a7; --accent: #ffcf33; --accent-text: #1a1400; color-scheme: dark; }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
      main { max-width: 760px; margin: 0 auto; padding: 32px max(16px, env(safe-area-inset-left)) 64px; display: flex; flex-direction: column; gap: 28px; }
      h1, h2 { font-family: Rajdhani, 'Arial Narrow', sans-serif; line-height: 1.1; margin: 0; text-wrap: balance; }
      h1 { font-size: clamp(36px, 7vw, 56px); letter-spacing: 0.02em; }
      h2 { font-size: 24px; letter-spacing: 0.03em; }
      p { margin: 0; }
      a { color: var(--accent); }
      .crumb { font-size: 14px; color: var(--muted); }
      .crumb a { color: var(--muted); }
      .lead { font-size: 18px; color: var(--muted); max-width: 62ch; }
      .play { align-self: flex-start; display: inline-block; padding: 14px 28px; border-radius: 12px; background: var(--accent); color: var(--accent-text); font-family: Rajdhani, sans-serif; font-size: 22px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none; }
      .play:hover { filter: brightness(1.08); }
      .note { font-size: 13px; color: var(--muted); }
      section { display: flex; flex-direction: column; gap: 10px; }
      ul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
      table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
      th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid var(--line); }
      th { font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
      .tier { font-family: Rajdhani, sans-serif; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
      .modes { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 8px; padding: 0; list-style: none; }
      .modes a { display: block; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--panel); color: var(--text); text-decoration: none; }
      .modes a:hover { border-color: var(--accent); }
      footer { font-size: 13px; color: var(--muted); }
    </style>
  </head>
  <body>
    <main>
      <nav class="crumb" aria-label="Breadcrumb"><a href="${BASE}">Gridshot</a> / ${escape(mode.name)}</nav>
      <header>
        <h1>${escape(mode.name)}: ${escape(content.keyword)}</h1>
      </header>
      <p class="lead">${escape(mode.description)} Free in your browser, no download or sign-up.</p>
      <a class="play" href="${BASE}?mode=${id}">Play ${escape(mode.name)}</a>
      <p class="note">Needs a computer with a mouse. Your score can go on the global and weekly leaderboards.</p>

      <section>
        <h2>What it trains</h2>
        <p>${escape(content.trains)}</p>
      </section>

      <section>
        <h2>How scoring works</h2>
        <ul>
          ${scoringItems(mode).map(item => `<li>${item}</li>`).join('\n          ')}
        </ul>
      </section>

      <section>
        <h2>What's a good score?</h2>
        <table>
          <thead><tr><th>Rank</th><th>Score from</th></tr></thead>
          <tbody>
            ${ranks.map(rank => `<tr><td class="tier" style="color: ${rank.color}">${rank.name}</td><td>${rank.from}</td></tr>`).join('\n            ')}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Tips</h2>
        <ul>
          ${content.tips.map(tip => `<li>${escape(tip)}</li>`).join('\n          ')}
        </ul>
      </section>

      <section>
        <h2>More modes</h2>
        <ul class="modes">
          ${others.map(other => `<li><a href="${BASE}modes/${other}/">${escape(MODES[other].name)}</a></li>`).join('\n          ')}
        </ul>
      </section>

      <footer>Gridshot is a free browser aim trainer with ${MODE_IDS.length} modes, 8 themes and leaderboards. <a href="${BASE}">Play now</a>.</footer>
    </main>
  </body>
</html>
`;
}

function sitemap() {
  const urls = [
    { loc: SITE, priority: '1.0' },
    ...MODE_IDS.map(id => ({ loc: `${SITE}modes/${id}/`, priority: '0.8' }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ loc, priority }) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
}

const missing = MODE_IDS.filter(id => !CONTENT[id]);
if (missing.length) throw new Error(`Add page copy for: ${missing.join(', ')}`);

rmSync(OUT, { recursive: true, force: true });
for (const id of MODE_IDS) {
  const dir = new URL(`${id}/`, OUT);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), page(id));
}
writeFileSync(new URL('../public/sitemap.xml', import.meta.url), sitemap());
console.log(`Wrote ${MODE_IDS.length} mode pages and the sitemap.`);
