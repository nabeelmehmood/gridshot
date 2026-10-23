import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide } from 'three';
import {
  gradientTexture,
  pixelBonusTexture,
  pixelBrickTexture,
  pixelCloudTexture,
  pixelCoinTexture,
  pixelGrassTexture,
  pixelGroundBlockTexture,
  pixelHillTexture,
  pixelLeavesTexture,
  pixelStoneTexture,
  pixelSunTexture,
  pixelTrunkTexture
} from '../textures';
import { noRaycast, SkyDome } from './common';

// An original 8-bit overworld built from genre staples: banded sky, block stairs, floating bricks,
// spinning coins, dome hills and a castle on the horizon. Everything outside the board sits beyond
// its edges (38° either side) or above its top (~19°), so the targets keep a calm background.

// Hard-edged bands, like a limited palette.
const SKY = [
  [0, '#3a5fd0'], [0.3, '#3a5fd0'], [0.3, '#476fe0'], [0.4, '#476fe0'], [0.4, '#5a84f2'],
  [0.46, '#5a84f2'], [0.46, '#79a3ff'], [1, '#79a3ff']
];
const BLOCK = 1.2;

// Flat pixel-art cutout. alphaTest keeps the edges hard and sorting-free.
function Sprite({ texture, position, size, fog = true }) {
  return (
    <mesh position={position} raycast={noRaycast}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} alphaTest={0.5} fog={fog} toneMapped={false} />
    </mesh>
  );
}

function Block({ position, texture, size = BLOCK }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[size, size, size]} />
      <meshLambertMaterial map={texture} />
    </mesh>
  );
}

// Columns of ground blocks rising away from the board: one block, then two, three...
function Stairs({ x, z, steps, direction }) {
  const blocks = [];
  for (let step = 0; step < steps; step++) {
    for (let level = 0; level <= step; level++) {
      blocks.push([x + direction * step * BLOCK, -1 + BLOCK / 2 + level * BLOCK, z]);
    }
  }
  return blocks.map(position => <Block key={position.join()} position={position} texture={pixelGroundBlockTexture()} />);
}

function BlockRow({ position, pattern }) {
  return [...pattern].map((kind, i) => (
    <Block
      key={i}
      position={[position[0] + i * BLOCK, position[1], position[2]]}
      texture={kind === '*' ? pixelBonusTexture() : pixelBrickTexture()}
    />
  ));
}

function Coins({ position, count, spacing = 1.1 }) {
  const group = useRef(null);
  useFrame(({ clock }) => {
    group.current.children.forEach((coin, i) => {
      coin.rotation.y = clock.elapsedTime * 1.6 + i * 0.5;
    });
  });
  return (
    <group ref={group} position={position}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} position={[i * spacing, 0, 0]} raycast={noRaycast}>
          <planeGeometry args={[0.6, 0.84]} />
          <meshBasicMaterial map={pixelCoinTexture()} alphaTest={0.5} side={DoubleSide} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function VoxelTree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.8, 3, 0.8]} />
        <meshLambertMaterial map={pixelTrunkTexture()} />
      </mesh>
      <mesh position={[0, 4, 0]}>
        <boxGeometry args={[3, 2.4, 3]} />
        <meshLambertMaterial map={pixelLeavesTexture()} />
      </mesh>
      <mesh position={[0, 5.7, 0]}>
        <boxGeometry args={[1.8, 1.2, 1.8]} />
        <meshLambertMaterial map={pixelLeavesTexture()} />
      </mesh>
    </group>
  );
}

function Tower({ position, width, height }) {
  const teeth = [-1, 1].map(side => side * (width / 2 - 0.6));
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, width]} />
        <meshLambertMaterial map={pixelStoneTexture([width / 2, height / 2])} />
      </mesh>
      {teeth.map(x => (
        <mesh key={x} position={[x, height + 0.6, width / 2 - 0.6]}>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshLambertMaterial map={pixelStoneTexture([0.6, 0.6])} />
        </mesh>
      ))}
    </group>
  );
}

