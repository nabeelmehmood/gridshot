import { MAX_STREAK_BONUS, STREAK_STEP, streakBonus, streakMultiplier } from '../../game/scoring';
import { seeded } from './textures';

// Faces for the in-scene streak sign, one per theme: each paints its own material (planks, a
// caution poster, a neon billboard...) and lays the same information out in its own colours.
const DISPLAY = 'Rajdhani, "Arial Narrow", sans-serif';

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function text(ctx, value, x, y, { size, color, align = 'left', spacing = 0, glow = null, engrave = null }) {
  ctx.font = `700 ${size}px ${DISPLAY}`;
  ctx.letterSpacing = `${spacing}px`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (engrave) {
    ctx.fillStyle = engrave;
    ctx.fillText(value, x + 2, y + 2);
  }
  ctx.shadowColor = glow ?? 'transparent';
  ctx.shadowBlur = glow ? size * 0.3 : 0;
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
}

// The information, laid out inside `box`. Landscape: big number left, badge and pace right, bar
// along the bottom. Portrait: everything stacked.
function content(ctx, box, colors, labels, view, layout) {
  const { running, streak, best, pace, lost } = view;
  const tier = running && !lost ? streakBonus(streak) : 0;
  const { x, y, width, height } = box;
  const portrait = layout === 'portrait';
  const glow = colors.glow ?? null;
  const engrave = colors.engrave ?? null;
  const labelSize = Math.round((portrait ? width : height) * (portrait ? 0.095 : 0.16));
  const numberSize = Math.round((portrait ? width : height) * (portrait ? 0.5 : 0.66));

  const title = lost ? labels.lost : running ? labels.run : labels.best;
  const titleColor = lost ? colors.bad : colors.muted;
  const value = String(lost || (running ? streak : best));
  const valueColor = lost ? colors.bad : colors.text;

  if (portrait) {
    let cursor = y + labelSize;
    if (!colors.labelInHeader || lost) {
      text(ctx, title, x + width / 2, cursor, { size: labelSize, color: titleColor, align: 'center', spacing: 4, glow, engrave });
    }
    cursor += numberSize * 0.95;
    text(ctx, value, x + width / 2, cursor, { size: numberSize, color: valueColor, align: 'center', glow, engrave });
    if (lost) return;
    cursor += labelSize * 0.6;
    if (!running) {
      text(ctx, `${STREAK_STEP} IN A ROW = ×1.1`, x + width / 2, cursor + labelSize, { size: labelSize * 0.8, color: colors.muted, align: 'center', glow });
      return;
    }
    badge(ctx, `×${streakMultiplier(streak).toFixed(1)}`, x + width / 2, cursor, labelSize * 2.8, tier, colors, 'center');
    cursor += labelSize * 2.8 + labelSize * 1.3;
    if (pace !== null) paceLine(ctx, pace, x + width / 2, cursor, labelSize, colors, 'center');
    bar(ctx, x, y + height - labelSize * 0.45, width, labelSize * 0.32, streak, tier, colors);
    return;
  }

  if (!colors.labelInHeader || lost) {
    text(ctx, title, x, y + labelSize, { size: labelSize, color: titleColor, spacing: 5, glow, engrave });
  }
  text(ctx, value, x - numberSize * 0.03, y + height - labelSize * 0.9, { size: numberSize, color: valueColor, glow, engrave });
  if (lost) return;
  if (!running) {
    text(ctx, `${STREAK_STEP} IN A ROW = ×1.1`, x + width, y + labelSize, { size: labelSize * 0.8, color: colors.muted, align: 'right', glow });
    text(ctx, `UP TO ×${streakMultiplier(STREAK_STEP * MAX_STREAK_BONUS).toFixed(1)}`, x + width, y + labelSize * 2.1, {
      size: labelSize * 0.8,
      color: colors.muted,
      align: 'right',
      glow
    });
    return;
  }
  badge(ctx, `×${streakMultiplier(streak).toFixed(1)}`, x + width, y, labelSize * 2.3, tier, colors, 'right');
  if (pace !== null) paceLine(ctx, pace, x + width, y + height * 0.72, labelSize, colors, 'right');
  bar(ctx, x, y + height - labelSize * 0.35, width, labelSize * 0.32, streak, tier, colors);
}

