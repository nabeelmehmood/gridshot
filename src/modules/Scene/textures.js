import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

// Every texture is drawn on a canvas at runtime: no image downloads. Seeded randomness keeps them
// identical between loads. Static textures are cached for the app's lifetime (they're small).
const cache = new Map();

export function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function drawTexture(width, height, draw, { color = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  if (color) texture.colorSpace = SRGBColorSpace;
  return texture;
}

function cached(key, repeat, create) {
  const cacheKey = `${key}@${repeat.join('x')}`;
  if (!cache.has(cacheKey)) {
    const texture = create();
    texture.repeat.set(repeat[0], repeat[1]);
    cache.set(cacheKey, texture);
  }
  return cache.get(cacheKey);
}

// Soft round sprite used by particles, halos and marks.
export const dotTexture = () =>
  cached('dot', [1, 1], () =>
    drawTexture(64, 64, (ctx, w) => {
      const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.45, 'rgba(255,255,255,0.8)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, w);
    })
  );

export const heartTexture = () =>
  cached('heart', [1, 1], () =>
    drawTexture(64, 64, ctx => {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(32, 54);
      ctx.bezierCurveTo(6, 36, 6, 12, 22, 12);
      ctx.bezierCurveTo(28, 12, 32, 18, 32, 22);
      ctx.bezierCurveTo(32, 18, 36, 12, 42, 12);
      ctx.bezierCurveTo(58, 12, 58, 36, 32, 54);
      ctx.fill();
    })
  );

export const featherTexture = () =>
  cached('feather', [1, 1], () =>
    drawTexture(64, 64, ctx => {
      ctx.translate(32, 32);
      ctx.rotate(-0.7);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(180,160,200,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -26);
      ctx.lineTo(0, 30);
      ctx.stroke();
    })
  );

// Vertical gradient for sky domes; stops run top (0) to bottom (1).
export const gradientTexture = (key, stops) =>
  cached(`gradient-${key}`, [1, 1], () =>
    drawTexture(4, 256, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      stops.forEach(([at, color]) => g.addColorStop(at, color));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    })
  );

export const grassTexture = repeat =>
  cached('grass', repeat, () =>
    drawTexture(256, 256, (ctx, w) => {
      const rand = seeded(7);
      ctx.fillStyle = '#5b9e3c';
      ctx.fillRect(0, 0, w, w);
      for (let i = 0; i < 2600; i++) {
        const shade = 70 + Math.floor(rand() * 70);
        ctx.strokeStyle = `rgb(${shade - 40},${shade + 70},${shade - 50})`;
        ctx.lineWidth = 1 + rand();
        const x = rand() * w;
        const y = rand() * w;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rand() - 0.5) * 4, y - 4 - rand() * 6);
        ctx.stroke();
      }
    })
  );

export const sandTexture = repeat =>
  cached('sand', repeat, () =>
    drawTexture(128, 128, (ctx, w) => {
      const rand = seeded(11);
      ctx.fillStyle = '#e3cc94';
      ctx.fillRect(0, 0, w, w);
      for (let i = 0; i < 1500; i++) {
        ctx.fillStyle = rand() < 0.5 ? 'rgba(160,130,80,0.35)' : 'rgba(255,245,215,0.5)';
        ctx.fillRect(rand() * w, rand() * w, 1.5, 1.5);
      }
    })
  );

