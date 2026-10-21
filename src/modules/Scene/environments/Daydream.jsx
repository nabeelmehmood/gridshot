import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, DoubleSide } from 'three';
import { dotTexture, gradientTexture, grassTexture, seeded, strataTexture } from '../textures';
import { Cloud, noRaycast, SkyDome } from './common';

const SKY = [[0, '#9f86f0'], [0.3, '#e9b8e6'], [0.48, '#ffd9c2'], [0.52, '#ffe9dc'], [1, '#fff6f0']];

function Island({ radius, depth, grass = '#d9f5c4', rock = '#ffffff', children, ...props }) {
  return (
    <group {...props}>
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[radius, radius * 0.96, 0.5, 40]} />
        <meshStandardMaterial
          map={grassTexture([radius / 2, radius / 2])}
          color={grass}
          emissive="#d8f5c0"
          emissiveIntensity={0.45}
          roughness={1}
        />
      </mesh>
      <mesh position={[0, -0.5 - depth / 2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[radius * 0.96, depth, 12]} />
        <meshStandardMaterial map={strataTexture([3, 1])} color={rock} roughness={1} flatShading />
      </mesh>
      {children}
    </group>
  );
}

function LittleTree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 1.2, 6]} />
        <meshStandardMaterial color="#8a5d47" />
      </mesh>
      <mesh position={[0, 1.8, 0]}>
        <coneGeometry args={[0.8, 1.9, 8]} />
        <meshStandardMaterial color="#6fbf73" flatShading />
      </mesh>
    </group>
  );
}

const FLOATING = [
  [-42, 4, -70, 5, 1.1],
  [38, 11, -88, 6, 2.3],
  [-16, 19, -115, 4, 0.4],
  [58, -2, -60, 3.5, 3.1]
];

function FloatingIslands() {
  const group = useRef(null);
  useFrame(({ clock }) => {
    group.current.children.forEach((island, i) => {
      island.position.y = FLOATING[i][1] + Math.sin(clock.elapsedTime * 0.4 + FLOATING[i][4]) * 0.8;
    });
  });
  return (
    <group ref={group}>
      {FLOATING.map(([x, y, z, r]) => (
        <Island key={x} position={[x, y, z]} radius={r} depth={r * 1.6}>
          <LittleTree position={[r * 0.3, 0, -r * 0.2]} scale={r / 4} />
        </Island>
      ))}
    </group>
  );
}

// A soft field of flattened clouds well below the island edge.
const SEA = (() => {
  const rand = seeded(5);
  return Array.from({ length: 34 }, () => [
    -90 + rand() * 180,
    -10 - rand() * 3,
    -14 - rand() * 120,
    1.6 + rand() * 2.2
  ]);
})();

function CloudSea() {
  return (
    <group>
      {SEA.map(([x, y, z, s]) => (
        <Cloud key={`${x}-${z}`} position={[x, y, z]} scale={[s * 1.6, s * 0.5, s]} emissive="#ffe4f0" emissiveIntensity={0.45} />
      ))}
    </group>
  );
}

const FLOWERS = (() => {
  const rand = seeded(13);
  const colors = ['#ff9ad5', '#ffe066', '#ffffff', '#b39bff'];
  return Array.from({ length: 40 }, (_, i) => {
    const angle = rand() * Math.PI * 2;
    const r = 6 + rand() * 5;
    return [Math.cos(angle) * r, Math.sin(angle) * r - 2, colors[i % colors.length]];
  });
})();

function LightRays() {
  return (
    <group position={[-10, 30, -60]} rotation={[0, 0, 0.35]}>
      {[-12, 0, 10].map((x, i) => (
        <mesh key={x} position={[x, 0, i * -6]} raycast={noRaycast}>
          <planeGeometry args={[5 + i * 2, 90]} />
          <meshBasicMaterial
            color="#fff1d6"
            transparent
            opacity={0.07}
            blending={AdditiveBlending}
            depthWrite={false}
            side={DoubleSide}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function Daydream() {
  return (
    <>
      <color attach="background" args={['#ffe9dc']} />
      <fog attach="fog" args={['#f7dbe6', 45, 150]} />
      <SkyDome texture={gradientTexture('daydream', SKY)} />
      <sprite position={[70, 26, -150]} scale={110} raycast={noRaycast}>
        <spriteMaterial map={dotTexture()} color="#fff2d6" blending={AdditiveBlending} opacity={0.7} fog={false} depthWrite={false} />
      </sprite>
      <LightRays />

      <hemisphereLight args={['#fff0f8', '#c7a6d8', 1.4]} />
      <directionalLight position={[10, 20, 12]} intensity={1.5} color="#fff1e0" />

      <Island position={[0, -1, -2]} radius={13} depth={10}>
        {FLOWERS.map(([x, z, color]) => (
          <mesh key={`${x}-${z}`} position={[x, 0.12, z]}>
            <sphereGeometry args={[0.14, 8, 6]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
          </mesh>
        ))}
        <LittleTree position={[-10, 0, -7]} scale={1.6} />
        <LittleTree position={[10.5, 0, -6]} scale={1.3} />
      </Island>
      <FloatingIslands />
      <CloudSea />
    </>
  );
}
