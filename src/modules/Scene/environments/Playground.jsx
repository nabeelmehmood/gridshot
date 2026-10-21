import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending } from 'three';
import { dotTexture, gradientTexture, grassTexture, sandTexture } from '../textures';
import { Cloud, noRaycast, SkyDome, Tree } from './common';

const SKY = [[0, '#2f7fd6'], [0.42, '#86c2f2'], [0.5, '#d8ecff'], [1, '#d8ecff']];
const PAINT = { red: '#e63946', yellow: '#ffb703', teal: '#2a9d8f', navy: '#264653', orange: '#f4a261' };

function Post({ from, to, radius = 0.12, color }) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const length = Math.hypot(dx, dy, dz);
  return (
    <mesh
      position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]}
      rotation={[Math.atan2(dz, dy), 0, -Math.atan2(dx, Math.hypot(dy, dz))]}
      castShadow
    >
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.3} />
    </mesh>
  );
}

function Swing({ x, phase }) {
  const pivot = useRef(null);
  useFrame(({ clock }) => {
    pivot.current.rotation.x = Math.sin(clock.elapsedTime * 1.5 + phase) * 0.35;
  });
  return (
    <group ref={pivot} position={[x, 5, 0]}>
      <Post from={[-0.45, 0, 0]} to={[-0.45, -3.7, 0]} radius={0.03} color="#9aa3ad" />
      <Post from={[0.45, 0, 0]} to={[0.45, -3.7, 0]} radius={0.03} color="#9aa3ad" />
      <mesh position={[0, -3.75, 0]} castShadow>
        <boxGeometry args={[1.1, 0.1, 0.45]} />
        <meshStandardMaterial color={PAINT.navy} />
      </mesh>
    </group>
  );
}

function SwingSet(props) {
  return (
    <group {...props}>
      {[-4, 4].map(x => (
        <group key={x}>
          <Post from={[x, 0, 1.6]} to={[x, 5, 0]} color={PAINT.red} />
          <Post from={[x, 0, -1.6]} to={[x, 5, 0]} color={PAINT.red} />
        </group>
      ))}
      <Post from={[-4.2, 5, 0]} to={[4.2, 5, 0]} radius={0.15} color={PAINT.orange} />
      <Swing x={-1.8} phase={0} />
      <Swing x={1.8} phase={1.9} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[5.5, 32]} />
        <meshStandardMaterial map={sandTexture([4, 4])} roughness={1} />
      </mesh>
    </group>
  );
}

function Slide(props) {
  const rungs = [0.6, 1.2, 1.8, 2.4];
  return (
    <group {...props}>
      {[-0.55, 0.55].map(x => (
        <Post key={x} from={[x, 0, -1.4]} to={[x, 3.4, -0.6]} radius={0.08} color={PAINT.teal} />
      ))}
      {rungs.map(y => (
        <Post key={y} from={[-0.55, y, -1.4 + y * 0.24]} to={[0.55, y, -1.4 + y * 0.24]} radius={0.05} color={PAINT.teal} />
      ))}
      <mesh position={[0, 3, 0]} castShadow>
        <boxGeometry args={[1.6, 0.2, 1.4]} />
        <meshStandardMaterial color={PAINT.teal} />
      </mesh>
      {[-0.7, 0.7].map(x => (
        <Post key={x} from={[x, 0, -0.6]} to={[x, 3, -0.6]} radius={0.09} color={PAINT.teal} />
      ))}
      <mesh position={[0, 1.55, 2.6]} rotation={[0.62, 0, 0]} castShadow>
        <boxGeometry args={[1.2, 0.1, 4.6]} />
        <meshStandardMaterial color={PAINT.yellow} roughness={0.3} />
      </mesh>
    </group>
  );
}

