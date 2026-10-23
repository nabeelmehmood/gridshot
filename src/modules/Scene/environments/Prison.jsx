import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide } from 'three';
import { concreteTexture, hazardTexture, signTexture, steelTexture } from '../textures';
import { noRaycast, Room } from './common';

const STEEL = { metalness: 0.55, roughness: 0.5 };
const BAR = { color: '#7a8088', metalness: 0.9, roughness: 0.35 };

// Barred cell set into a side wall; `side` is -1 (left) or 1 (right).
function Cell({ side, from, to }) {
  const bars = [];
  for (let z = from; z <= to; z += 0.38) bars.push(z);
  const x = side * 9.6;
  const midZ = (from + to) / 2;
  return (
    <group>
      <mesh position={[side * 9.97, 2, midZ]} rotation={[0, -side * (Math.PI / 2), 0]}>
        <planeGeometry args={[to - from + 0.4, 6]} />
        <meshStandardMaterial color="#050607" roughness={1} />
      </mesh>
      {bars.map(z => (
        <mesh key={z} position={[x, 2, z]}>
          <cylinderGeometry args={[0.05, 0.05, 6, 8]} />
          <meshStandardMaterial {...BAR} />
        </mesh>
      ))}
      {[0.8, 4.6].map(y => (
        <mesh key={y} position={[x, y, midZ]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.12, to - from + 0.3, 0.12]} />
          <meshStandardMaterial {...BAR} />
        </mesh>
      ))}
    </group>
  );
}

// Caged ceiling lamp; `flicker` makes it cut out in short random bursts (menu only, not during a run).
function Lamp({ position, flicker = false }) {
  const light = useRef(null);
  const bulb = useRef(null);
  const state = useRef({ off: 0 });

  useFrame((_, delta) => {
    if (!flicker) {
      light.current.intensity = 22;
      bulb.current.emissiveIntensity = 2.5;
      return;
    }
    const s = state.current;
    if (s.off > 0) s.off -= delta;
    else if (Math.random() < delta * 0.8) s.off = 0.05 + Math.random() * 0.25;
    const on = s.off <= 0 || Math.random() < 0.3;
    light.current.intensity = on ? 22 : 1.5;
    bulb.current.emissiveIntensity = on ? 2.5 : 0.2;
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.5, 4]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <coneGeometry args={[0.55, 0.35, 16, 1, true]} />
        <meshStandardMaterial color="#3d4248" metalness={0.7} roughness={0.4} side={DoubleSide} />
      </mesh>
      <mesh position={[0, -0.25, 0]} raycast={noRaycast}>
        <sphereGeometry args={[0.16, 12, 8]} />
        <meshStandardMaterial ref={bulb} color="#fff1c9" emissive="#ffd27a" emissiveIntensity={2.5} />
      </mesh>
      {[0, Math.PI / 2].map(r => (
        <mesh key={r} position={[0, -0.3, 0]} rotation={[0, r, 0]} raycast={noRaycast}>
          <torusGeometry args={[0.28, 0.015, 4, 16]} />
          <meshStandardMaterial color="#222" />
        </mesh>
      ))}
      <pointLight ref={light} position={[0, -0.4, 0]} color="#ffcf8a" intensity={22} distance={18} decay={1.6} />
    </group>
  );
}

export default function Prison({ running = false }) {
  return (
    <>
      <color attach="background" args={['#0b0d10']} />
      <fog attach="fog" args={['#0b0d10', 14, 42]} />
      <ambientLight intensity={0.35} color="#7d8fa8" />
      <directionalLight position={[3, 8, 12]} intensity={0.6} color="#cfd8e6" />

      <Room
        faces={{
          back: <meshStandardMaterial map={steelTexture([5, 2.5])} {...STEEL} />,
          sides: <meshStandardMaterial map={steelTexture([4.5, 2.5])} {...STEEL} />,
          floor: <meshStandardMaterial map={concreteTexture([5, 5])} roughness={0.9} />,
          ceiling: <meshStandardMaterial map={steelTexture([5, 4.5])} color="#5a6068" {...STEEL} />
        }}
      />
      <mesh position={[0, -0.82, -8.98]}>
        <planeGeometry args={[20, 0.35]} />
        <meshStandardMaterial map={hazardTexture([16, 1])} />
      </mesh>
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * 9.98, -0.82, 0]} rotation={[0, -side * (Math.PI / 2), 0]}>
          <planeGeometry args={[18, 0.35]} />
          <meshStandardMaterial map={hazardTexture([14, 1])} />
        </mesh>
      ))}
      {/* Plaque on the backdrop's top frame, above the highest target row. */}
      <mesh position={[0, 8.6, -8.75]}>
        <planeGeometry args={[2.8, 0.7]} />
        <meshStandardMaterial map={signTexture('block-c', 'BLOCK C', { background: '#1b1d20' })} />
      </mesh>

      <Cell side={-1} from={-7.5} to={-1.5} />
      <Cell side={1} from={-7.5} to={-1.5} />

      {[-1, 1].map(side => (
        <mesh key={side} position={[side * 9.3, 8.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.22, 0.22, 18, 12]} />
          <meshStandardMaterial color="#6b4a3a" metalness={0.6} roughness={0.6} />
        </mesh>
      ))}

      <Lamp position={[0, 8.5, -6]} flicker={!running} />
      <Lamp position={[0, 8.5, -1.5]} />
    </>
  );
}
