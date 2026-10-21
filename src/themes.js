// Visual themes. The 3D scenery for each lives in src/modules/Scene/environments.
//
// Readability rules: targets always sit on `backdrop`, a calm board behind the grid (`texture` names a
// board in Scene/Backdrop.jsx, `color` tints it), so they never
// straddle busy scenery; `outline` is a thin rim that contrasts with that board. targetColor must
// stay the most visible colour in the scene, and missColor must show on the backdrop.
// `ui` tints the menu and HUD (see applyThemeUi); `swatch` is the picker badge: top, wave, bottom.
export const THEMES = {
  playground: {
    id: 'playground',
    swatch: ['#6fbaf2', '#ffe9a8', '#5b9e3c'],
    name: 'Playground',
    description: 'A sunny park. Swings, a slide and slow-drifting clouds.',
    targetColor: '#ff3d4f',
    outline: '#4a1a12',
    missColor: '#3a2f1e',
    backdrop: { texture: 'wood', frame: '#8a5a3b' },
    ambient: 'pollen',
    ui: { accent: '#ffc233', accentText: '#2a1d00', panel: 'rgba(18, 30, 22, 0.88)' }
  },
  daydream: {
    id: 'daydream',
    swatch: ['#a78bfa', '#ffd9c2', '#7fd7e0'],
    name: 'Daydream',
    description: 'A floating island above a sea of clouds, with feathers on the breeze.',
    targetStyle: 'pearl',
    targetColor: '#7fd0e6',
    haloColor: '#ffc4e6',
    outline: '#5b3f86',
    missColor: '#6b4a7a',
    backdrop: { texture: 'cloudPaper', frame: '#ffffff', opacity: 0.96 },
    halo: true,
    ambient: 'feathers',
    ui: { accent: '#f6a6c9', accentText: '#3a1328', panel: 'rgba(46, 30, 62, 0.86)' }
  },
  kawaii: {
    id: 'kawaii',
    swatch: ['#ff9ac9', '#fff3a0', '#9ff0b0'],
    name: 'Kawaii',
    description: 'Pastel skies, a rainbow, smiling clouds and lollipop trees.',
    targetColor: '#7c3aed',
    outline: '#2b0f57',
    missColor: '#c2417a',
    backdrop: { texture: 'gingham', frame: '#ff9ccb' },
    ambient: 'hearts',
    ui: { accent: '#ff8fc7', accentText: '#4a1033', panel: 'rgba(62, 24, 54, 0.86)' }
  },
  pool: {
    id: 'pool',
    swatch: ['#e9f4f8', '#ff3b3b', '#2aa7d6'],
    name: 'Pool',
    description: 'An indoor pool hall. Tiles, lane ropes and light rippling on the walls.',
    // 'floatie' = striped pool-toy targets; 'water' = translucent jiggly blobs.
    targetStyle: 'floatie',
    targetColor: '#ff3b3b',
    outline: '#0a2a5c',
    missColor: '#0b3a52',
    // Tinted, not white, so the floaties' white stripes still stand out.
    backdrop: { texture: 'tiles', frame: '#1d4ed8' },
    ambient: 'bubbles',
    ui: { accent: '#38bdf8', accentText: '#04202f', panel: 'rgba(7, 34, 50, 0.88)' }
  },
  space: {
    id: 'space',
    swatch: ['#2a1f66', '#ffb020', '#05060f'],
    name: 'Deep space',
    description: 'A metal deck adrift among the stars, a ringed planet on the horizon.',
    targetColor: '#ffb020',
    outline: '#fff3d1',
    missColor: '#9fd8ff',
    backdrop: { texture: 'hex', frame: '#56c8ff', opacity: 0.94, glowFrame: true },
    ambient: 'motes',
    halo: true,
    ui: { accent: '#ffb020', accentText: '#2a1a00', panel: 'rgba(9, 13, 32, 0.88)' }
  },
  neon: {
    id: 'neon',
    swatch: ['#2a0b4d', '#ff2bd6', '#22e6ff'],
    name: 'Neon',
    description: 'A cyberpunk rooftop at night: glowing grid, neon signs and a city that never sleeps.',
    // Dark glass orb with a glowing tube ring and rim, like real neon signage.
    targetStyle: 'neon',
    targetColor: '#22e6ff',
    outline: '#22e6ff',
    missColor: '#ff7ce5',
    backdrop: { texture: 'scanlines', frame: '#ff2bd6', opacity: 0.97, glowFrame: true },
    ambient: 'neon',
    halo: true,
    ui: { accent: '#ff2bd6', accentText: '#21001a', panel: 'rgba(14, 6, 26, 0.9)' }
  },
  prison: {
    id: 'prison',
    swatch: ['#7a8088', '#ffc21a', '#2a2e33'],
    name: 'Cell block',
    description: 'Riveted steel, barred cells and a lamp that never quite stays on.',
    targetColor: '#ffc21a',
    outline: '#1e1600',
    missColor: '#e8e2d0',
    backdrop: { texture: 'steel', color: '#7d838c', frame: '#e0aa18' },
    ambient: 'dust',
    ui: { accent: '#e0aa18', accentText: '#1b1400', panel: 'rgba(20, 22, 25, 0.92)' }
  },
  classic: {
    id: 'classic',
    swatch: ['#8a93a6', '#ff4655', '#0d1017'],
    name: 'Classic',
    description: 'The original plain room. Lightest on older machines.',
    targetColor: '#ff4655',
    outline: '#2a0a0e',
    missColor: '#2b2f3a',
    backdrop: null,
    ambient: null,
    ui: null
  }
};

export const THEME_IDS = Object.keys(THEMES);
export const DEFAULT_THEME = 'playground';

const UI_VARIABLES = {
  accent: '--accent',
  accentText: '--accent-text',
  panel: '--panel',
  fontDisplay: '--font-display'
};

// Overrides the CSS variables in index.css; a theme without `ui` falls back to those defaults.
export function applyThemeUi(theme, root = document.documentElement) {
  for (const [key, variable] of Object.entries(UI_VARIABLES)) {
    const value = theme.ui?.[key];
    if (value) root.style.setProperty(variable, value);
    else root.style.removeProperty(variable);
  }
  root.dataset.theme = theme.id;
}
