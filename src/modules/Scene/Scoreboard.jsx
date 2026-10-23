import { useCallback, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, CanvasTexture, DoubleSide, SRGBColorSpace } from 'three';
import { streakBonus } from '../../game/scoring';
import { FACES, paintFace } from './scoreboardFaces';

// The streak, as a prop that belongs to each theme: a wooden sign in the park, a caution poster on
// the pool wall, a billboard over the neon city... Its face (scoreboardFaces.js) is a canvas,
// redrawn only when what it shows changes.
//
// Placement rules, from the game camera at (0, 4, 5) looking down -z with a fixed vertical FOV:
// - never in front of a target: targets reach about 17° above and below eye level and 38° to the
//   sides (the board's edge), so props sit above, below or beside that;
// - the view's width depends on the screen's shape, so a prop beside the board can be off-screen on
//   a 16:10 or 4:3 screen. Each prop's corners are checked against the actual view, and when any
//   is outside it falls back to FLOOR: a stand on the ground below the targets, visible on every
//   screen, still wearing the theme's face.
const CAMERA = { x: 0, z: 5 };
const VIEW_MARGIN_DEGREES = 1;
const LOST_MS = 1200;
const POP_SECONDS = 0.3;
const noRaycast = () => {};

// position: bottom-centre of the face. yaw turns it about y, tilt tips it back.
const FLOOR = { prop: 'floor', position: [4.2, -0.85, -4], yaw: 0, tilt: -0.25, width: 4.6 };
// On the floor a face must stay under the targets, so tall faces (the pool poster) shrink to fit and
// stand like a wet-floor sign.
const FLOOR_MAX_HEIGHT = 1.6;
const PLACEMENTS = {
  // Beside the board, facing the camera, 19 units out at 46°: it spans 40°–52°, clear of the
  // board's edge (38°) and inside a 16:9 view (54°).
  playground: { prop: 'signpost', position: [13.67, 1.3, -8.2], yaw: -0.803, tilt: 0, width: 4 },
  // Flat on the right side wall (x 12), spanning about 41°–49°.
  pool: { prop: 'poster', position: [11.94, 2.3, -7.1], yaw: -Math.PI / 2, tilt: 0, width: 3.4 },
  // Over the skyline behind the board's top right: its bottom edge (~20°) clears the board's top
  // (~19°) and its top (~28°) stays under the score bar.
  neon: { prop: 'billboard', position: [9, 15.6, -26], yaw: -0.2, tilt: 0, width: 16 },
  space: { prop: 'hologram', position: [4.2, -0.55, -4], yaw: 0, tilt: -0.1, width: 4.4 },
  // Hung from the ceiling (y 9) in front of the board's top right: its bottom (~20° up) clears the
  // highest targets (~17°) and the room's walls leave no room beside the board.
  prison: { prop: 'hanging', position: [5.6, 7.45, -4.5], yaw: -0.15, tilt: 0, width: 4.6 },
  kawaii: { prop: 'candy', position: [-3.9, -0.05, -2.6], yaw: 0.12, tilt: -0.1, width: 4 },
  // A cloud drifting over the board's top right: bottom ~20° up (above the board), top ~26°.
  daydream: { prop: 'floating', position: [9, 12.6, -18], yaw: -0.3, tilt: 0, width: 11 },
  classic: FLOOR
};

// Largest horizontal angle (degrees) of the face's bottom corners as seen from the camera.
function reach({ position: [x, , z], yaw, width }) {
  const half = width / 2;
  return Math.max(
    ...[-1, 1].map(side => {
      const cornerX = x + side * half * Math.cos(yaw);
      const cornerZ = z - side * half * Math.sin(yaw);
      return (Math.abs(Math.atan2(cornerX - CAMERA.x, CAMERA.z - cornerZ)) * 180) / Math.PI;
    })
  );
}

function placementFor(theme, fov, aspect) {
  const preferred = PLACEMENTS[theme] ?? FLOOR;
  const halfWidth = (Math.atan(Math.tan(((fov / 2) * Math.PI) / 180) * aspect) * 180) / Math.PI;
  return reach(preferred) <= halfWidth - VIEW_MARGIN_DEGREES ? preferred : FLOOR;
}