function Seesaw(props) {
  const plank = useRef(null);
  useFrame(({ clock }) => {
    plank.current.rotation.z = Math.sin(clock.elapsedTime * 0.9) * 0.22;
  });
  return (
    <group {...props}>
      <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.5, 3]} />
        <meshStandardMaterial color={PAINT.red} />
      </mesh>
      <group ref={plank} position={[0, 1, 0]}>
        <mesh castShadow>
          <boxGeometry args={[6, 0.15, 0.5]} />
          <meshStandardMaterial color={PAINT.yellow} />
        </mesh>
      </group>
    </group>
  );
}

function Fence({ z, from, to }) {
  const pickets = [];
  for (let x = from; x <= to; x += 0.6) pickets.push(x);
  return (
    <group position={[0, -1, z]}>
      {pickets.map(x => (
        <mesh key={x} position={[x, 0.55, 0]} castShadow>
          <boxGeometry args={[0.16, 1.1, 0.06]} />
          <meshStandardMaterial color="#f5f1e8" />
        </mesh>
      ))}
      {[0.3, 0.8].map(y => (
        <mesh key={y} position={[(from + to) / 2, y, -0.05]}>
          <boxGeometry args={[to - from + 0.4, 0.1, 0.05]} />
          <meshStandardMaterial color="#f5f1e8" />
        </mesh>
      ))}
    </group>
  );
}

const CLOUDS = [
  [-50, 30, -110, 1.4],
  [-10, 36, -130, 1.8],
  [35, 28, -100, 1.2],
  [70, 40, -140, 2],
  [-85, 34, -90, 1.5]
];

function Clouds() {
  const group = useRef(null);
  useFrame((_, delta) => {
    for (const cloud of group.current.children) {
      cloud.position.x += delta * 1.2;
      if (cloud.position.x > 110) cloud.position.x = -110;
    }
  });
  return (
    <group ref={group}>
      {CLOUDS.map(([x, y, z, s]) => (
        <Cloud key={x} position={[x, y, z]} scale={s} emissiveIntensity={0.35} />
      ))}
    </group>
  );
}

const TREES = [
  [-30, -28, 1.3], [-26, -40, 1.2], [-34, -16, 1.4], [29, -30, 1.2], [33, -18, 1.3],
  [25, -42, 1.1], [-20, -55, 1.6], [18, -58, 1.5], [0, -70, 2], [-40, -50, 1.5], [42, -46, 1.4]
];

export default function Playground() {
  return (
    <>
      <color attach="background" args={['#d8ecff']} />
      <fog attach="fog" args={['#d8ecff', 40, 120]} />
      <SkyDome texture={gradientTexture('playground', SKY)} />
      <mesh position={[-60, 70, -140]} raycast={noRaycast}>
        <sphereGeometry args={[6, 24, 16]} />
        <meshBasicMaterial color="#fff6d0" fog={false} toneMapped={false} />
      </mesh>
      <sprite position={[-60, 70, -139]} scale={50} raycast={noRaycast}>
        <spriteMaterial map={dotTexture()} color="#fff1b8" blending={AdditiveBlending} opacity={0.6} fog={false} depthWrite={false} />
      </sprite>

      <hemisphereLight args={['#d4ecff', '#6a8a46', 1.2]} />
      <directionalLight
        position={[-20, 30, 15]}
        intensity={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-camera-far={90}
        shadow-bias={-0.0005}
      />

      <Clouds />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[320, 320]} />
        <meshStandardMaterial map={grassTexture([70, 70])} roughness={1} />
      </mesh>
      {/* Equipment sits beside the target board so it frames the board instead of hiding behind it. */}
      <Fence z={-12} from={-24} to={24} />
      <SwingSet position={[-22, -1, -17]} rotation={[0, 0.45, 0]} />
      <Slide position={[21, -1, -16]} rotation={[0, -0.7, 0]} />
      <Seesaw position={[-15, -1, -10]} rotation={[0, 0.9, 0]} />
      {TREES.map(([x, z, s]) => (
        <Tree key={`${x}-${z}`} position={[x, -1, z]} scale={s} />
      ))}
    </>
  );
}
