import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BackSide } from 'three';
import { BOUNCE_BOUNDS, MODES, skeetPosition, strafePosition } from '../../game/modes';
import { beachBallTexture, dotTexture } from './textures';

const POP_IN_SECONDS = 0.12;
// Targets that expire shrink over the last part of their life, which also shrinks their hitbox.
const SHRINK_FROM = 0.6;
// Inverted-hull rim: a slightly larger back-face shell gives every target a crisp silhouette.
const OUTLINE_SCALE = 1.07;
// Clay pigeons face the player, tilted back as if thrown.
const DISC_TILT = Math.PI / 2 - 0.45;

const PATHS = { strafe: strafePosition, skeet: skeetPosition };
const SHRINKS = new Set(['popin', 'survival']);

const noRaycast = () => {};

function TargetMaterial({ style, color, halo }) {
  if (style === 'floatie') {
    return <meshPhysicalMaterial map={beachBallTexture()} roughness={0.25} clearcoat={1} clearcoatRoughness={0.15} />;
  }
  if (style === 'water') {
    return (
      <meshPhysicalMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.25}
        transparent
        opacity={0.82}
        roughness={0.05}
        clearcoat={1}
      />
    );
  }
  if (style === 'pearl') {
    // Soap-bubble iridescence over a pastel base, with a pink sheen at grazing angles.
    return (
      <meshPhysicalMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.2}
        roughness={0.18}
        clearcoat={1}
        iridescence={1}
        iridescenceIOR={1.4}
        iridescenceThicknessRange={[200, 700]}
        sheen={1}
        sheenColor="#ffc4e6"
        sheenRoughness={0.4}
      />
    );
  }
  if (style === 'neon') {
    // Dark glass core; the glow comes from the tube rings and the rim shell.
    return <meshStandardMaterial color="#0b0618" emissive={color} emissiveIntensity={0.12} metalness={0.6} roughness={0.25} />;
  }
  return <meshStandardMaterial color={color} emissive={color} emissiveIntensity={halo ? 0.6 : 0.25} roughness={0.35} />;
}

// Neon tubes: an outer ring in the target colour and a thinner magenta inner ring, pulsing gently.
function NeonRings({ radius, color }) {
  const rings = useRef(null);
  useFrame(({ clock }) => {
    rings.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.04);
  });
  return (
    <group ref={rings}>
      {/* Pushed towards the camera so the tubes sit on the orb's face instead of inside it. */}
      <mesh position={[0, 0, radius * 0.3]} raycast={noRaycast}>
        <torusGeometry args={[radius * 0.98, radius * 0.08, 12, 48]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, radius * 0.9]} raycast={noRaycast}>
        <torusGeometry args={[radius * 0.5, radius * 0.05, 8, 40]} />
        <meshBasicMaterial color="#ff2bd6" toneMapped={false} />
      </mesh>
    </group>
  );
}

function Shape({ disc, radius, segments = 32 }) {
  return disc ? (
    <cylinderGeometry args={[radius, radius, radius * 0.32, segments]} />
  ) : (
    <sphereGeometry args={[radius, segments, segments]} />
  );
}

