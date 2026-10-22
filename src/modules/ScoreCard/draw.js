import { themeAccent } from '../../themes';

// Score card: a 1200×630 PNG (the size link previews and chat apps show well) in the current theme.
const WIDTH = 1200;
const HEIGHT = 630;
const DISPLAY = 'Rajdhani, "Arial Narrow", sans-serif';
const BODY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const TEXT = '#e8ecf3';
const MUTED = '#8b94a7';
const SITE = 'nabeelmehmood.github.io/gridshot';

function glow(ctx, x, y, radius, color) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `${color}66`);
  gradient.addColorStop(1, `${color}00`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function text(ctx, value, x, y, { size, color = TEXT, font = DISPLAY, weight = 700, spacing = 0 }) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.letterSpacing = `${spacing}px`;
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
  return ctx.measureText(value).width;
}

function target(ctx, x, y, color, accent) {
  const rings = [170, 128, 86, 44];
  rings.forEach((radius, index) => {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = index % 2 === 0 ? color : '#0d1017';
    ctx.globalAlpha = index % 2 === 0 ? 0.9 : 0.85;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * 30, y + dy * 30);
    ctx.lineTo(x + dx * 215, y + dy * 215);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
}

function badge(ctx, label, x, y, background, color) {
  ctx.font = `700 24px ${DISPLAY}`;
  ctx.letterSpacing = '3px';
  const width = ctx.measureText(label).width + 36;
  ctx.fillStyle = background;
  ctx.beginPath();
  ctx.roundRect(x, y, width, 44, 10);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(label, x + 18, y + 31);
}

export async function renderScoreCard({ score, modeName, accuracy, bestStreak, hits, newBest, rank, theme }) {
  try {
    await document.fonts.load(`700 64px ${DISPLAY}`);
  } catch {
    // Falls back to the next font in the stack.
  }
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const [top, wave, bottom] = theme.swatch;
  const { accent, accentText } = themeAccent(theme);

  ctx.fillStyle = '#0d1017';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  glow(ctx, 1020, 80, 560, top);
  glow(ctx, 1150, 620, 520, bottom);
  glow(ctx, 120, 700, 480, wave);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(WIDTH, y + 0.5);
    ctx.stroke();
  }

  target(ctx, 930, 300, theme.targetColor, accent);

  text(ctx, 'GRIDSHOT', 80, 112, { size: 46, spacing: 10 });
  text(ctx, modeName.toUpperCase(), 80, 168, { size: 36, color: accent, spacing: 4 });
  text(ctx, String(score), 70, 372, { size: 210 });
  if (newBest) badge(ctx, 'NEW PERSONAL BEST', 84, 398, accent, accentText);
  if (rank) {
    const x = newBest ? 84 + ctx.measureText('NEW PERSONAL BEST').width + 60 : 84;
    text(ctx, `${rank.name.toUpperCase()} RANK`, x, 431, { size: 30, color: rank.color, spacing: 3 });
  }

  const stats = [
    ['Accuracy', accuracy],
    ['Best streak', String(bestStreak)],
    ['Hits', String(hits)]
  ];
  stats.forEach(([label, value], index) => {
    const x = 84 + index * 190;
    text(ctx, value, x, 520, { size: 52 });
    text(ctx, label.toUpperCase(), x, 552, { size: 17, color: MUTED, font: BODY, weight: 600, spacing: 2 });
  });

  text(ctx, SITE, 84, 600, { size: 20, color: MUTED, font: BODY, weight: 500 });

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}