// Supports and trim around the face, per prop. Sizes are in world units; the face's bottom edge
// is at local y 0 and its centre at x 0.
// drop: height of the face's bottom edge above the ground (y -1).
function Supports({ prop, width, height, frame, drop }) {
  if (prop === 'floor') {
    const top = height * Math.cos(-0.25);
    return [-1, 1].map(side => (
      <mesh key={side} position={[side * (width / 2 - 0.5), top / 2 - 0.15, height * Math.sin(-0.25) - 0.08]} raycast={noRaycast}>
        <boxGeometry args={[0.1, top + 0.15, 0.1]} />
        <meshStandardMaterial color={frame} roughness={0.6} />
      </mesh>
    ));
  }
  if (prop === 'signpost') {
    // Two log posts from the grass, a little taller than the board.
    const length = drop + height + 0.3;
    return [-1, 1].map(side => (
      <mesh key={side} position={[side * (width / 2 + 0.05), length / 2 - drop, -0.08]} raycast={noRaycast}>
        <cylinderGeometry args={[0.13, 0.15, length, 10]} />
        <meshStandardMaterial color="#7a4f2c" roughness={0.9} />
      </mesh>
    ));
  }
  if (prop === 'poster') {
    // A thin backing so it reads as a poster pinned to the tiles.
    return (
      <mesh position={[0, height / 2, -0.02]} raycast={noRaycast}>
        <boxGeometry args={[width + 0.08, height + 0.08, 0.02]} />
        <meshStandardMaterial color="#e9f4f8" roughness={0.5} />
      </mesh>
    );
  }
  if (prop === 'billboard') {
    const tube = 0.12;
    return (
      <>
        <mesh position={[0, height / 2, -0.15]} raycast={noRaycast}>
          <boxGeometry args={[width + 0.4, height + 0.4, 0.2]} />
          <meshStandardMaterial color="#120a22" roughness={0.8} />
        </mesh>
        {[
          [0, height + tube, width + tube * 2, tube, '#ff2bd6'],
          [0, -tube, width + tube * 2, tube, '#22e6ff'],
          [-width / 2 - tube, height / 2, tube, height, '#ff2bd6'],
          [width / 2 + tube, height / 2, tube, height, '#22e6ff']
        ].map(([x, y, w, h, color]) => (
          <mesh key={`${x}-${y}`} position={[x, y, 0.02]} raycast={noRaycast}>
            <boxGeometry args={[w, h, tube]} />
            <meshBasicMaterial color={color} toneMapped={false} />
          </mesh>
        ))}
        {/* Catwalk and the two poles down to the rooftop. */}
        <mesh position={[0, -0.35, 0.4]} raycast={noRaycast}>
          <boxGeometry args={[width, 0.12, 1]} />
          <meshStandardMaterial color="#2a2238" roughness={0.7} />
        </mesh>
        {[-1, 1].map(side => (
          <mesh key={side} position={[side * width * 0.3, -drop / 2, -0.3]} raycast={noRaycast}>
            <boxGeometry args={[0.45, drop, 0.45]} />
            <meshStandardMaterial color="#1c1628" roughness={0.7} />
          </mesh>
        ))}
      </>
    );
  }
  if (prop === 'hologram') {
    // Projector puck on the floor and a faint light cone up to the image.
    const below = 0.45;
    return (
      <>
        <mesh position={[0, -below, 0]} raycast={noRaycast}>
          <cylinderGeometry args={[0.5, 0.6, 0.18, 24]} />
          <meshStandardMaterial color="#1b2433" metalness={0.6} roughness={0.35} />
        </mesh>
        <mesh position={[0, -below + 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
          <ringGeometry args={[0.28, 0.42, 32]} />
          <meshBasicMaterial color="#7dd3fc" toneMapped={false} />
        </mesh>
        <mesh position={[0, (-below + 0.1) / 2, 0]} raycast={noRaycast}>
          <cylinderGeometry args={[width * 0.42, 0.3, below, 32, 1, true]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.12} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} toneMapped={false} />
        </mesh>
      </>
    );
  }
  if (prop === 'hanging') {
    // Steel backing and two chains up to the ceiling (y 9).
    const chain = 9 - (7.45 + height);
    return (
      <>
        <mesh position={[0, height / 2, -0.04]} raycast={noRaycast}>
          <boxGeometry args={[width + 0.1, height + 0.1, 0.06]} />
          <meshStandardMaterial color="#4b5059" metalness={0.6} roughness={0.45} />
        </mesh>
        {[-1, 1].map(side => (
          <mesh key={side} position={[side * (width / 2 - 0.35), height + chain / 2, 0]} raycast={noRaycast}>
            <cylinderGeometry args={[0.025, 0.025, chain, 6]} />
            <meshStandardMaterial color="#9aa1aa" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
      </>
    );
  }
  if (prop === 'candy') {
    // A striped candy stick down to the grass.
    return [0, 1, 2, 3].map(i => (
      <mesh key={i} position={[0, -0.12 - i * 0.24, -0.05]} raycast={noRaycast}>
        <cylinderGeometry args={[0.07, 0.07, 0.24, 10]} />
        <meshStandardMaterial color={i % 2 ? '#ffffff' : '#ff8fc7'} roughness={0.4} />
      </mesh>
    ));
  }
  return null;
}

export default function Scoreboard({ theme, fov, running, streak, streakBreaks, lostStreak, pace, best }) {
  const aspect = useThree(state => state.size.width / Math.max(state.size.height, 1));
  const placement = placementFor(theme, fov, aspect);
  const face = FACES[theme] ?? FACES.classic;
  const ratio = face.size[1] / face.size[0];
  const width = placement === FLOOR ? Math.min(placement.width, FLOOR_MAX_HEIGHT / ratio) : placement.width;
  const height = width * ratio;
  const hologram = placement.prop === 'hologram';

  const sign = useRef(null);
  const material = useRef(null);
  const board = useRef(null);
  const latest = useRef(null);
  const lostUntil = useRef(0);
  const popAt = useRef(-1);
  const lastTier = useRef(0);

  const redraw = useCallback(() => {
    if (!board.current || !latest.current) return;
    const view = latest.current;
    const lost = performance.now() < lostUntil.current ? view.lostStreak : 0;
    paintFace(board.current.ctx, face, { ...view, lost });
    board.current.texture.needsUpdate = true;
  }, [face]);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    [canvas.width, canvas.height] = face.size;
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    board.current = { ctx: canvas.getContext('2d'), texture };
    material.current.map = texture;
    material.current.needsUpdate = true;
    redraw();
    // The display font may still be loading on the first draw.
    document.fonts?.load('700 64px Rajdhani').then(redraw, () => {});
    return () => {
      texture.dispose();
      board.current = null;
    };
  }, [face, redraw]);

  useEffect(() => {
    latest.current = { running, streak, pace, best, lostStreak };
    const tier = running ? streakBonus(streak) : 0;
    if (tier > lastTier.current) popAt.current = -2; // started on the next frame
    lastTier.current = tier;
    redraw();
  }, [running, streak, pace, best, lostStreak, redraw]);

  // A broken streak of 10 or more flashes on the sign, then it returns to normal.
  useEffect(() => {
    if (!streakBreaks) return undefined;
    lostUntil.current = performance.now() + LOST_MS;
    redraw();
    const timer = setTimeout(redraw, LOST_MS + 20);
    return () => clearTimeout(timer);
  }, [streakBreaks, redraw]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (popAt.current === -2) popAt.current = t;
    const age = popAt.current < 0 ? Infinity : t - popAt.current;
    const pop = age < POP_SECONDS ? Math.sin((age / POP_SECONDS) * Math.PI) * 0.12 : 0;
    sign.current.scale.setScalar(1 + pop);
    // Clouds bob, hanging signs sway a touch, holograms flicker (in the menu only).
    if (placement.prop === 'floating') sign.current.position.y = Math.sin(t * 0.9) * 0.18;
    if (placement.prop === 'hanging') sign.current.rotation.z = Math.sin(t * 0.7) * 0.015;
    if (hologram && material.current) {
      material.current.opacity = running ? 0.86 : 0.82 + Math.sin(t * 23) * 0.04 + (Math.sin(t * 1.3) > 0.97 ? -0.3 : 0);
    }
  });

  return (
    <group position={placement.position} rotation={[0, placement.yaw, 0]}>
      <group ref={sign}>
        <group rotation={[placement.tilt, 0, 0]}>
          <mesh position={[0, height / 2, 0]} raycast={noRaycast}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial
              ref={material}
              transparent
              toneMapped={false}
              side={hologram ? DoubleSide : undefined}
              blending={hologram ? AdditiveBlending : undefined}
              depthWrite={!hologram}
            />
          </mesh>
          <Supports
            prop={placement.prop}
            width={width}
            height={height}
            frame={face.colors.frame ?? '#3a4150'}
            drop={placement.position[1] + 1}
          />
        </group>
      </group>
    </group>
  );
}