// Every target scales in on spawn. Optional: `lifetime` (seconds) shrinks it before it expires,
// `path` moves it along a closed-form path, `bounce` integrates a bouncing ball.
function Target({ target, radius, color, outline, style, halo, haloColor, disc, lifetime, path, bounce }) {
  const meshRef = useRef(null);
  const bornAt = useRef(null);
  const motion = useRef(bounce ? { x: target.x, y: target.y, vx: target.vx, vy: 0 } : null);
  const start = path ? path(target, 0) : [target.x, target.y];

  useFrame(({ clock }, delta) => {
    if (bornAt.current === null) bornAt.current = clock.elapsedTime;
    const age = clock.elapsedTime - bornAt.current;
    const mesh = meshRef.current;

    let scale = Math.min(1, age / POP_IN_SECONDS);
    if (lifetime) {
      const life = age / lifetime;
      if (life > SHRINK_FROM) scale *= Math.max(0.35, 1 - (life - SHRINK_FROM) / (1 - SHRINK_FROM));
    }
    if (style === 'water') {
      const t = clock.elapsedTime * 3 + target.key;
      mesh.scale.set(scale * (1 + Math.sin(t) * 0.05), scale * (1 + Math.sin(t + 2.1) * 0.05), scale * (1 + Math.sin(t + 4.2) * 0.05));
    } else {
      mesh.scale.setScalar(scale);
    }

    if (disc) mesh.rotation.y += delta * 6;
    else if (style === 'floatie') mesh.rotation.y += delta * 0.8;

    if (path) {
      const [x, y] = path(target, age);
      mesh.position.set(x, y, 0);
    } else if (style === 'pearl' && !motion.current) {
      // Pearls drift up and down a touch, as if floating.
      mesh.position.y = start[1] + Math.sin(clock.elapsedTime * 1.6 + target.key) * 0.08;
    }
    if (motion.current) {
      const m = motion.current;
      const { minX, maxX, minY, maxY, gravity } = BOUNCE_BOUNDS;
      const step = Math.min(delta, 0.05);
      m.vy -= gravity * step;
      m.x += m.vx * step;
      m.y += m.vy * step;
      if (m.x < minX || m.x > maxX) {
        m.vx = -m.vx;
        m.x = Math.min(maxX, Math.max(minX, m.x));
      }
      if (m.y < minY) {
        m.y = minY;
        m.vy = target.bounceSpeed;
      }
      if (m.y > maxY) {
        m.y = maxY;
        m.vy = -Math.abs(m.vy);
      }
      mesh.position.set(m.x, m.y, 0);
    }
  });

  return (
    <group ref={meshRef} position={[start[0], start[1], 0]} scale={0}>
      <group rotation={disc ? [DISC_TILT, 0, 0] : [0, 0, 0]}>
        <mesh userData={{ targetKey: target.key }}>
          <Shape disc={disc} radius={radius} />
          <TargetMaterial style={style} color={color} halo={halo} />
        </mesh>
        {outline && (
          <mesh scale={OUTLINE_SCALE} raycast={noRaycast}>
            <Shape disc={disc} radius={radius} segments={24} />
            <meshBasicMaterial color={outline} side={BackSide} toneMapped={false} />
          </mesh>
        )}
      </group>
      {style === 'neon' && <NeonRings radius={radius} color={color} />}
      {halo && (
        <sprite scale={radius * 3.4} raycast={noRaycast}>
          <spriteMaterial map={dotTexture()} color={haloColor ?? color} blending={AdditiveBlending} transparent depthWrite={false} opacity={0.55} />
        </sprite>
      )}
    </group>
  );
}

function ExpiryTimer({ targetKey, lifetimeMs, running, onExpire }) {
  useEffect(() => {
    if (!running) return undefined;
    const timer = setTimeout(() => onExpire(targetKey), lifetimeMs);
    return () => clearTimeout(timer);
  }, [running, onExpire, targetKey, lifetimeMs]);
  return null;
}

export default function Targets({ mode, targets, running, onExpire, color, outline, style, halo, haloColor, ref }) {
  const config = MODES[mode];
  const lifetimeOf = target => target.lifetimeMs ?? config.lifetimeMs ?? null;

  return (
    <group ref={ref} position={[0, 0, -8]}>
      {targets.map(target => {
        const lifetimeMs = lifetimeOf(target);
        return (
          <Target
            key={target.key}
            target={target}
            radius={config.radius}
            color={color}
            outline={outline}
            style={style}
            halo={halo}
            haloColor={haloColor}
            disc={config.shape === 'disc'}
            lifetime={running && lifetimeMs && SHRINKS.has(mode) ? lifetimeMs / 1000 : null}
            path={PATHS[mode] ?? null}
            bounce={mode === 'bounce'}
          />
        );
      })}
      {targets.map(target => {
        const lifetimeMs = lifetimeOf(target);
        return lifetimeMs ? (
          <ExpiryTimer
            key={`timer-${target.key}`}
            targetKey={target.key}
            lifetimeMs={lifetimeMs}
            running={running}
            onExpire={onExpire}
          />
        ) : null;
      })}
    </group>
  );
}
