import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MODES, strafePosition } from '../../game/modes';

const POP_IN_SECONDS = 0.12;
// Pop-in targets shrink over the last part of their life, which also shrinks their hitbox.
const SHRINK_FROM = 0.6;

function TargetMesh({ meshRef, target, position, radius }) {
  return (
    <mesh ref={meshRef} position={position} userData={{ targetKey: target.key }}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshStandardMaterial color="#ff4655" emissive="#ff4655" emissiveIntensity={0.25} roughness={0.35} />
    </mesh>
  );
}

function StrafeTarget({ target, radius }) {
  const meshRef = useRef(null);
  const bornAt = useRef(null);

  useFrame(({ clock }) => {
    if (bornAt.current === null) bornAt.current = clock.elapsedTime;
    const [x, y] = strafePosition(target, clock.elapsedTime - bornAt.current);
    meshRef.current.position.set(x, y, 0);
  });

  const [x, y] = strafePosition(target, 0);
  return <TargetMesh meshRef={meshRef} target={target} position={[x, y, 0]} radius={radius} />;
}

function PopinTarget({ target, radius, running, onExpire }) {
  const meshRef = useRef(null);
  const bornAt = useRef(null);
  const lifetime = MODES.popin.lifetimeMs / 1000;

  useEffect(() => {
    if (!running) return undefined;
    const timer = setTimeout(() => onExpire(target.key), MODES.popin.lifetimeMs);
    return () => clearTimeout(timer);
  }, [running, onExpire, target.key]);

  useFrame(({ clock }) => {
    if (bornAt.current === null) bornAt.current = clock.elapsedTime;
    const age = clock.elapsedTime - bornAt.current;
    const grow = Math.min(1, age / POP_IN_SECONDS);
    const life = age / lifetime;
    const shrink = running && life > SHRINK_FROM ? Math.max(0.35, 1 - (life - SHRINK_FROM) / (1 - SHRINK_FROM)) : 1;
    meshRef.current.scale.setScalar(grow * shrink);
  });

  return <TargetMesh meshRef={meshRef} target={target} position={[target.x, target.y, 0]} radius={radius} />;
}

export default function Targets({ mode, targets, running, onExpire, ref }) {
  const { radius } = MODES[mode];
  return (
    <group ref={ref} position={[0, 0, -8]}>
      {targets.map(target => {
        if (mode === 'strafe') return <StrafeTarget key={target.key} target={target} radius={radius} />;
        if (mode === 'popin') {
          return (
            <PopinTarget key={target.key} target={target} radius={radius} running={running} onExpire={onExpire} />
          );
        }
        return <TargetMesh key={target.key} target={target} position={[target.x, target.y, 0]} radius={radius} />;
      })}
    </group>
  );
}
