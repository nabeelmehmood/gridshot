import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, DoubleSide } from 'three';
import { dotTexture, glowGridTexture, planetRingTexture, planetTexture, seeded, steelTexture } from '../textures';
import { noRaycast } from './common';

const STAR_COUNT = 2600;

function createStarGeometry() {
  const rand = seeded(3);
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors = new Float32Array(STAR_COUNT * 3);
  const tints = ['#ffffff', '#cfe0ff', '#ffe6c7', '#ffd0e8'].map(c => new Color(c));
  for (let i = 0; i < STAR_COUNT; i++) {
    // Uniform direction on a sphere, pushed far out.
    const u = rand() * 2 - 1;
    const angle = rand() * Math.PI * 2;
    const r = 150 + rand() * 40;
    const s = Math.sqrt(1 - u * u);
    positions.set([Math.cos(angle) * s * r, u * r, Math.sin(angle) * s * r], i * 3);
    const tint = tints[Math.floor(rand() * tints.length)];
    const brightness = 0.45 + rand() * 0.55;
    colors.set([tint.r * brightness, tint.g * brightness, tint.b * brightness], i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

function Stars() {
  const geometry = useMemo(() => createStarGeometry(), []);
  const points = useRef(null);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame((_, delta) => {
    points.current.rotation.y += delta * 0.004;
  });
  return (
    <points ref={points} geometry={geometry} raycast={noRaycast}>
      <pointsMaterial
        size={2.2}
        sizeAttenuation={false}
        map={dotTexture()}
        vertexColors
        transparent
        depthWrite={false}
        fog={false}
        toneMapped={false}
      />
    </points>
  );
}

const NEBULAE = [
  [-120, 40, -150, 190, '#6b2fd6'],
  [90, -20, -160, 170, '#2f6bd6'],
  [20, 70, -170, 150, '#d62f8f'],
  [150, 50, -60, 160, '#2fa3d6']
];

function Planet() {
  const planet = useRef(null);
  useFrame((_, delta) => {
    planet.current.rotation.y += delta * 0.02;
  });
  return (
    // Up and to the left, clear of the target area: amber targets on an orange planet would blend in.
    <group position={[-105, 42, -165]}>
      <mesh ref={planet} raycast={noRaycast}>
        <sphereGeometry args={[34, 64, 32]} />
        <meshStandardMaterial map={planetTexture()} roughness={1} fog={false} />
      </mesh>
      <mesh rotation={[-1.25, 0.25, 0]} raycast={noRaycast}>
        <ringGeometry args={[40, 64, 128]} />
        <meshBasicMaterial map={planetRingTexture()} transparent side={DoubleSide} depthWrite={false} fog={false} />
      </mesh>
      <sprite scale={88} raycast={noRaycast}>
        <spriteMaterial map={dotTexture()} color="#ffcf9a" blending={AdditiveBlending} opacity={0.3} depthWrite={false} fog={false} />
      </sprite>
    </group>
  );
}

const ASTEROIDS = (() => {
  const rand = seeded(19);
  return Array.from({ length: 34 }, () => ({
    position: [-55 + rand() * 110, -14 + rand() * 40, -22 - rand() * 70],
    radius: 0.4 + rand() * 1.4,
    spin: [rand() * 0.4, rand() * 0.4, rand() * 0.4]
  }));
})();

function Asteroids() {
  const group = useRef(null);
  useFrame((_, delta) => {
    group.current.children.forEach((rock, i) => {
      const [sx, sy, sz] = ASTEROIDS[i].spin;
      rock.rotation.x += sx * delta;
      rock.rotation.y += sy * delta;
      rock.rotation.z += sz * delta;
    });
  });
  return (
    <group ref={group}>
      {ASTEROIDS.map(({ position, radius }) => (
        <mesh key={position.join()} position={position}>
          <dodecahedronGeometry args={[radius, 0]} />
          <meshStandardMaterial color="#6b625a" roughness={1} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Deck() {
  return (
    <group>
      <mesh position={[0, -1.25, -1]} receiveShadow>
        <boxGeometry args={[22, 0.5, 20]} />
        <meshStandardMaterial map={steelTexture([5.5, 5])} color="#4a5470" metalness={0.7} roughness={0.45} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, -1]} raycast={noRaycast}>
        <planeGeometry args={[22, 20]} />
        <meshBasicMaterial
          map={glowGridTexture('space', '#3fa9ff', [11, 10])}
          transparent
          opacity={0.3}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {[-11, 11].map(x => (
        <mesh key={x} position={[x, -0.98, -1]} raycast={noRaycast}>
          <boxGeometry args={[0.12, 0.08, 20]} />
          <meshBasicMaterial color="#56c8ff" toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, -0.98, -11]} raycast={noRaycast}>
        <boxGeometry args={[22, 0.08, 0.12]} />
        <meshBasicMaterial color="#56c8ff" toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function Space() {
  return (
    <>
      <color attach="background" args={['#02030a']} />
      <ambientLight intensity={0.35} color="#8fa8ff" />
      <directionalLight position={[-60, 20, -80]} intensity={1.6} color="#ffd8a8" />
      <directionalLight position={[10, 15, 20]} intensity={1.1} color="#cfe0ff" />

      <Stars />
      {NEBULAE.map(([x, y, z, scale, color]) => (
        <sprite key={color} position={[x, y, z]} scale={scale} raycast={noRaycast}>
          <spriteMaterial map={dotTexture()} color={color} blending={AdditiveBlending} opacity={0.22} depthWrite={false} fog={false} />
        </sprite>
      ))}
      <Planet />
      <mesh position={[62, 34, -120]} raycast={noRaycast}>
        <sphereGeometry args={[6, 32, 16]} />
        <meshStandardMaterial color="#c9c9d1" roughness={1} />
      </mesh>
      <Asteroids />
      <Deck />
    </>
  );
}
