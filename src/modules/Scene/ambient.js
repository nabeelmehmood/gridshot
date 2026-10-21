import { Color } from 'three';
import { ParticleBuffer } from './particles';
import { dotTexture, featherTexture, heartTexture } from './textures';

// motion: 'drift' wanders sideways, 'rise' floats up, 'fall' sinks down. Positions wrap inside bounds.
const PRESETS = {
  pollen: {
    count: 160, map: dotTexture, size: 0.12, colors: ['#fff6c8', '#ffffff'], alpha: 0.75,
    bounds: [[-25, 25], [-1, 12], [-30, -1]], motion: 'drift', velocity: [0.35, 0.05, 0.1], wobble: 0.4
  },
  feathers: {
    count: 45, map: featherTexture, size: 0.5, colors: ['#ffffff', '#fbe7ff'], alpha: 0.85,
    bounds: [[-22, 22], [-2, 12], [-28, -2]], motion: 'fall', velocity: [0.3, -0.35, 0], wobble: 0.8
  },
  hearts: {
    count: 70, map: heartTexture, size: 0.38, colors: ['#ff7eb6', '#ffb3d9', '#c084fc', '#fde68a'], alpha: 0.9,
    bounds: [[-20, 20], [-1, 11], [-26, -2]], motion: 'rise', velocity: [0, 0.45, 0], wobble: 0.5
  },
  bubbles: {
    count: 120, map: dotTexture, size: 0.14, colors: ['#e0fbff', '#ffffff'], alpha: 0.55,
    bounds: [[-11, 11], [-1.5, 9], [-9.5, 0]], motion: 'rise', velocity: [0, 0.7, 0], wobble: 0.25
  },
  motes: {
    count: 260, map: dotTexture, size: 0.09, colors: ['#bcd7ff', '#ffe2b8', '#ffffff'], alpha: 0.9,
    bounds: [[-26, 26], [-6, 16], [-30, 0]], motion: 'drift', velocity: [0.05, 0.02, 0.3], wobble: 0.1,
    additive: true, twinkle: true
  },
  neon: {
    count: 160, map: dotTexture, size: 0.09, colors: ['#ff2bd6', '#22e6ff', '#b46bff'], alpha: 0.8,
    bounds: [[-10, 10], [-1, 9], [-9, 1]], motion: 'rise', velocity: [0, 0.6, 0], wobble: 0.05,
    additive: true, twinkle: true
  },
  dust: {
    count: 220, map: dotTexture, size: 0.06, colors: ['#d9cfb8'], alpha: 0.45,
    bounds: [[-10, 10], [-1, 9], [-9, 1]], motion: 'drift', velocity: [0.08, -0.02, 0.05], wobble: 0.15
  }
};

const _color = new Color();

export class AmbientField {
  constructor(name) {
    const preset = PRESETS[name];
    this.preset = preset;
    this.time = 0;
    this.buffer = new ParticleBuffer(preset.count, { map: preset.map(), size: preset.size, additive: preset.additive });
    this.phase = new Float32Array(preset.count);
    this.speed = new Float32Array(preset.count);

    const [[x0, x1], [y0, y1], [z0, z1]] = preset.bounds;
    for (let i = 0; i < preset.count; i++) {
      this.buffer.positions.set(
        [x0 + Math.random() * (x1 - x0), y0 + Math.random() * (y1 - y0), z0 + Math.random() * (z1 - z0)],
        i * 3
      );
      _color.set(preset.colors[i % preset.colors.length]);
      this.buffer.colors.set([_color.r, _color.g, _color.b], i * 3);
      this.buffer.scales[i] = 0.6 + Math.random() * 0.8;
      this.phase[i] = Math.random() * Math.PI * 2;
      this.speed[i] = 0.6 + Math.random() * 0.8;
    }
  }

  get object() {
    return this.buffer.points;
  }

  update(delta, viewportHeight) {
    const { preset } = this;
    const [[x0, x1], [y0, y1], [z0, z1]] = preset.bounds;
    const [vx, vy, vz] = preset.velocity;
    this.time += delta;
    this.buffer.setViewport(viewportHeight);

    for (let i = 0; i < preset.count; i++) {
      const p = i * 3;
      const s = this.speed[i];
      const wobble = Math.sin(this.time * 0.8 * s + this.phase[i]) * preset.wobble;
      let x = this.buffer.positions[p] + (vx * s + wobble) * delta;
      let y = this.buffer.positions[p + 1] + vy * s * delta;
      let z = this.buffer.positions[p + 2] + vz * s * delta;
      if (x > x1) x = x0;
      if (x < x0) x = x1;
      if (y > y1) y = y0;
      if (y < y0) y = y1;
      if (z > z1) z = z0;
      if (z < z0) z = z1;
      this.buffer.positions[p] = x;
      this.buffer.positions[p + 1] = y;
      this.buffer.positions[p + 2] = z;

      // Fade at the vertical edges so wrapping particles don't pop in and out.
      const h = (y - y0) / (y1 - y0);
      let alpha = preset.alpha * Math.min(1, h * 6, (1 - h) * 6);
      if (preset.twinkle) alpha *= 0.55 + 0.45 * Math.sin(this.time * 2.5 * s + this.phase[i]);
      this.buffer.alphas[i] = alpha;
    }
    this.buffer.commit();
  }

  dispose() {
    this.buffer.dispose();
  }
}
