import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, DoubleSide, Object3D } from 'three';
import { causticTexture, tileTexture, waterTexture } from '../textures';
import { noRaycast } from './common';

const HALF_WIDTH = 12;
const BACK = -10;
const EDGE = 3;
const FLOOR = -1;
const BASIN = -4;
const TOP = 10;

const wallTiles = repeat => tileTexture('wall', '#eef6f8', '#b7cfd8', repeat);
const poolTiles = repeat => tileTexture('pool', '#58c2ea', '#3a9cc4', repeat);

function Wall({ position, rotation, size, repeat, map }) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={map(repeat)} roughness={0.35} />
    </mesh>
  );
}

const ROPE_XS = [-8, -4, 0, 4, 8];
const BEADS = 34;
const BEAD_COLORS = ['#e63946', '#ffffff', '#1d4ed8'];

function LaneRopes() {
  const mesh = useRef(null);
  useLayoutEffect(() => {
    const dummy = new Object3D();
    const color = new Color();
    let i = 0;
    for (const x of ROPE_XS) {
      for (let b = 0; b < BEADS; b++) {
        dummy.position.set(x, -1.3, EDGE - 0.2 - (b * (EDGE - BACK - 0.4)) / (BEADS - 1));
        dummy.updateMatrix();
        mesh.current.setMatrixAt(i, dummy.matrix);
        mesh.current.setColorAt(i, color.set(BEAD_COLORS[Math.floor(b / 3) % BEAD_COLORS.length]));
        i++;
      }
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.instanceColor.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, ROPE_XS.length * BEADS]}>
      <sphereGeometry args={[0.13, 10, 8]} />
      <meshStandardMaterial roughness={0.4} />
    </instancedMesh>
  );
}

function Ladder({ x }) {
  return (
    <group position={[x, 0, EDGE + 0.15]}>
      {[-0.35, 0.35].map(dx => (
        <group key={dx} position={[dx, 0, 0]}>
          <mesh position={[0, -2, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 3.6, 10]} />
            <meshStandardMaterial color="#d9dee3" metalness={1} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.2, 0.35]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.35, 0.05, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#d9dee3" metalness={1} roughness={0.2} />
          </mesh>
        </group>
      ))}
      {[-1.4, -2.2, -3].map(y => (
        <mesh key={y} position={[0, y, -0.02]}>
          <boxGeometry args={[0.7, 0.06, 0.16]} />
          <meshStandardMaterial color="#d9dee3" metalness={1} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

const FLAG_COLORS = ['#e63946', '#ffffff', '#1d4ed8'];

function Flags({ z }) {
  const flags = [];
  for (let x = -HALF_WIDTH + 0.6, i = 0; x < HALF_WIDTH; x += 0.8, i++) flags.push([x, FLAG_COLORS[i % 3]]);
  return (
    <group position={[0, 8.9, z]}>
      <mesh rotation={[0, 0, Math.PI / 2]} raycast={noRaycast}>
        <cylinderGeometry args={[0.015, 0.015, HALF_WIDTH * 2, 4]} />
        <meshBasicMaterial color="#5d6b75" />
      </mesh>
      {flags.map(([x, color]) => (
        <mesh key={x} position={[x, -0.25, 0]} rotation={[0, 0, -Math.PI / 2]} raycast={noRaycast}>
          <circleGeometry args={[0.32, 3]} />
          <meshStandardMaterial color={color} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export default function Pool() {
  const water = useRef(null);
  const causticWall = useRef(null);
  const causticFloor = useRef(null);

  useFrame((_, delta) => {
    water.current.map.offset.x += delta * 0.02;
    water.current.map.offset.y += delta * 0.035;
    causticWall.current.map.offset.x += delta * 0.025;
    causticWall.current.map.offset.y -= delta * 0.04;
    causticFloor.current.map.offset.y += delta * 0.03;
  });

  const depth = EDGE - BACK;
  return (
    <>
      <color attach="background" args={['#cfeaf5']} />
      <fog attach="fog" args={['#d8f1fa', 25, 70]} />
      <hemisphereLight args={['#ffffff', '#7fc8e8', 1.1]} />
      <directionalLight position={[5, 12, 8]} intensity={1.4} />
      <ambientLight intensity={0.3} />

      {/* Walls run from the basin floor to the ceiling. */}
      <Wall position={[0, (BASIN + TOP) / 2, BACK]} size={[HALF_WIDTH * 2, TOP - BASIN]} repeat={[12, 7]} map={wallTiles} />
      <Wall
        position={[-HALF_WIDTH, (BASIN + TOP) / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        size={[20, TOP - BASIN]}
        repeat={[10, 7]}
        map={wallTiles}
      />
      <Wall
        position={[HALF_WIDTH, (BASIN + TOP) / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        size={[20, TOP - BASIN]}
        repeat={[10, 7]}
        map={wallTiles}
      />
      <mesh position={[0, 0.6, BACK + 0.01]}>
        <planeGeometry args={[HALF_WIDTH * 2, 0.6]} />
        <meshStandardMaterial map={poolTiles([12, 0.3])} />
      </mesh>
      <mesh position={[0, 4, BACK + 0.02]} raycast={noRaycast}>
        <planeGeometry args={[HALF_WIDTH * 2, 10]} />
        <meshBasicMaterial
          ref={causticWall}
          map={causticTexture([3, 1.3])}
          transparent
          opacity={0.18}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, TOP, 0]}>
        <planeGeometry args={[HALF_WIDTH * 2, 20]} />
        <meshStandardMaterial color="#e8f1f5" />
      </mesh>
      {[-6, 0, 6].map(x => (
        <mesh key={x} position={[x, TOP - 0.05, -3]} raycast={noRaycast}>
          <boxGeometry args={[2.4, 0.08, 9]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      ))}

      {/* Deck the player stands on, then the basin in front of it. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR, (EDGE + 10) / 2]}>
        <planeGeometry args={[HALF_WIDTH * 2, 10 - EDGE]} />
        <meshStandardMaterial map={tileTexture('deck', '#dfe7ea', '#a9bcc3', [12, 3.5])} roughness={0.6} />
      </mesh>
      <mesh position={[0, (BASIN + FLOOR) / 2, EDGE]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[HALF_WIDTH * 2, FLOOR - BASIN]} />
        <meshStandardMaterial map={poolTiles([12, 1.5])} side={DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, BASIN, (EDGE + BACK) / 2]}>
        <planeGeometry args={[HALF_WIDTH * 2, depth]} />
        <meshStandardMaterial map={poolTiles([12, 6.5])} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, BASIN + 0.02, (EDGE + BACK) / 2]} raycast={noRaycast}>
        <planeGeometry args={[HALF_WIDTH * 2, depth]} />
        <meshBasicMaterial
          ref={causticFloor}
          map={causticTexture([3, 1.6])}
          transparent
          opacity={0.35}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.35, (EDGE + BACK) / 2]}>
        <planeGeometry args={[HALF_WIDTH * 2, depth]} />
        <meshStandardMaterial
          ref={water}
          map={waterTexture([5, 3])}
          transparent
          opacity={0.72}
          roughness={0.12}
          metalness={0.1}
        />
      </mesh>

      <LaneRopes />
      <Ladder x={9.5} />
      <Flags z={-4} />
    </>
  );
}