export const steelTexture = repeat =>
  cached('steel', repeat, () =>
    drawTexture(512, 512, (ctx, w) => {
      const rand = seeded(23);
      ctx.fillStyle = '#5f656d';
      ctx.fillRect(0, 0, w, w);
      // Brushed grain.
      for (let i = 0; i < 900; i++) {
        ctx.strokeStyle = rand() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
        const y = rand() * w;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + (rand() - 0.5) * 3);
        ctx.stroke();
      }
      // Grime.
      for (let i = 0; i < 40; i++) {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 30 + rand() * 60);
        g.addColorStop(0, 'rgba(30,25,20,0.22)');
        g.addColorStop(1, 'rgba(30,25,20,0)');
        ctx.save();
        ctx.translate(rand() * w, rand() * w);
        ctx.fillStyle = g;
        ctx.fillRect(-90, -90, 180, 180);
        ctx.restore();
      }
      // Two-by-two plates with seams and rivets.
      const plate = w / 2;
      for (const x of [0, plate]) {
        for (const y of [0, plate]) {
          ctx.strokeStyle = 'rgba(15,17,20,0.9)';
          ctx.lineWidth = 4;
          ctx.strokeRect(x + 2, y + 2, plate - 4, plate - 4);
          ctx.strokeStyle = 'rgba(255,255,255,0.12)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 6, y + 6, plate - 12, plate - 12);
          for (let r = 18; r < plate; r += 34) {
            for (const [rx, ry] of [[x + r, y + 14], [x + r, y + plate - 14], [x + 14, y + r], [x + plate - 14, y + r]]) {
              ctx.fillStyle = '#3c4148';
              ctx.beginPath();
              ctx.arc(rx, ry, 4.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = 'rgba(255,255,255,0.35)';
              ctx.beginPath();
              ctx.arc(rx - 1.2, ry - 1.2, 1.6, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    })
  );

export const concreteTexture = repeat =>
  cached('concrete', repeat, () =>
    drawTexture(256, 256, (ctx, w) => {
      const rand = seeded(31);
      ctx.fillStyle = '#56575a';
      ctx.fillRect(0, 0, w, w);
      for (let i = 0; i < 4000; i++) {
        ctx.fillStyle = rand() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.06)';
        ctx.fillRect(rand() * w, rand() * w, 2, 2);
      }
      ctx.strokeStyle = 'rgba(20,20,20,0.35)';
      for (let i = 0; i < 4; i++) {
        let x = rand() * w;
        let y = rand() * w;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let s = 0; s < 8; s++) {
          x += (rand() - 0.5) * 30;
          y += rand() * 20;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    })
  );

export const hazardTexture = repeat =>
  cached('hazard', repeat, () =>
    drawTexture(128, 32, (ctx, w, h) => {
      ctx.fillStyle = '#1b1b1b';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e0aa18';
      for (let x = -h; x < w + h; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x + 16, h);
        ctx.lineTo(x + 16 + h, 0);
        ctx.lineTo(x + h, 0);
        ctx.fill();
      }
    })
  );

export const tileTexture = (key, base, grout, repeat) =>
  cached(`tile-${key}`, repeat, () =>
    drawTexture(256, 256, (ctx, w) => {
      const rand = seeded(41);
      ctx.fillStyle = grout;
      ctx.fillRect(0, 0, w, w);
      const tile = w / 4;
      for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
          ctx.fillStyle = base;
          ctx.fillRect(x * tile + 2, y * tile + 2, tile - 4, tile - 4);
          ctx.fillStyle = `rgba(255,255,255,${0.04 + rand() * 0.1})`;
          ctx.fillRect(x * tile + 2, y * tile + 2, tile - 4, tile - 4);
        }
      }
    })
  );

// Bright wobbly ring network approximating light refracted through water.
export const causticTexture = repeat =>
  cached('caustic', repeat, () =>
    drawTexture(512, 512, (ctx, w) => {
      const rand = seeded(53);
      ctx.filter = 'blur(1.5px)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 90; i++) {
        const x = rand() * w;
        const y = rand() * w;
        const r = 18 + rand() * 46;
        ctx.strokeStyle = `rgba(255,255,255,${0.25 + rand() * 0.35})`;
        ctx.beginPath();
        for (let a = 0; a <= 12; a++) {
          const angle = (a / 12) * Math.PI * 2;
          const rr = r * (0.75 + rand() * 0.5);
          const px = x + Math.cos(angle) * rr;
          const py = y + Math.sin(angle) * rr;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    })
  );

export const waterTexture = repeat =>
  cached('water', repeat, () =>
    drawTexture(256, 256, (ctx, w) => {
      const rand = seeded(59);
      ctx.fillStyle = '#2aa7d6';
      ctx.fillRect(0, 0, w, w);
      ctx.lineWidth = 2;
      for (let i = 0; i < 140; i++) {
        ctx.strokeStyle = `rgba(210,245,255,${0.15 + rand() * 0.3})`;
        const x = rand() * w;
        const y = rand() * w;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 10, y - 4 - rand() * 4, x + 20 + rand() * 20, y);
        ctx.stroke();
      }
    })
  );

export const planetTexture = () =>
  cached('planet', [1, 1], () =>
    drawTexture(512, 256, (ctx, w, h) => {
      const rand = seeded(67);
      const palette = ['#d9a066', '#c47a45', '#ead2a8', '#a85d3a', '#e8bb7c', '#8f4a30'];
      let y = 0;
      while (y < h) {
        const band = 4 + rand() * 18;
        ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
        ctx.fillRect(0, y, w, band + 1);
        y += band;
      }
      for (let i = 0; i < 2000; i++) {
        ctx.fillStyle = `rgba(255,255,255,${rand() * 0.08})`;
        ctx.fillRect(rand() * w, rand() * h, 30 + rand() * 60, 1.5);
      }
      ctx.fillStyle = 'rgba(140,60,40,0.8)';
      ctx.beginPath();
      ctx.ellipse(w * 0.62, h * 0.62, 26, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    })
  );

// Square radial pattern for RingGeometry, whose UVs are planar.
export const planetRingTexture = () =>
  cached('planet-ring', [1, 1], () =>
    drawTexture(512, 512, (ctx, w) => {
      const rand = seeded(71);
      for (let r = w * 0.31; r < w * 0.5; r += 2) {
        ctx.strokeStyle = `rgba(230,205,170,${0.15 + rand() * 0.55})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(w / 2, w / 2, r, 0, Math.PI * 2);
        ctx.stroke();
      }
    })
  );

export const glowGridTexture = (key, line, repeat) =>
  cached(`grid-${key}`, repeat, () =>
    drawTexture(128, 128, (ctx, w) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, w);
      ctx.strokeStyle = line;
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, w, w);
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w / 2, w);
      ctx.moveTo(0, w / 2);
      ctx.lineTo(w, w / 2);
      ctx.stroke();
    })
  );

export const signTexture = (key, text, { color = '#d8d2bd', background = 'rgba(0,0,0,0)', font = 'bold 90px Impact, sans-serif' } = {}) =>
  cached(`sign-${key}`, [1, 1], () =>
    drawTexture(512, 128, (ctx, w, h) => {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = color;
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h / 2 + 4);
    })
  );

// Neon tube lettering: the glow is a canvas shadow, so it stays readable without post-processing.
export const neonSignTexture = (key, text, color, font = 'bold 84px "Arial Black", sans-serif') =>
  cached(`neon-${key}`, [1, 1], () =>
    drawTexture(512, 128, (ctx, w, h) => {
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = color;
      for (const blur of [28, 14]) {
        ctx.shadowBlur = blur;
        ctx.fillStyle = color;
        ctx.fillText(text, w / 2, h / 2 + 4);
      }
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.75;
      ctx.fillText(text, w / 2, h / 2 + 4);
    })
  );

// Building facade: dark with scattered lit windows.
export const windowsTexture = (key, colors, repeat) =>
  cached(`windows-${key}`, repeat, () =>
    drawTexture(128, 256, (ctx, w, h) => {
      const rand = seeded(key.length * 131);
      ctx.fillStyle = '#0b0a14';
      ctx.fillRect(0, 0, w, h);
      for (let y = 6; y < h - 6; y += 12) {
        for (let x = 6; x < w - 6; x += 12) {
          if (rand() < 0.32) {
            ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
            ctx.globalAlpha = 0.5 + rand() * 0.5;
            ctx.fillRect(x, y, 6, 7);
          }
        }
      }
    })
  );

// Synthwave sun: warm gradient with horizontal gaps towards the bottom.
// Striped synthwave sun with a soft pink halo; the disc fills the middle 64% of the texture.
export const synthSunTexture = () =>
  cached('synth-sun', [1, 1], () =>
    drawTexture(512, 512, (ctx, w) => {
      const c = w / 2;
      const r = w * 0.32;
      const g = ctx.createLinearGradient(0, c - r, 0, c + r);
      g.addColorStop(0, '#ffe46b');
      g.addColorStop(0.45, '#ff9a3c');
      g.addColorStop(1, '#ff2bd6');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      for (let i = 0, y = c - r * 0.25; y < c + r; i++, y += 16 + i * 3) {
        ctx.fillRect(0, y, w, 3 + i * 2.2);
      }
      ctx.globalCompositeOperation = 'destination-over';
      const halo = ctx.createRadialGradient(c, c, r * 0.9, c, c, c);
      halo.addColorStop(0, 'rgba(255, 90, 160, 0.55)');
      halo.addColorStop(0.4, 'rgba(255, 43, 214, 0.18)');
      halo.addColorStop(1, 'rgba(255, 43, 214, 0)');
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, w);
    })
  );

// Beach-ball segments for pool-float targets; the poles (top and bottom rows) are white caps.
export const beachBallTexture = () =>
  cached('beach-ball', [1, 1], () =>
    drawTexture(256, 128, (ctx, w, h) => {
      const colors = ['#ff3b3b', '#ffffff', '#1d6fff', '#ffffff', '#ffc21a', '#ffffff'];
      colors.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect((i * w) / colors.length, 0, w / colors.length + 1, h);
      });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h * 0.1);
      ctx.fillRect(0, h * 0.9, w, h * 0.1);
    })
  );

export const swirlTexture = (key, a, b) =>
  cached(`swirl-${key}`, [1, 1], () =>
    drawTexture(128, 128, (ctx, w) => {
      ctx.fillStyle = a;
      ctx.beginPath();
      ctx.arc(w / 2, w / 2, w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = b;
      ctx.lineWidth = 9;
      ctx.beginPath();
      for (let t = 0; t < 30; t += 0.1) {
        const r = t * 2.1;
        ctx.lineTo(w / 2 + Math.cos(t) * r, w / 2 + Math.sin(t) * r);
      }
      ctx.stroke();
    })
  );

// --- Backdrop boards: detailed but low-contrast, so targets stay the loudest thing on them. ---

// Painted wooden planks: seams, grain, a few knots and worn edges.
export const woodBoardTexture = repeat =>
  cached('wood-board', repeat, () =>
    drawTexture(512, 256, (ctx, w, h) => {
      const rand = seeded(101);
      ctx.fillStyle = '#f1e6cc';
      ctx.fillRect(0, 0, w, h);
      const plank = 64;
      for (let x = 0; x < w; x += plank) {
        ctx.fillStyle = `rgba(120, 90, 50, ${0.03 + rand() * 0.05})`;
        ctx.fillRect(x, 0, plank, h);
        for (let i = 0; i < 26; i++) {
          ctx.strokeStyle = `rgba(110, 80, 45, ${0.05 + rand() * 0.08})`;
          ctx.lineWidth = 1;
          const gx = x + 4 + rand() * (plank - 8);
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.bezierCurveTo(gx + (rand() - 0.5) * 8, h * 0.3, gx + (rand() - 0.5) * 8, h * 0.7, gx + (rand() - 0.5) * 6, h);
          ctx.stroke();
        }
        if (rand() < 0.6) {
          ctx.fillStyle = 'rgba(120, 85, 45, 0.25)';
          ctx.beginPath();
          ctx.ellipse(x + 10 + rand() * (plank - 20), rand() * h, 3 + rand() * 3, 6 + rand() * 6, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(80, 55, 30, 0.35)';
        ctx.fillRect(x, 0, 2, h);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.fillRect(x + 2, 0, 1, h);
      }
      for (let i = 0; i < 400; i++) {
        ctx.fillStyle = `rgba(90, 65, 35, ${rand() * 0.08})`;
        ctx.fillRect(rand() * w, rand() * h, 2, 2);
      }
    })
  );

// Watercolour paper: a lavender-to-peach wash with soft cloud blooms and paper grain.
export const cloudPaperTexture = repeat =>
  cached('cloud-paper', repeat, () =>
    drawTexture(512, 256, (ctx, w, h) => {
      const rand = seeded(103);
      const wash = ctx.createLinearGradient(0, 0, 0, h);
      wash.addColorStop(0, '#e3d4f6');
      wash.addColorStop(1, '#fbe2d6');
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) {
        const x = rand() * w;
        const y = rand() * h;
        const r = 20 + rand() * 60;
        const bloom = ctx.createRadialGradient(x, y, 0, x, y, r);
        bloom.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        bloom.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = bloom;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < 2500; i++) {
        ctx.fillStyle = rand() < 0.5 ? 'rgba(120, 90, 140, 0.05)' : 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(rand() * w, rand() * h, 1.5, 1.5);
      }
    })
  );

// Pastel gingham with tiny white polka dots.
export const ginghamTexture = repeat =>
  cached('gingham', repeat, () =>
    drawTexture(128, 128, (ctx, w) => {
      ctx.fillStyle = '#fff4fa';
      ctx.fillRect(0, 0, w, w);
      ctx.fillStyle = 'rgba(255, 150, 200, 0.16)';
      ctx.fillRect(0, 0, w / 2, w);
      ctx.fillRect(0, 0, w, w / 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      for (const [x, y] of [[w / 4, w / 4], [(w * 3) / 4, (w * 3) / 4], [(w * 3) / 4, w / 4], [w / 4, (w * 3) / 4]]) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    })
  );

// Mint meadow scattered with candy sprinkles.
export const sprinkleGroundTexture = repeat =>
  cached('sprinkles', repeat, () =>
    drawTexture(256, 256, (ctx, w) => {
      const rand = seeded(107);
      ctx.fillStyle = '#c9f3dc';
      ctx.fillRect(0, 0, w, w);
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = `rgba(120, 200, 160, ${rand() * 0.2})`;
        ctx.fillRect(rand() * w, rand() * w, 2, 2);
      }
      const colors = ['#ff8fc7', '#ffe27a', '#9fd6ff', '#c4a7ff', '#ffffff'];
      for (let i = 0; i < 90; i++) {
        ctx.save();
        ctx.translate(rand() * w, rand() * w);
        ctx.rotate(rand() * Math.PI);
        ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
        ctx.beginPath();
        ctx.roundRect(-4, -1.5, 8, 3, 1.5);
        ctx.fill();
        ctx.restore();
      }
    })
  );

// Hexagonal panel grid over a dark navy plate.
export const hexPanelTexture = repeat =>
  cached('hex-panel', repeat, () =>
    drawTexture(256, 222, (ctx, w, h) => {
      ctx.fillStyle = '#0b1534';
      ctx.fillRect(0, 0, w, h);
      const r = 32;
      const dx = r * 1.5;
      const dy = (Math.sqrt(3) / 2) * r;
      ctx.strokeStyle = 'rgba(86, 200, 255, 0.14)';
      ctx.lineWidth = 2;
      for (let col = -1; col * dx < w + r; col++) {
        for (let row = -1; row * dy * 2 < h + r; row++) {
          const cx = col * dx;
          const cy = row * dy * 2 + (col % 2 ? dy : 0);
          ctx.beginPath();
          for (let i = 0; i <= 6; i++) {
            const a = (Math.PI / 3) * i;
            ctx.lineTo(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3));
          }
          ctx.stroke();
        }
      }
    })
  );

// Dark glass with faint horizontal scanlines and a soft vignette.
export const scanlineTexture = repeat =>
  cached('scanlines', repeat, () =>
    drawTexture(256, 256, (ctx, w) => {
      ctx.fillStyle = '#0c0719';
      ctx.fillRect(0, 0, w, w);
      for (let y = 0; y < w; y += 4) {
        ctx.fillStyle = 'rgba(255, 43, 214, 0.05)';
        ctx.fillRect(0, y, w, 1);
      }
      const glow = ctx.createRadialGradient(w / 2, w / 2, w * 0.1, w / 2, w / 2, w * 0.75);
      glow.addColorStop(0, 'rgba(120, 40, 200, 0.12)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, w);
    })
  );

// Layered rock strata for the underside of floating islands.
export const strataTexture = repeat =>
  cached('strata', repeat, () =>
    drawTexture(128, 256, (ctx, w, h) => {
      const rand = seeded(109);
      const tones = ['#b8968a', '#a6847c', '#c9a99a', '#9b7a74', '#d4b5a4'];
      let y = 0;
      while (y < h) {
        const band = 6 + rand() * 18;
        ctx.fillStyle = tones[Math.floor(rand() * tones.length)];
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= w; x += 16) ctx.lineTo(x, y + (rand() - 0.5) * 4);
        ctx.lineTo(w, y + band);
        ctx.lineTo(0, y + band);
        ctx.fill();
        y += band;
      }
      for (let i = 0; i < 500; i++) {
        ctx.fillStyle = `rgba(60, 40, 40, ${rand() * 0.15})`;
        ctx.fillRect(rand() * w, rand() * h, 2, 2);
      }
    })
  );
