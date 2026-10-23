import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending } from 'three';
import { glowGridTexture, gradientTexture, neonSignTexture, seeded, synthSunTexture, windowsTexture } from '../textures';
import { noRaycast, SkyDome } from './common';

const SKY = [[0, '#05020d'], [0.36, '#1a0b33'], [0.47, '#5b1a6b'], [0.5, '#ff4fb8'], [0.51, '#1a0820'], [1, '#07040f']];
const WINDOW_COLORS = [
  ['cyan', ['#22e6ff', '#9ff6ff']],
  ['pink', ['#ff2bd6', '#ff9cf0']],
  ['amber', ['#ffd166', '#ffe9b0']]
];
const TRIM = ['#ff2bd6', '#22e6ff', '#b46bff'];
// Synthwave sun up in the clear band between the board's top (~19°) and the score bar, left of
// the billboard. The texture's disc is 64% of the plane, so it spans about 16°–32° up and 5°–21° left.
const SUN = { position: [-45, 90, -190], size: 84 };
const SUN_AZIMUTH = [-24, -2];
// Buildings in front of the sun stop below its middle, so the skyline cuts across its lower half only.
const SUN_CUT = Math.tan((22 * Math.PI) / 180);

const BUILDINGS = (() => {
  const rand = seeded(29);
  const list = [];
  for (let i = 0; i < 46; i++) {
    const x = -95 + rand() * 190;
    const z = -32 - rand() * 80;
    // Leave the near middle open so the skyline frames the board instead of crowding it.
    if (Math.abs(x) < 16 && z > -45) continue;
    const width = 6 + rand() * 9;
    const depth = 6 + rand() * 7;
    let height = 10 + rand() * 38;
    const distance = 5 - z;
    const azimuth = (Math.atan2(x, distance) * 180) / Math.PI;
    if (azimuth > SUN_AZIMUTH[0] && azimuth < SUN_AZIMUTH[1]) height = Math.min(height, 5 + distance * SUN_CUT);
    list.push({
      x,
      z,
      width,
      depth,
      height,
      windows: Math.floor(rand() * WINDOW_COLORS.length),
      trim: rand() < 0.45 ? TRIM[Math.floor(rand() * TRIM.length)] : null
    });
  }
  return list;
})();

function Skyline() {
  return (
    <group>
      {BUILDINGS.map(({ x, z, width, depth, height, windows, trim }) => {
        const [key, colors] = WINDOW_COLORS[windows];
        return (
          <group key={`${x}-${z}`} position={[x, -1 + height / 2, z]}>
            <mesh>
              <boxGeometry args={[width, height, depth]} />
              <meshBasicMaterial
                map={windowsTexture(key, colors, [Math.max(1, Math.round(width / 8)), Math.max(1, Math.round(height / 16))])}
                color="#c9c2d9"
              />
            </mesh>
            {trim && (
              <mesh position={[0, height / 2 + 0.1, 0]} raycast={noRaycast}>
                <boxGeometry args={[width + 0.3, 0.25, depth + 0.3]} />
                <meshBasicMaterial color={trim} toneMapped={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function NeonSign({ text, color, position, rotation, width = 6, flicker = false }) {
  const material = useRef(null);
  useFrame(({ clock }) => {
    if (!flicker) {
      material.current.opacity = 1;
      return;
    }
    const t = clock.elapsedTime;
    material.current.opacity = Math.sin(t * 23) > 0.92 || (t % 5 > 4.6 && Math.sin(t * 40) > 0) ? 0.25 : 1;
  });
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.06]}>
        <boxGeometry args={[width + 0.4, width / 4 + 0.4, 0.1]} />
        <meshStandardMaterial color="#120a1c" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh raycast={noRaycast}>
        <planeGeometry args={[width, width / 4]} />
        <meshBasicMaterial
          ref={material}
          map={neonSignTexture(text, text, color)}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <pointLight position={[0, 0, 1]} color={color} intensity={8} distance={10} />
    </group>
  );
}

function Antenna({ position, blink }) {
  const light = useRef(null);
  useFrame(({ clock }) => {
    light.current.visible = !blink || Math.floor(clock.elapsedTime * 1.2 + position[0]) % 2 === 0;
  });
  return (
    <group position={position}>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.06, 0.1, 4, 6]} />
        <meshStandardMaterial color="#2a2238" metalness={0.8} roughness={0.4} />
      </mesh>
      <mesh ref={light} position={[0, 4.1, 0]} raycast={noRaycast}>
        <sphereGeometry args={[0.14, 8, 6]} />
        <meshBasicMaterial color="#ff3355" toneMapped={false} />
      </mesh>
    </group>
  );
}

function RooftopUnit({ position, size }) {
  return (
    <mesh position={[position[0], -1 + size[1] / 2, position[2]]}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#1b1526" metalness={0.5} roughness={0.6} />
    </mesh>
  );
}

// Signs flicker and antennas blink in the menu only; during a run they hold steady so nothing
// in the corner of the eye competes with the targets.
export default function Neon({ running = false }) {
  return (
    <>
      <color attach="background" args={['#07040f']} />
      <fog attach="fog" args={['#12081f', 30, 130]} />
      <SkyDome texture={gradientTexture('neon', SKY)} />
      <mesh position={SUN.position} raycast={noRaycast}>
        <planeGeometry args={[SUN.size, SUN.size]} />
        <meshBasicMaterial map={synthSunTexture()} transparent fog={false} toneMapped={false} depthWrite={false} />
      </mesh>

      <ambientLight intensity={0.45} color="#8a6bff" />
      <directionalLight position={[3, 8, 14]} intensity={1.1} color="#ffe2f7" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[320, 320]} />
        <meshStandardMaterial color="#0b0616" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]} raycast={noRaycast}>
        <planeGeometry args={[320, 320]} />
        <meshBasicMaterial
          map={glowGridTexture('neon', '#ff2bd6', [80, 80])}
          transparent
          opacity={0.7}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <Skyline />
      <NeonSign text="NEON" color="#ff2bd6" position={[-15, 6.5, -15]} rotation={[0, 0.45, 0]} width={7} />
      <NeonSign text="OPEN 24H" color="#22e6ff" position={[15.5, 4, -14]} rotation={[0, -0.45, 0]} width={7} flicker={!running} />
      <NeonSign text="ラーメン" color="#ffd166" position={[-16.5, 1.5, -12]} rotation={[0, 0.5, 0]} width={5} />

      <RooftopUnit position={[-13, 0, -6]} size={[3, 2, 2.5]} />
      <RooftopUnit position={[14, 0, -5]} size={[2.5, 1.6, 3]} />
      <Antenna position={[-12, 1, -6]} blink={!running} />
      <Antenna position={[13.5, 0.6, -5]} blink={!running} />
    </>
  );
}
