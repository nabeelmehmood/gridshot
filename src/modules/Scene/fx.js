import { CircleGeometry, Color, DoubleSide, Group, Mesh, MeshBasicMaterial, RingGeometry, Vector3 } from 'three';
import { ParticleBuffer } from './particles';
import { dotTexture } from './textures';

const SPARKS_PER_HIT = 18;
const SPARK_COUNT = SPARKS_PER_HIT * 16;
const SPARK_LIFE = 0.45;
const RING_COUNT = 6;
const RING_LIFE = 0.28;
const MARK_COUNT = 14;
const MARK_LIFE = 1.4;
const PUFF_PER_MISS = 6;

const _dir = new Vector3();
const _color = new Color();

// Fixed pools for hit sparks, hit rings and miss marks: nothing is allocated per shot.
// All mutation lives in this class so React components only call its methods.
export class EffectsPool {
  constructor() {
    this.group = new Group();

    this.sparks = new ParticleBuffer(SPARK_COUNT, { map: dotTexture(), size: 0.2 });
    this.sparkVelocity = new Float32Array(SPARK_COUNT * 3);
    this.sparkAge = new Float32Array(SPARK_COUNT).fill(Infinity);
    this.sparkLife = new Float32Array(SPARK_COUNT).fill(SPARK_LIFE);
    this.nextSpark = 0;
    this.group.add(this.sparks.points);

    this.ringGeometry = new RingGeometry(0.82, 1, 48);
    this.rings = Array.from({ length: RING_COUNT }, () => {
      const ring = new Mesh(
        this.ringGeometry,
        new MeshBasicMaterial({ transparent: true, depthWrite: false, side: DoubleSide, toneMapped: false })
      );
      ring.visible = false;
      ring.userData.age = Infinity;
      ring.raycast = () => {};
      this.group.add(ring);
      return ring;
    });
    this.nextRing = 0;

    this.markGeometry = new CircleGeometry(0.24, 20);
    this.marks = Array.from({ length: MARK_COUNT }, () => {
      const mark = new Mesh(
        this.markGeometry,
        new MeshBasicMaterial({
          map: dotTexture(),
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          toneMapped: false
        })
      );
      mark.visible = false;
      mark.userData.age = Infinity;
      mark.raycast = () => {};
      this.group.add(mark);
      return mark;
    });
    this.nextMark = 0;
  }

  emitSparks(position, color, count, speed, life) {
    _color.set(color);
    for (let n = 0; n < count; n++) {
      const i = this.nextSpark;
      this.nextSpark = (this.nextSpark + 1) % SPARK_COUNT;
      _dir.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
      const s = speed * (0.5 + Math.random() * 0.8);
      this.sparkVelocity.set([_dir.x * s, _dir.y * s, _dir.z * s], i * 3);
      this.sparks.positions.set([position.x, position.y, position.z], i * 3);
      // Mix towards white so sparks read as bright on any background.
      const mix = 0.25 + Math.random() * 0.35;
      this.sparks.colors.set(
        [_color.r + (1 - _color.r) * mix, _color.g + (1 - _color.g) * mix, _color.b + (1 - _color.b) * mix],
        i * 3
      );
      this.sparks.scales[i] = 0.6 + Math.random() * 0.8;
      this.sparkAge[i] = 0;
      this.sparkLife[i] = life * (0.7 + Math.random() * 0.6);
    }
  }

  hit(position, color, radius, cameraPosition) {
    this.emitSparks(position, color, SPARKS_PER_HIT, 7, SPARK_LIFE);
    const ring = this.rings[this.nextRing];
    this.nextRing = (this.nextRing + 1) % RING_COUNT;
    ring.position.copy(position);
    ring.lookAt(cameraPosition);
    ring.material.color.set(color);
    ring.userData.radius = radius;
    ring.userData.age = 0;
    ring.visible = true;
  }

  // A mark where the shot landed on scenery; with no surface in range, a small puff on the target plane.
  miss(point, normal, color) {
    if (!normal) {
      this.emitSparks(point, color, PUFF_PER_MISS, 1.5, 0.5);
      return;
    }
    const mark = this.marks[this.nextMark];
    this.nextMark = (this.nextMark + 1) % MARK_COUNT;
    mark.position.copy(point).addScaledVector(normal, 0.02);
    mark.lookAt(_dir.copy(mark.position).add(normal));
    mark.material.color.set(color);
    mark.userData.age = 0;
    mark.visible = true;
  }

  update(delta, viewportHeight) {
    this.sparks.setViewport(viewportHeight);
    const drag = Math.exp(-4 * delta);
    for (let i = 0; i < SPARK_COUNT; i++) {
      if (this.sparkAge[i] === Infinity) continue;
      this.sparkAge[i] += delta;
      const t = this.sparkAge[i] / this.sparkLife[i];
      if (t >= 1) {
        this.sparkAge[i] = Infinity;
        this.sparks.alphas[i] = 0;
        continue;
      }
      for (let k = 0; k < 3; k++) {
        this.sparks.positions[i * 3 + k] += this.sparkVelocity[i * 3 + k] * delta;
        this.sparkVelocity[i * 3 + k] *= drag;
      }
      this.sparkVelocity[i * 3 + 1] -= 6 * delta;
      this.sparks.alphas[i] = 1 - t * t;
    }
    this.sparks.commit();

    for (const ring of this.rings) {
      if (!ring.visible) continue;
      ring.userData.age += delta;
      const t = ring.userData.age / RING_LIFE;
      if (t >= 1) {
        ring.visible = false;
        continue;
      }
      ring.scale.setScalar(ring.userData.radius * (1 + t * 1.2));
      ring.material.opacity = 0.85 * (1 - t);
    }

    for (const mark of this.marks) {
      if (!mark.visible) continue;
      mark.userData.age += delta;
      const t = mark.userData.age / MARK_LIFE;
      if (t >= 1) {
        mark.visible = false;
        continue;
      }
      mark.material.opacity = 0.9 * (1 - t * t);
    }
  }

  dispose() {
    this.sparks.dispose();
    this.ringGeometry.dispose();
    this.markGeometry.dispose();
    for (const mesh of [...this.rings, ...this.marks]) mesh.material.dispose();
  }
}
