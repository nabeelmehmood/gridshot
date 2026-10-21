import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide } from 'three';
import { gradientTexture, sprinkleGroundTexture, swirlTexture } from '../textures';
import { Cloud, noRaycast, SkyDome } from './common';

const SKY = [[0, '#ffa6d2'], [0.42, '#ffd3ea'], [0.5, '#fff0f7'], [1, '#fff0f7']];
const RAINBOW = ['#ff9aa2', '#ffc38a', '#fff3a0', '#9ff0b0', '#9fd6ff', '#c9b3ff'];

function Rainbow(props) {
  return (
    <group {...props}>
      {RAINBOW.map((color, i) => (
        <mesh key={color} raycast={noRaycast}>
          <torusGeometry args={[40 - i * 1.8, 0.95, 8, 96, Math.PI]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// Cloud with a little face: eyes, blush and a smile.
function HappyCloud({ position, scale, phase }) {
  const group = useRef(null);
  useFrame(({ clock }) => {
    group.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.6 + phase) * 0.6;
  });
  return (
    <group ref={group} position={position} scale={scale}>
      <Cloud emissive="#fff4fa" emissiveIntensity={0.4}>
        {[-0.9, 0.9].map(x => (
          <mesh key={x} position={[x, 0.3, 2.5]} raycast={noRaycast}>
            <sphereGeometry args={[0.22, 12, 8]} />
            <meshBasicMaterial color="#3b2a3a" />
          </mesh>
        ))}
        {[-1.6, 1.6].map(x => (
          <mesh key={x} position={[x, -0.3, 2.45]} raycast={noRaycast}>
            <circleGeometry args={[0.38, 20]} />
            <meshBasicMaterial color="#ff9cc4" transparent opacity={0.8} />
          </mesh>
        ))}
        <mesh position={[0, -0.25, 2.55]} rotation={[0, 0, Math.PI]} raycast={noRaycast}>
          <torusGeometry args={[0.35, 0.07, 6, 16, Math.PI]} />
          <meshBasicMaterial color="#3b2a3a" />
        </mesh>
      </Cloud>
    </group>
  );
}

function Lollipop({ position, scale = 1, flavour }) {
  const [key, a, b] = flavour;
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 3, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 3.6, 0]}>
        <cylinderGeometry args={[1.3, 1.3, 0.3, 32]} />
        <meshStandardMaterial color={a} />
      </mesh>
      <mesh position={[0, 3.6, 0.16]}>
        <circleGeometry args={[1.3, 32]} />
        <meshStandardMaterial map={swirlTexture(key, a, b)} side={DoubleSide} />
      </mesh>
    </group>
  );
}

function Mushroom({ position, scale = 1 }) {
  const dots = [[0.5, 0.75, 0.6], [-0.6, 0.7, 0.5], [0, 0.95, 0.2], [0.2, 0.6, -0.8], [-0.4, 0.8, -0.5]];
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.3, 0.38, 1, 12]} />
        <meshStandardMaterial color="#fff6ea" />
      </mesh>
      <mesh position={[0, 1, 0]} scale={[1, 0.7, 1]}>
        <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#ff6f91" />
      </mesh>
      {dots.map(([x, y, z]) => (
        <mesh key={`${x}-${z}`} position={[x, y + 0.6, z]}>
          <sphereGeometry args={[0.13, 8, 6]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

const FLAVOURS = [
  ['pink', '#ff8fc7', '#ffffff'],
  ['mint', '#7ee0b5', '#ffffff'],
  ['lavender', '#c4a7ff', '#ffffff'],
  ['lemon', '#ffe27a', '#ff9ac9']
];

const LOLLIPOPS = [
  [-14, -16, 1.3, 0], [-19, -26, 1.6, 1], [15, -18, 1.4, 2], [20, -30, 1.7, 3],
  [-6, -34, 1.2, 2], [7, -36, 1.4, 0], [-26, -12, 1.5, 3], [26, -12, 1.5, 1]
];

const CLOUDS = [
  [-28, 20, -60, 1.3, 0], [0, 26, -75, 1.6, 1.2], [26, 18, -58, 1.2, 2.4], [-48, 28, -90, 1.5, 3.1], [50, 30, -95, 1.7, 0.7]
];

export default function Kawaii() {
  return (
    <>
      <color attach="background" args={['#fff0f7']} />
      <fog attach="fog" args={['#ffe6f2', 45, 140]} />
      <SkyDome texture={gradientTexture('kawaii', SKY)} />
      <ambientLight intensity={0.9} color="#fff0f7" />
      <directionalLight position={[8, 18, 14]} intensity={1.6} />

      <Rainbow position={[0, -1, -90]} />
      {CLOUDS.map(([x, y, z, s, phase]) => (
        <HappyCloud key={x} position={[x, y, z]} scale={s} phase={phase} />
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[320, 320]} />
        <meshStandardMaterial
          map={sprinkleGroundTexture([60, 60])}
          emissive="#ffffff"
          emissiveMap={sprinkleGroundTexture([60, 60])}
          emissiveIntensity={0.3}
          roughness={1}
        />
      </mesh>
      {LOLLIPOPS.map(([x, z, s, f]) => (
        <Lollipop key={`${x}-${z}`} position={[x, -1, z]} scale={s} flavour={FLAVOURS[f]} />
      ))}
      <Mushroom position={[-11, -1, -12]} scale={1.2} />
      <Mushroom position={[12, -1, -13]} scale={0.9} />
      <Mushroom position={[2, -1, -20]} scale={1.4} />
    </>
  );
}
