import { AdditiveBlending, BufferAttribute, BufferGeometry, NormalBlending, Points, ShaderMaterial } from 'three';

// Point sprites with per-particle colour and alpha (PointsMaterial only has one opacity), so sparks
// and ambient particles can fade individually on light and dark backgrounds alike.
const vertexShader = /* glsl */ `
  attribute vec3 color;
  attribute float alpha;
  attribute float scale;
  uniform float size;
  uniform float viewportScale;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = alpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * scale * viewportScale / -mvPosition.z;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float a = texture2D(map, gl_PointCoord).a * vAlpha;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, a);
    #include <colorspace_fragment>
  }
`;

export class ParticleBuffer {
  constructor(count, { map, size, additive = false }) {
    this.count = count;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.alphas = new Float32Array(count);
    this.scales = new Float32Array(count).fill(1);

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('alpha', new BufferAttribute(this.alphas, 1));
    this.geometry.setAttribute('scale', new BufferAttribute(this.scales, 1));

    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { map: { value: map }, size: { value: size }, viewportScale: { value: 500 } },
      transparent: true,
      depthWrite: false,
      blending: additive ? AdditiveBlending : NormalBlending
    });

    this.points = new Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    // Never a shot surface.
    this.points.raycast = () => {};
  }

  // Matches PointsMaterial's size attenuation: size is in world units at distance 1.
  setViewport(height) {
    this.material.uniforms.viewportScale.value = height / 2;
  }

  commit() {
    for (const name of ['position', 'color', 'alpha', 'scale']) {
      this.geometry.attributes[name].needsUpdate = true;
    }
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