function badge(ctx, label, x, y, height, tier, colors, align) {
  ctx.font = `700 ${height * 0.78}px ${DISPLAY}`;
  ctx.letterSpacing = '0px';
  const width = ctx.measureText(label).width + height * 0.6;
  const left = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
  roundRect(ctx, left, y, width, height, height / 2);
  ctx.fillStyle = tier > 0 ? colors.accent : colors.badgeIdle;
  ctx.fill();
  text(ctx, label, left + width / 2, y + height * 0.8, {
    size: height * 0.78,
    color: tier > 0 ? colors.accentText : colors.muted,
    align: 'center'
  });
}

function paceLine(ctx, pace, x, y, size, colors, align) {
  const ahead = pace >= 0;
  text(ctx, `${ahead ? '+' : ''}${pace} VS BEST`, x, y, { size: size * 0.95, color: ahead ? colors.good : colors.bad, align, spacing: 2, glow: colors.glow });
}

function bar(ctx, x, y, width, height, streak, tier, colors) {
  const progress = tier >= MAX_STREAK_BONUS ? 1 : (streak % STREAK_STEP) / STREAK_STEP;
  roundRect(ctx, x, y, width, height, height / 2);
  ctx.fillStyle = colors.track;
  ctx.fill();
  if (progress <= 0) return;
  roundRect(ctx, x, y, width * progress, height, height / 2);
  ctx.fillStyle = colors.fill ?? colors.accent;
  ctx.fill();
}

// --- Theme materials -----------------------------------------------------------------------

