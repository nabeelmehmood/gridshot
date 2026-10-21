// Regenerates the favicons, app icons and social preview image in public/ from the SVG sources in
// assets/. Run with `npm run assets` after changing a source or the theme colours. Text in the
// preview uses system fonts (Arial Black / Segoe UI), so output can differ slightly per machine.
import { readFile, writeFile } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';
import { THEME_IDS, THEMES } from '../src/themes.js';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
const write = (path, data) => writeFile(new URL(path, root), data);

function render(svg, width) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true, defaultFontFamily: 'Arial' }
  });
  return resvg.render().asPng();
}

// Same wave-split badge as the theme picker (src/modules/Menu), as a nested 40×40 SVG.
function badge(id, x, y, size, [top, wave, bottom]) {
  return `
  <svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 40 40">
    <clipPath id="badge-${id}"><circle cx="20" cy="20" r="19"/></clipPath>
    <g clip-path="url(#badge-${id})">
      <rect width="40" height="40" fill="${wave}"/>
      <path d="M0 0H40V16C27 27 13 9 0 19Z" fill="${top}"/>
      <path d="M0 27C13 17 27 35 40 24V40H0Z" fill="${bottom}"/>
    </g>
    <circle cx="20" cy="20" r="19" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
  </svg>`;
}

const icon = await read('assets/icon.svg');
const maskable = await read('assets/icon-maskable.svg');

await write('public/favicon.svg', icon);
const [png16, png32, png48] = [16, 32, 48].map(size => render(icon, size));
await write('public/favicon-16x16.png', png16);
await write('public/favicon-32x32.png', png32);
await write('public/favicon.ico', await pngToIco([png16, png32, png48]));
await write('public/android-chrome-192x192.png', render(icon, 192));
await write('public/android-chrome-512x512.png', render(icon, 512));
// iOS rounds the corners itself and shows transparency as black, so it gets the full-bleed art.
await write('public/apple-touch-icon.png', render(maskable, 180));
await write('public/maskable-512x512.png', render(maskable, 512));

const badges = THEME_IDS.map((id, i) => badge(id, 80 + i * 58, 448, 44, THEMES[id].swatch)).join('');
const og = (await read('assets/og-image.svg')).replace('<!--BADGES-->', badges);
await write('public/og-image.png', render(og, 1200));

console.log('Generated favicons, app icons and og-image.png in public/.');