function Castle({ position, rotation }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 5, 0]}>
        <boxGeometry args={[16, 10, 8]} />
        <meshLambertMaterial map={pixelStoneTexture([8, 5])} />
      </mesh>
      {[-6, -2, 2, 6].map(x => (
        <mesh key={x} position={[x, 10.6, 3.4]}>
          <boxGeometry args={[1.2, 1.2, 1.2]} />
          <meshLambertMaterial map={pixelStoneTexture([0.6, 0.6])} />
        </mesh>
      ))}
      <mesh position={[0, 2.2, 4.01]} raycast={noRaycast}>
        <planeGeometry args={[3, 4.4]} />
        <meshBasicMaterial color="#1a1020" />
      </mesh>
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * 4.5, 6.5, 4.01]} raycast={noRaycast}>
          <planeGeometry args={[1.2, 1.8]} />
          <meshBasicMaterial color="#1a1020" />
        </mesh>
      ))}
      <Tower position={[-9.5, 0, 0]} width={5} height={15} />
      <Tower position={[9.5, 0, 0]} width={5} height={15} />
      <mesh position={[0, 13.5, 0]}>
        <boxGeometry args={[0.3, 6, 0.3]} />
        <meshLambertMaterial color="#e8e8e8" />
      </mesh>
      <mesh position={[1.3, 15.6, 0]} raycast={noRaycast}>
        <planeGeometry args={[2.4, 1.5]} />
        <meshBasicMaterial color="#ff004d" side={DoubleSide} />
      </mesh>
    </group>
  );
}

const CLOUDS = [[-48, 44, -110, 26], [-12, 54, -120, 30], [26, 47, -112, 24], [62, 56, -125, 30], [-80, 40, -100, 22]];

function Clouds() {
  const group = useRef(null);
  useFrame((_, delta) => {
    for (const cloud of group.current.children) {
      cloud.position.x += delta * 0.8;
      if (cloud.position.x > 110) cloud.position.x -= 220;
    }
  });
  return (
    <group ref={group}>
      {CLOUDS.map(([x, y, z, width]) => (
        <Sprite key={x} texture={pixelCloudTexture()} position={[x, y, z]} size={[width, (width * 14) / 32]} fog={false} />
      ))}
    </group>
  );
}

export default function Pixel() {
  const hill = pixelHillTexture('far', '#3c9a3c', '#2a7a2a', '#1f5a1f');
  const bush = pixelHillTexture('bush', '#5cc94a', '#3fa535', '#1f6a1f');
  return (
    <>
      <color attach="background" args={['#79a3ff']} />
      <fog attach="fog" args={['#8fb4ff', 70, 170]} />
      <SkyDome texture={gradientTexture('pixel', SKY)} />
      <ambientLight intensity={1.4} />
      {/* From the front left, so the blocks' faces step through three shades. */}
      <directionalLight position={[-6, 10, 8]} intensity={1.6} />

      <Sprite texture={pixelSunTexture()} position={[-70, 72, -150]} size={[22, 22]} fog={false} />
      <Clouds />
      <Sprite texture={hill} position={[-48, 14, -95]} size={[64, 32]} />
      <Sprite texture={hill} position={[0, 17, -100]} size={[76, 38]} />
      <Sprite texture={hill} position={[54, 15, -92]} size={[70, 35]} />
      <Castle position={[-58, -1, -58]} rotation={[0, 0.6, 0]} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[320, 320]} />
        <meshLambertMaterial map={pixelGrassTexture([120, 120])} />
      </mesh>

      <Stairs x={-12.6} z={-9.6} steps={5} direction={-1} />
      <BlockRow position={[-18.6, 6.6, -10.4]} pattern="#*#*" />
      <Coins position={[-18.6, 9, -10.4]} count={4} spacing={1.2} />
      <BlockRow position={[14.2, 6.6, -11]} pattern="*##" />
      <Coins position={[14.2, 8.8, -11]} count={3} spacing={1.2} />

      <VoxelTree position={[-24, -1, -22]} scale={1.1} />
      <VoxelTree position={[23, -1, -26]} scale={1.3} />
      <VoxelTree position={[-34, -1, -36]} scale={1.4} />
      <VoxelTree position={[33, -1, -40]} scale={1.2} />
      <Sprite texture={bush} position={[-20, 1, -16]} size={[8, 4]} />
      <Sprite texture={bush} position={[19, 1, -18]} size={[9, 4.5]} />
    </>
  );
}