function wood(ctx, w, h) {
  const rand = seeded(7);
  roundRect(ctx, 6, 6, w - 12, h - 12, 18);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#a8713f';
  ctx.fillRect(0, 0, w, h);
  const planks = 3;
  for (let p = 0; p < planks; p++) {
    const top = (h / planks) * p;
    ctx.fillStyle = p % 2 ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(0, top, w, h / planks);
    for (let i = 0; i < 26; i++) {
      const gy = top + rand() * (h / planks);
      ctx.strokeStyle = `rgba(70, 40, 18, ${0.08 + rand() * 0.14})`;
      ctx.lineWidth = 1 + rand() * 2;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      for (let x = 0; x <= w; x += 64) ctx.lineTo(x, gy + Math.sin(x * 0.01 + i) * 3);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(50, 28, 12, 0.55)';
    ctx.fillRect(0, top - 2, w, 4);
    for (const nx of [30, w - 30]) {
      ctx.beginPath();
      ctx.arc(nx, top + h / planks / 2, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#4a3a2a';
      ctx.fill();
    }
  }
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.6);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(40,20,5,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#6b4226';
  roundRect(ctx, 6, 6, w - 12, h - 12, 18);
  ctx.stroke();
}

function caution(ctx, w, h) {
  roundRect(ctx, 8, 8, w - 16, h - 16, 26);
  ctx.fillStyle = '#ffd21f';
  ctx.fill();
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#111';
  roundRect(ctx, 30, 30, w - 60, h - 60, 16);
  ctx.stroke();
  // Warning triangle and the header word.
  const cx = w / 2;
  const top = 70;
  const size = w * 0.2;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.lineTo(cx + size / 2, top + size * 0.86);
  ctx.lineTo(cx - size / 2, top + size * 0.86);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 16;
  ctx.strokeStyle = '#111';
  ctx.stroke();
  text(ctx, '!', cx, top + size * 0.76, { size: size * 0.62, color: '#111', align: 'center' });
  text(ctx, 'CAUTION', cx, top + size * 0.86 + 78, { size: 78, color: '#111', align: 'center', spacing: 8 });
  ctx.fillStyle = '#111';
  ctx.fillRect(60, top + size * 0.86 + 100, w - 120, 8);
}

function billboard(ctx, w, h) {
  ctx.fillStyle = '#0d0420';
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createLinearGradient(0, h, 0, 0);
  glow.addColorStop(0, 'rgba(255, 43, 214, 0.28)');
  glow.addColorStop(0.6, 'rgba(255, 43, 214, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
  for (let y = 0; y < h; y += 6) ctx.fillRect(0, y, w, 2);
  text(ctx, 'GRIDSHOT · LIVE', w - 40, h - 26, { size: 26, color: 'rgba(34, 230, 255, 0.7)', align: 'right', spacing: 6 });
}

function hologram(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  roundRect(ctx, 6, 6, w - 12, h - 12, 10);
  ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.8)';
  ctx.stroke();
  ctx.fillStyle = 'rgba(125, 211, 252, 0.08)';
  for (let y = 10; y < h; y += 8) ctx.fillRect(10, y, w - 20, 2);
  ctx.strokeStyle = 'rgba(224, 246, 255, 0.9)';
  ctx.lineWidth = 6;
  for (const [x, y, dx, dy] of [[14, 14, 1, 1], [w - 14, 14, -1, 1], [14, h - 14, 1, -1], [w - 14, h - 14, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x, y + dy * 36);
    ctx.lineTo(x, y);
    ctx.lineTo(x + dx * 36, y);
    ctx.stroke();
  }
}

function steel(ctx, w, h, colors, labels) {
  ctx.fillStyle = '#8b9199';
  ctx.fillRect(0, 0, w, h);
  const rand = seeded(11);
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = `rgba(255, 255, 255, ${rand() * 0.06})`;
    ctx.fillRect(0, y, w, 1);
  }
  // Hazard-stripe header carrying the board's title.
  const band = h * 0.24;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, band);
  ctx.clip();
  ctx.fillStyle = '#e0aa18';
  ctx.fillRect(0, 0, w, band);
  ctx.fillStyle = '#1b1d20';
  for (let x = -band; x < w + band; x += 56) {
    ctx.beginPath();
    ctx.moveTo(x, band);
    ctx.lineTo(x + 28, band);
    ctx.lineTo(x + 28 + band, 0);
    ctx.lineTo(x + band, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  roundRect(ctx, w * 0.2, band * 0.16, w * 0.6, band * 0.68, 6);
  ctx.fillStyle = '#1b1d20';
  ctx.fill();
  text(ctx, labels.run, w / 2, band * 0.66, { size: band * 0.42, color: '#e0aa18', align: 'center', spacing: 4 });
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#4b5059';
  ctx.strokeRect(5, 5, w - 10, h - 10);
  for (const [x, y] of [[22, band + 18], [w - 22, band + 18], [22, h - 22], [w - 22, h - 22]]) {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#5d636c';
    ctx.fill();
  }
}

// Puffy cloud outline (union of circles) filled with `fill`, for the soft themes.
function cloud(ctx, w, h, fill, edge) {
  const blobs = [
    [0.18, 0.55, 0.3], [0.34, 0.36, 0.34], [0.52, 0.3, 0.36], [0.7, 0.36, 0.33], [0.84, 0.56, 0.3],
    [0.3, 0.7, 0.3], [0.52, 0.72, 0.32], [0.72, 0.7, 0.3]
  ];
  ctx.beginPath();
  for (const [bx, by, br] of blobs) {
    ctx.moveTo(bx * w + br * h, by * h);
    ctx.arc(bx * w, by * h, br * h, 0, Math.PI * 2);
  }
  ctx.fillStyle = fill;
  ctx.shadowColor = edge;
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function heart(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 20, size / 20);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-10, -2, -10, -12, 0, -8);
  ctx.bezierCurveTo(10, -12, 10, -2, 0, 6);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function kawaii(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const fill = ctx.createLinearGradient(0, 0, 0, h);
  fill.addColorStop(0, '#ffe6f2');
  fill.addColorStop(1, '#ffc7e1');
  cloud(ctx, w, h, fill, 'rgba(255, 120, 190, 0.9)');
  heart(ctx, w * 0.1, h * 0.3, 34, '#ff8fc7');
  heart(ctx, w * 0.92, h * 0.24, 26, '#ffb3da');
  heart(ctx, w * 0.88, h * 0.86, 22, '#ff8fc7');
}

function daydream(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const fill = ctx.createLinearGradient(0, 0, 0, h);
  fill.addColorStop(0, '#ffffff');
  fill.addColorStop(1, '#e9dcff');
  cloud(ctx, w, h, fill, 'rgba(200, 170, 255, 0.8)');
}

function panel(ctx, w, h, colors) {
  roundRect(ctx, 8, 8, w - 16, h - 16, 28);
  ctx.fillStyle = 'rgba(9, 11, 17, 0.9)';
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = colors.frame;
  ctx.stroke();
}

const LANDSCAPE = [1024, 320];

// size: canvas pixels. box: content area as fractions of the canvas. labels: the three titles.
export const FACES = {
  playground: {
    size: [1024, 600],
    box: [0.07, 0.12, 0.86, 0.76],
    labels: { run: 'STREAK', best: 'BEST STREAK', lost: 'STREAK LOST' },
    colors: { text: '#3b2412', engrave: 'rgba(230, 180, 120, 0.55)', muted: '#5c3a1e', accent: '#ffc233', accentText: '#2a1d00', badgeIdle: 'rgba(59, 36, 18, 0.18)', track: 'rgba(59, 36, 18, 0.22)', fill: '#3b2412', good: '#2f6e2f', bad: '#9e2418' },
    paint: wood
  },
  pool: {
    size: [640, 900],
    layout: 'portrait',
    box: [0.1, 0.32, 0.8, 0.62],
    labels: { run: 'HOT STREAK', best: 'BEST STREAK', lost: 'STREAK SLIPPED' },
    colors: { text: '#111', muted: '#3b3200', accent: '#111', accentText: '#ffd21f', badgeIdle: 'rgba(0, 0, 0, 0.14)', track: 'rgba(0, 0, 0, 0.18)', fill: '#111', good: '#0b6b2f', bad: '#b3160b' },
    paint: caution
  },
  neon: {
    size: LANDSCAPE,
    box: [0.05, 0.12, 0.9, 0.7],
    labels: { run: 'STREAK', best: 'BEST STREAK', lost: 'STREAK LOST' },
    colors: { text: '#ffffff', glow: '#ff2bd6', muted: '#22e6ff', accent: '#ff2bd6', accentText: '#21001a', badgeIdle: 'rgba(255, 255, 255, 0.1)', track: 'rgba(255, 255, 255, 0.12)', good: '#3dffb0', bad: '#ff4d6d' },
    paint: billboard
  },
  space: {
    size: LANDSCAPE,
    box: [0.06, 0.14, 0.88, 0.72],
    labels: { run: 'STREAK', best: 'BEST STREAK', lost: 'STREAK LOST' },
    colors: { text: '#e0f6ff', glow: '#38bdf8', muted: '#7dd3fc', accent: '#38bdf8', accentText: '#00121f', badgeIdle: 'rgba(125, 211, 252, 0.15)', track: 'rgba(125, 211, 252, 0.2)', good: '#5eead4', bad: '#fb7185' },
    paint: hologram
  },
  prison: {
    size: LANDSCAPE,
    box: [0.06, 0.32, 0.88, 0.6],
    labels: { run: 'HITS WITHOUT A MISS', best: 'BEST RUN WITHOUT A MISS', lost: 'COUNTER RESET' },
    colors: { text: '#1b1d20', muted: '#3a3e45', accent: '#e0aa18', accentText: '#1b1400', badgeIdle: 'rgba(0, 0, 0, 0.14)', track: 'rgba(0, 0, 0, 0.2)', fill: '#1b1d20', good: '#1d6b2f', bad: '#9b1c1c', labelInHeader: true },
    paint: steel
  },
  kawaii: {
    size: LANDSCAPE,
    box: [0.15, 0.2, 0.7, 0.62],
    labels: { run: 'STREAK', best: 'BEST STREAK', lost: 'OH NO!' },
    colors: { text: '#7a2e5c', muted: '#b0568a', accent: '#ff8fc7', accentText: '#4a1033', badgeIdle: 'rgba(122, 46, 92, 0.12)', track: 'rgba(122, 46, 92, 0.15)', good: '#2f8f5b', bad: '#d6336c' },
    paint: kawaii
  },
  daydream: {
    size: LANDSCAPE,
    box: [0.15, 0.2, 0.7, 0.62],
    labels: { run: 'STREAK', best: 'BEST STREAK', lost: 'STREAK LOST' },
    colors: { text: '#5b4a8a', muted: '#9a8cc0', accent: '#f6a6c9', accentText: '#3a1328', badgeIdle: 'rgba(91, 74, 138, 0.12)', track: 'rgba(91, 74, 138, 0.15)', good: '#3f9f7a', bad: '#d0507a' },
    paint: daydream
  },
  classic: {
    size: LANDSCAPE,
    box: [0.06, 0.14, 0.88, 0.76],
    labels: { run: 'STREAK', best: 'BEST STREAK', lost: 'STREAK LOST' },
    colors: { text: '#e8ecf3', muted: '#8b94a7', accent: '#ffcf33', accentText: '#1a1400', badgeIdle: 'rgba(255, 255, 255, 0.1)', track: 'rgba(255, 255, 255, 0.12)', good: '#3ddc97', bad: '#ff6b6b', frame: '#3a4150' },
    paint: panel
  }
};

export function paintFace(ctx, face, view) {
  const [w, h] = face.size;
  ctx.clearRect(0, 0, w, h);
  face.paint(ctx, w, h, face.colors, face.labels);
  const [bx, by, bw, bh] = face.box;
  content(ctx, { x: bx * w, y: by * h, width: bw * w, height: bh * h }, face.colors, face.labels, view, face.layout ?? 'landscape');
}
